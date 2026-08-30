# Ramp Team Rules — Applied to Every Bob Session

These rules apply to all three Bob instances working on this project (Dev 1, Dev 2, Dev 3).
They are automatically injected into every conversation in every mode.

---

## Rule 1 — Pull and read BOB_COMMS.md before doing anything

At the start of every session, before responding to any task or question, propose the following command to fetch the latest `BOB_COMMS.md` from the shared `Development` branch:

```bash
git fetch origin && git checkout Development -- BOB_COMMS.md
```

This pulls only `BOB_COMMS.md` — it does not touch any other files or merge any code. Once the pull is done, read the file in full.

- Read every entry not previously seen in this conversation.
- Identify any entry that affects your current track and acknowledge it to the developer.
- If an entry requires an action on your track (a contract change, a schema update, a blocker), flag it immediately before proceeding with the original task.
- Do not skip this step even if the task seems unrelated to other tracks.

## Rule 2 — Write to BOB_COMMS.md when you make a cross-track decision, then push immediately

Any time you make a decision, discovery, or change that could affect another track, append a new entry to the TOP of the communication log section in `BOB_COMMS.md` before ending the session.

This includes:
- Any change to an endpoint shape (request body, response shape, field names, status codes)
- Any change to the manifest schema or fixture file
- Any workaround or deviation from the original plan documents
- Any blocker that another track needs to know about
- Any contract, naming convention, or assumption you locked that another track will build against

Use the entry format defined at the top of `BOB_COMMS.md`. Tag entries accurately — only notify the tracks that are actually affected.

**Immediately after writing the entry, push `BOB_COMMS.md` directly to the `Development` branch** — not to your personal branch. This keeps comms as shared team infrastructure separate from each dev's code changes. Propose these commands as the very next action after writing the entry. Do not wait for the developer to ask:

```bash
git add BOB_COMMS.md
git commit -m "comms: <one-line summary of the entry just written>"
git push origin HEAD:Development
```

After the push succeeds, tell the developer exactly what to say to the team — provide this message for them to copy and send in the team chat immediately:

> "BOB_COMMS.md updated on Development — pull now before your next session:
> git fetch origin && git checkout Development -- BOB_COMMS.md"

The other devs run that command on their personal branch. It pulls only `BOB_COMMS.md` from `Development` — it does not merge any other code, so there is zero risk of conflicts with their work.

If the developer declines to run the commands, display them prominently and remind them that the other Bobs will be working with stale information until the push happens.

## Rule 3 — Never change the manifest schema unilaterally

The `ramp-manifest.json` schema is a shared contract between all three tracks. Do not change it without:
1. Writing an entry in `BOB_COMMS.md` tagged to All
2. Confirming the other two tracks have acknowledged the change before implementing it

## Rule 4 — Never commit credentials

No API key, IAM token, Cloudant connection string, or any secret may appear in any committed file. Credentials live in environment variables only. If you are about to write a file that contains a credential, stop and use an environment variable reference instead.

## Rule 5 — Screenshot Bob task sessions immediately

After every Bob task session completes, remind the developer to take a screenshot of the task session summary and save it to `bob_sessions/` using the naming convention `teamname_devN_taskNN_description.png`. Do not wait until the end of the hackathon — Bob access ends September 1.
