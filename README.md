# GameVault

GameVault is a Vietnamese-first directory for browser games. Contributors can submit a single HTML game or an external URL. Submissions are stored privately, scanned without executing the HTML, and kept pending until an administrator reviews them. Publishing is a separate, explicit action.

## Current implementation

- Published catalogue loaded from Supabase. Only records with status \`published\` are listed.
- File upload: \`.html\` / \`.htm\`, maximum 1 MB, placed in the private \`gamevault-quarantine\` bucket.
- URL submission: validates URL structure and rejects credentials and literal private/local hosts. **It does not fetch or execute the URL.**
- Static pattern scanner: records findings and a risk-priority signal. It is not a malware detector, legal opinion, or proof that a submission follows GitHub policy.
- Persistent submissions, metadata, status changes, review notes, and audit events stored in Supabase.
- Rate limit: up to 6 submission attempts per IP fingerprint per hour. The address itself is not stored; a keyed HMAC is used for the fingerprint.
- Owner console at \`/admin\`: sign in through Supabase Auth; server verifies the account and checks the \`GAMEVAULT_ADMIN_EMAILS\` allowlist.
- Separate actions: **Approve** only marks the submission as approved; **Publish to GitHub** then requests explicit confirmation and writes to the configured repository/branch.
- HTML source is never executed in the admin console. Playable HTML is served through a sandboxed iframe with a restrictive CSP. External network requests, form submissions, embedded frames, and remote assets are blocked in the sandbox.
- Vietnamese and English UI; persistent local preferences for theme, text size, and reduced motion.

The three demo cards were removed from the public catalogue. An empty catalogue is intentional until the owner approves and publishes real games.

## Required deployment configuration

Configure these environment variables in **Vercel → Project → Settings → Environment Variables**. Never commit real values or paste server secrets into chat.

| Variable | Used for | Public? |
|---|---|---|
| \`NEXT_PUBLIC_SUPABASE_URL\` | Supabase project URL | Yes |
| \`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\` | Browser Auth client | Yes |
| \`SUPABASE_SECRET_KEY\` | Server-only DB and private Storage access | **No** |
| \`GAMEVAULT_ADMIN_EMAILS\` | Comma-separated allowlist of administrator emails | No |
| \`GITHUB_TOKEN\` | Fine-grained GitHub token with Contents read/write on the target repository | **No** |
| \`GITHUB_PUBLISH_REPO\` | Publication destination; defaults to \`slgamervn/aaa\` | No |
| \`GITHUB_PUBLISH_BRANCH\` | Publication branch; defaults to \`main\` | No |

\`SUPABASE_SECRET_KEY\` should be a Supabase \`sb_secret_...\` key and must never use a \`NEXT_PUBLIC_\` prefix. The administrator email must also be created as a user in Supabase Auth. The app has no public self-registration.

For GitHub publishing, create a fine-grained token limited to the selected repository and the minimum **Contents: Read and write** permission needed by the GitHub Contents API. Keep it only in Vercel's encrypted environment variables. This token can write public repository content.

After changing Vercel environment variables, trigger a new deployment so the application receives the new configuration. The site may load its public shell without all server-only variables, but submission, catalogue, review, and publishing endpoints report configuration errors rather than silently simulating success.

## Database and migrations

Supabase project: \`jrusnyrmufwhnqwpqssc\`.

Migration files are stored in \`supabase/migrations/\`. They define:

- \`gamevault_submissions\`: submission metadata, scanner results, lifecycle state, and publish commit details.
- \`gamevault_submission_events\`: review and publication audit history.
- \`gamevault_rate_limits\`: short-lived HMAC fingerprints and submission counters.
- \`gamevault-quarantine\`: private Storage bucket, limited to HTML and 1 MB per object.

All application tables have RLS enabled, explicit access revocation for \`anon\` and \`authenticated\`, and explicit server-only \`service_role\` grants. Review-transition and rate-limit RPC functions are executable only by \`service_role\`. Run the Supabase Security Advisor after schema changes.

## Local development

Requirements: Node.js 22+ and npm.

\`\`\`bash
npm install
cp .env.example .env.local
npm run dev
\`\`\`

Open http://localhost:3000.

\`npm run build\` performs a production build and TypeScript checks. \`npm run lint\` runs ESLint.

## Publication flow

1. Contributor confirms that they have the right to share the content.
2. Server validates the request, applies the rate limit, performs a static scan, writes metadata to Supabase, and stores HTML in the private quarantine bucket.
3. Administrator opens \`/admin\`, inspects scan findings and reads source as plain text. Nothing runs in the review UI.
4. Administrator selects **Approve** or **Reject**. Rejection requires a reason and is audited.
5. An approved submission is **not public yet**. The administrator must separately select **Publish to GitHub** and confirm.
6. The server verifies the current database status again, writes the item to \`gamevault-submissions/<uuid>/\` in the configured GitHub repository, and records the commit SHA and publication event.

External URL submissions remain references: GameVault does not crawl them or copy their content. The browser opens a published external URL directly in a new tab with \`noopener noreferrer\`.

## Security boundaries and limitations

- Static matching can miss harmful behavior and generate false positives; it does not establish copyright ownership or GitHub policy compliance.
- Human review must check licence, copyright, privacy, content, and the current GitHub policies. Approval is a human judgement, not a guarantee.
- HTML playback uses an opaque sandbox origin and a restrictive CSP. This reduces risk but is not a substitute for reviewing submitted content; self-contained games that require remote assets or network APIs may not work.
- Publication writes public repository contents. The publish confirmation is intentional and must not be bypassed or invoked automatically.
- External URLs are never fetched server-side, avoiding SSRF, redirects, and DNS-rebinding exposure in this workflow.
- Submissions and audit records remain in the server database until an administrator or a future retention policy removes them. Rate-limit fingerprints older than seven days are cleaned opportunistically when a rate-limit check runs.
- The catalogue starts empty. Do not seed the public list with fictitious games.

## GitHub policy references

- [GitHub Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)
- [GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies)
- [GitHub Active Malware or Exploits](https://docs.github.com/en/site-policy/acceptable-use-policies/github-active-malware-or-exploits)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

This repository does not automatically certify compliance with those policies. Each public submission must be reviewed first.
