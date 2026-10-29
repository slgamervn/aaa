# GameVault

GameVault is a Vietnamese-first game discovery and submission portal scaffold for Vercel. It accepts HTML files for bounded static pattern checks or external HTTP(S) URLs for syntax-only checks. It never executes uploaded HTML or fetches arbitrary user URLs.

## Current status

This repository contains the first deployable UI/API scaffold. The library cards are explicitly demo content. The current submission queue is stored in the current browser's localStorage only; it is not a shared database, and it is not a secure owner approval system. No game is uploaded to GitHub automatically.

**Do not use this prototype as a public submission service yet.** Before opening submissions publicly, implement and configure:
- Supabase Auth with server-verified owner authorization.
- A persistent database with row-level security and an explicit state machine.
- Private quarantine storage, upload size/type limits, rate limits, and retention rules.
- Server-side scanning and policy evidence; never treat static pattern checks as malware detection or legal approval.
- A dedicated owner-only review dashboard.
- An approval gate that is revalidated immediately before publishing to a dedicated GitHub branch or pull request.
- Isolated preview hosting on a separate origin with restrictive CSP; never render untrusted HTML on the main app origin.
- Tests for SSRF, DNS rebinding, redirects, file-size limits, XSS, authz, and upload race conditions.

## Local development

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Production build

```bash
npm run build
npm run start
```

## Deploy to Vercel

Import `slgamervn/aaa` in Vercel and keep the project root at `/`. Vercel can build and deploy each push through Git integration. This app does not require environment variables for the UI prototype.

`.env.example` lists placeholders for the future Supabase integration. Never commit real credentials. Do not use the existing unrelated Supabase project without explicit project-level setup and access review.

## Scanner limitations

The static scanner looks for a small set of JavaScript patterns and produces review hints only. It can miss malicious behavior and flag harmless code. URL mode only validates URL syntax and does not fetch the target, intentionally avoiding SSRF and redirect abuse. It does not certify GitHub policy compliance, copyright ownership, or malware absence.

Before publishing any submitted material, review the current [GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies), [GitHub Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service), and [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

## Stack

- Next.js App Router
- TypeScript
- Custom responsive CSS
- Vercel deployment target
