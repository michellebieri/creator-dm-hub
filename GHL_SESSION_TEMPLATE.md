# GHL Session Kickoff Template

Copy this template, fill in the four `<<...>>` placeholders, paste into a fresh session. The identity check is non-negotiable — Claude MUST run it before doing any other work.

---

## TEMPLATE (copy from here):

```
GHL SESSION KICKOFF — IDENTITY CHECK FIRST.

Sub-account name: <<e.g. Bieri Sisters Coaching>>
Expected locationId: <<e.g. uYbldNS9ZXYH3jDlCUwT>>
API key: <<pit-...>>
Expected country / timezone: <<e.g. Switzerland / Europe/Zurich>>

═══════════════════════════════════════════════════
STEP 0 — IDENTITY CHECK (mandatory, run BEFORE any other action):
═══════════════════════════════════════════════════

Call the GoHighLevel locations endpoint:
  GET /locations/{expected_locationId}
  Authorization: Bearer <API key>

Verify the response shows ALL THREE:
  1. locationId in response matches expected locationId (character-by-character — copy/paste compare, don't eyeball)
  2. location.name contains the expected sub-account name
  3. location.country and location.timezone match expected

DECISION RULE:
- If all 3 pass → proceed to the task section below
- If ANY fail → STOP immediately. Do NOT call any other endpoint. Report:
    a. What the API actually returned (locationId, name, country, timezone)
    b. What was expected
    c. Likely cause: the API key was generated in a different sub-account
  Then tell me to fix the key before retrying. Do not propose workarounds.

═══════════════════════════════════════════════════
TASK (only run if Step 0 passed):
═══════════════════════════════════════════════════

<<Describe what you actually want done in this sub-account.

Example for BSC:
- Build opt-in form in GHL → Sites → Forms with fields: first name + email
- Create automation workflow: Form Submit trigger → 5 nurture emails at days 0/2/4/6/9
- Use existing template IDs from BSC_Verifikations_Briefing.docx in the coaching folder
- Build funnel pages (HTML files in the coaching folder): Opt-in + Thank-you
- Upload guide PDF → put URL in thank-you page

Constraints:
- Use only template IDs that already exist in this sub-account (do NOT create new templates)
- No test sends to real contacts — use a test contact (yours) for any verification
- After each major step, screenshot or report what was created for me to verify
- If any endpoint returns 401/403, STOP and report which scope is missing
>>
```

---

## How to use this template

**Every single time** you start a GHL session for a sub-account:

1. Open this file
2. Copy the entire `TEMPLATE` block above
3. Fill in the four `<<...>>` placeholders for the sub-account you're working in today
4. Paste into a fresh Cowork or Claude session

**Never** start a GHL session by just saying "work on BSC" without the identity check. Even if you think the key is right. Especially if you think the key is right.

---

## Maintenance — your one-time setup tasks

Do these once, then they protect you forever:

### 1. Rename your GHL API keys today
Go to each GHL sub-account → Settings → Integrations → API Keys.
Rename every Private Integration key to something self-describing:
- `BSC-Cowork-2026-05` (Bieri Sisters Coaching, used by Cowork, generated May 2026)
- `NCA-Cowork-2026-05` (Next Chapter AI, used by Cowork, generated May 2026)
- `BSC-Zapier-prod` (if Zapier uses a separate key, etc.)

If you ever see a key named just `pit-2679a996-...` in your password manager, you know it's unlabeled and risky — fix it before using it.

### 2. Build a single source of truth
Create `/Users/michellebieri/Desktop/Coding/Coaching/GHL_ACCOUNTS.md` (or wherever your coaching files live) with this structure:

```
# GHL Accounts — Source of Truth

## Bieri Sisters Coaching (BSC)
- Sub-account name in GHL: Bieri Sisters Coaching
- locationId: uYbldNS9ZXYH3jDlCUwT
- Country / timezone: Switzerland / Europe/Zurich
- Active API key name in GHL: BSC-Cowork-2026-05
- API key (or pointer to 1Password / vault entry): <store here or link>
- Scopes granted: Contacts, Emails, Workflows, Forms, Funnels
- Last verified working: 2026-05-XX
- Notes: Calendly link team-shy/strategie-telefonat is hardcoded in 17 email templates

## Next Chapter AI (NCA)
- Sub-account name in GHL: <fill in>
- locationId: VpQKTB76iMND3XxrPCw4
- Country / timezone: UAE / Asia/Dubai
- Active API key name in GHL: NCA-Cowork-2026-05
- API key: <store here>
- Scopes granted: <list>
- Last verified working: <date>
- Notes: <UAE-based clients, +971 numbers>
```

Then every kickoff prompt copies the locationId and key from THIS file, not from memory.

### 3. Always generate keys from inside the sub-account, never from Agency view
When you need a new key:
- GHL → Agency dropdown → click into the specific sub-account
- Check the top-left header confirms you're inside that sub-account (not Agency)
- Then Settings → Integrations → API Keys → Add Key
- Name it immediately with the convention `<SubAccountAbbreviation>-<Purpose>-<YearMonth>`

### 4. When a key gets generated, paste the locationId at the same time
The biggest mistake: generating a key in GHL, copying just the key, and assuming you'll remember which sub-account it was. You won't. Always copy both the key AND the locationId AND the sub-account name together into your GHL_ACCOUNTS.md.

---

## What to do if the identity check fails

1. Don't panic — Claude caught it. That's what the protocol is for.
2. Don't ask Claude to "try harder" or "use a workaround". The key is wrong. There is no workaround.
3. Go to GHL, log into the correct sub-account, generate a new Private Integration key with the right scopes.
4. Update `GHL_ACCOUNTS.md` with the new key.
5. Start a new session with the template + the new key.

This will take you ~5 minutes. Compare to the days of cleanup if Claude had created workflows in the wrong sub-account, sent automated emails to wrong contacts, or wired the wrong Calendly link into the wrong business.
