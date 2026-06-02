This is a big scope (8 themes). I'll deliver it in slices so each ships working end-to-end instead of half-built everywhere. Below is the roadmap, plus a concrete proposal for **Slice 1** to start now.

## Roadmap

**Slice 1 — Public REST API + API Keys (now)**
- `api_keys` table (hashed key, label, user_id, last_used_at, revoked_at). RLS: users manage own; service role validates.
- Settings page `/settings/api-keys`: create / copy-once / revoke keys.
- Public endpoints under `src/routes/api/public/v1/`:
  - `GET /api/public/v1/prompts` — list public prompts (filters: `category`, `tag`, `difficulty`, `q`, `limit`, `cursor`).
  - `GET /api/public/v1/prompts/:id` — single prompt with sample I/O.
  - `POST /api/public/v1/prompts/:id/render` — fill placeholders, return rendered text.
- Auth: `Authorization: Bearer lvp_…` validated server-side via SHA-256 lookup. Rate-limited per key (simple per-minute counter in `api_key_usage`).
- Track usage to `analytics_events` (`api.call`).

**Slice 2 — Interactive Playground**
- `/playground/:id` route: placeholder form on left, live "Run" on right via Lovable AI Gateway (`google/gemini-2.5-flash`).
- Reuses existing `sendChat` pattern; new `runPrompt` server fn.
- "Open in playground" CTA on every prompt card.

**Slice 3 — Versioning & Changelog**
- We already snapshot `prompt_versions`. Add `semver` column (`major.minor.patch`) and `stability` (`experimental | stable | deprecated`).
- Show badge on cards + a `/changelog` route grouped by week.

**Slice 4 — CLI / SDK**
- Publishable npm package `prompt-companion` (TypeScript) hitting the public API. Commands: `login`, `list`, `get <id>`, `run <id> --var KEY=VAL`.
- README install + quick-start. (Lives in a sibling repo; we ship the spec + a `/docs/cli` page here.)

**Slice 5 — Integration Examples + Contribution**
- `/docs` routes: GitHub Actions snippet, Docker one-liner, IDE prompt snippet.
- `CONTRIBUTING.md` + `.github/ISSUE_TEMPLATE/new-prompt.yml` + `PULL_REQUEST_TEMPLATE.md` + a GH Action that lints submitted prompt YAML.
- In-app "Contribute Prompt" form posts to public-pending queue for admin review.

**Slice 6 — Roles polish + Ops readiness**
- Roles already exist (`admin`/`editor`/`member`). Add `contributor` and a Contributors admin page.
- Add Sentry (browser + server fn middleware) behind `SENTRY_DSN` secret; `/api/public/v1/health` endpoint for uptime monitors.

## Slice 1 — files to add/change

```text
supabase/migrations/<ts>_api_keys.sql      # api_keys, api_key_usage, RPC verify_api_key
src/lib/api-keys.functions.ts              # create / list / revoke (auth'd)
src/routes/settings.api-keys.tsx           # UI
src/routes/api/public/v1/prompts.ts        # list
src/routes/api/public/v1/prompts.$id.ts    # detail
src/routes/api/public/v1/prompts.$id.render.ts  # render with vars
src/lib/api-auth.server.ts                 # bearer-token verification + rate limit
```

Security:
- Key shown to user **once** at creation; only SHA-256 hash stored.
- All public endpoints validate signature, scope to `is_public=true` prompts, reject without a valid key.
- Per-key limit (e.g. 60 req/min) returns `429`.
- Never returns PII (`user_id` omitted from payloads).

## What I need from you

Pick one:
1. **Ship Slice 1 now** (REST API + keys + settings UI). ~2 migrations + ~6 files. Biggest unlock for the rest of the roadmap.
2. **Ship Slice 2 first** (Playground) — flashier, no auth surface to design.
3. **Ship Slices 1 + 2 together** in one go (larger change, longer turn).

Default if you just say "go": option **1**.