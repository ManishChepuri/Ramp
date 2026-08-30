'use strict';

const DEFAULT_MODEL_ID = 'ibm/granite-4-h-small';
const DEFAULT_URL = 'https://us-south.ml.cloud.ibm.com';
const DEFAULT_TIMEOUT_MS = 120000;
const IAM_URL = 'https://iam.cloud.ibm.com/identity/token';
const TOKEN_TTL_MS = 55 * 60 * 1000;

const INPUT_USD_PER_1K = 0.0000636;
const OUTPUT_USD_PER_1K = 0.000265;

class WatsonxClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.WATSONX_API_KEY;
    this.projectId = options.projectId || process.env.WATSONX_PROJECT_ID;
    this.baseUrl = (options.baseUrl || process.env.WATSONX_URL || DEFAULT_URL).replace(/\/$/, '');
    this.modelId = options.modelId || process.env.WATSONX_MODEL_ID || DEFAULT_MODEL_ID;
    this.fetch = options.fetchImpl || globalThis.fetch;
    this.timeoutMs = Number(options.timeoutMs || process.env.WATSONX_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
    this.maxRetries = Number(options.maxRetries ?? process.env.WATSONX_MAX_RETRIES ?? 2);
    this.cachedToken = null;
    this.tokenExpiresAt = 0;
    this.usage = { inputTokens: 0, outputTokens: 0, requests: 0 };

    if (typeof this.fetch !== 'function') throw new Error('A fetch implementation is required');
    if (!this.apiKey) throw new Error('WATSONX_API_KEY is required');
    if (!this.projectId) throw new Error('WATSONX_PROJECT_ID is required');
  }

  async getIAMToken() {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) return this.cachedToken;

    const response = await this.fetchWithTimeout(IAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(this.apiKey)}`,
    });
    if (!response.ok) {
      throw httpError(
        `watsonx IAM authentication failed (${response.status}): ${await safeResponseText(response)}`,
        response.status,
      );
    }

    const data = await response.json();
    if (!data.access_token) throw new Error('watsonx IAM response did not include an access token');
    this.cachedToken = data.access_token;
    this.tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
    return this.cachedToken;
  }

  async chat(messages, options = {}) {
    const token = await this.getIAMToken();
    const endpoint = `${this.baseUrl}/ml/v1/text/chat?version=2023-05-29`;
    const response = await this.fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model_id: this.modelId,
        project_id: this.projectId,
        messages,
        max_tokens: options.maxTokens || 6000,
        temperature: options.temperature ?? 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw httpError(
        `watsonx inference failed (${response.status}): ${await safeResponseText(response)}`,
        response.status,
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('watsonx returned an empty completion');
    }

    const usage = normalizeUsage(data.usage, messages, content);
    this.usage.inputTokens += usage.inputTokens;
    this.usage.outputTokens += usage.outputTokens;
    this.usage.requests += 1;
    return { content: content.trim(), usage };
  }

  async chatJson(messages, options = {}) {
    let lastError;
    let retryMessages = messages;
    const attempts = options.maxRetries ?? this.maxRetries;
    let attemptsMade = 0;

    for (let attempt = 0; attempt <= attempts; attempt += 1) {
      attemptsMade += 1;
      let invalidContent;
      try {
        const result = await this.chat(retryMessages, options);
        invalidContent = result.content;
        const parsed = parseJsonResponse(result.content);
        const normalized = options.normalize ? options.normalize(parsed) : parsed;
        if (options.validate) options.validate(normalized);
        return normalized;
      } catch (error) {
        lastError = error;
        if (error.nonRetryable || attempt === attempts) break;
        retryMessages = [
          ...messages,
          ...(invalidContent ? [{ role: 'assistant', content: invalidContent }] : []),
          {
            role: 'user',
            content: `Your previous response was invalid: ${error.message}. Return only corrected JSON matching the requested contract.`,
          },
        ];
      }
    }
    throw new Error(`watsonx JSON generation failed after ${attemptsMade} attempt(s): ${lastError.message}`);
  }

  getUsageSummary() {
    const inputCost = (this.usage.inputTokens / 1000) * INPUT_USD_PER_1K;
    const outputCost = (this.usage.outputTokens / 1000) * OUTPUT_USD_PER_1K;
    return {
      ...this.usage,
      modelId: this.modelId,
      estimatedCostUsd: this.modelId === DEFAULT_MODEL_ID ? inputCost + outputCost : null,
    };
  }

  async fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error.name === 'AbortError') throw new Error(`watsonx request timed out after ${this.timeoutMs}ms`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

function httpError(message, status) {
  const error = new Error(message);
  error.nonRetryable = status >= 400 && status < 500 && ![408, 409, 429].includes(status);
  return error;
}

function parseJsonResponse(raw) {
  const trimmed = raw.trim();
  const cleaned = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`response is not valid JSON: ${error.message}`);
  }
}

function normalizeUsage(usage, messages, content) {
  const inputTokens = Number(usage?.prompt_tokens ?? usage?.input_tokens) ||
    estimateTokens(messages.map(message => message.content).join('\n'));
  const outputTokens = Number(usage?.completion_tokens ?? usage?.output_tokens) || estimateTokens(content);
  return { inputTokens, outputTokens };
}

function estimateTokens(text) {
  return Math.max(1, Math.ceil(String(text).length / 4));
}

async function safeResponseText(response) {
  try {
    return (await response.text()).slice(0, 500);
  } catch (_) {
    return 'response body unavailable';
  }
}

module.exports = {
  DEFAULT_MODEL_ID,
  WatsonxClient,
  estimateTokens,
  parseJsonResponse,
};
