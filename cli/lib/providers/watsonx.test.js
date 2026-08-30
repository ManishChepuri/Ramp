'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { WatsonxClient, estimateTokens, parseJsonResponse } = require('./watsonx');

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

test('authenticates once and sends the documented watsonx chat request shape', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.includes('/identity/token')) return response({ access_token: 'iam-token' });
    return response({
      choices: [{ message: { content: '{"ok":true}' } }],
      usage: { prompt_tokens: 20, completion_tokens: 5 },
    });
  };
  const client = new WatsonxClient({
    apiKey: 'test-key', projectId: 'test-project', fetchImpl, baseUrl: 'https://example.ibm.com',
  });

  await client.chatJson([{ role: 'user', content: 'Return JSON' }], { maxTokens: 123 });
  await client.chatJson([{ role: 'user', content: 'Return JSON again' }]);

  assert.equal(calls.filter(call => call.url.includes('/identity/token')).length, 1);
  const body = JSON.parse(calls[1].options.body);
  assert.equal(body.project_id, 'test-project');
  assert.equal(body.max_tokens, 123);
  assert.equal(body.temperature, 0.1);
  assert.deepEqual(body.response_format, { type: 'json_object' });
  assert(!('parameters' in body));
  assert.equal(calls[1].options.headers.Authorization, 'Bearer iam-token');
  assert.deepEqual(client.getUsageSummary().requests, 2);
});

test('retries invalid model JSON and validates the corrected response', async () => {
  let chatCalls = 0;
  const requestBodies = [];
  const fetchImpl = async (url, options) => {
    if (url.includes('/identity/token')) return response({ access_token: 'iam-token' });
    chatCalls += 1;
    requestBodies.push(JSON.parse(options.body));
    return response({
      choices: [{ message: { content: chatCalls === 1 ? 'not json' : '```json\n{"value":2}\n```' } }],
    });
  };
  const client = new WatsonxClient({ apiKey: 'key', projectId: 'project', fetchImpl, maxRetries: 1 });
  const value = await client.chatJson([{ role: 'user', content: 'JSON' }], {
    validate: result => assert.equal(result.value, 2),
  });
  assert.deepEqual(value, { value: 2 });
  assert.equal(chatCalls, 2);
  assert.deepEqual(requestBodies[1].messages.at(-2), { role: 'assistant', content: 'not json' });
  assert.match(requestBodies[1].messages.at(-1).content, /previous response was invalid/);
});

test('does not retry a rejected IAM credential', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return response({ errorCode: 'BXNIM0415E' }, 400);
  };
  const client = new WatsonxClient({ apiKey: 'bad-key', projectId: 'project', fetchImpl });
  await assert.rejects(
    client.chatJson([{ role: 'user', content: 'JSON' }]),
    /after 1 attempt\(s\).*IAM authentication failed/,
  );
  assert.equal(calls, 1);
});

test('parses fenced JSON and estimates non-zero token counts', () => {
  assert.deepEqual(parseJsonResponse('```json\n{"a":1}\n```'), { a: 1 });
  assert.equal(estimateTokens('abcd'), 1);
  assert.throws(() => parseJsonResponse('nope'), /not valid JSON/);
});

test('normalizes a parsed response before validating and returning it', async () => {
  const fetchImpl = async url => {
    if (url.includes('/identity/token')) return response({ access_token: 'iam-token' });
    return response({ choices: [{ message: { content: '{"items":[1,2]}' } }] });
  };
  const client = new WatsonxClient({ apiKey: 'key', projectId: 'project', fetchImpl });
  const result = await client.chatJson([{ role: 'user', content: 'JSON' }], {
    normalize: value => value.items,
    validate: value => assert.equal(value.length, 2),
  });
  assert.deepEqual(result, [1, 2]);
});
