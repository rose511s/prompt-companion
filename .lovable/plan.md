# Plan: Homepage, UX polish & Phase 1 (Stability)

This is a large scope — I'll break it into 3 phases so you can review/approve. Phase 1 ships first per your request.

---

## Part A — UX additions

### A1. Public homepage at `/`
- Currently `/` redirects into the app. Replace `src/routes/index.tsx` with a public landing page (Editorial Drop style):
  - Hero ("Prompt Directory — Gold-standard AI prompts for Dev & DevOps")
  - 3-up "How it works" (Browse → Copy → Ship)
  - Featured beginner prompts (4 cards, public)
  - Categories strip
  - CTA: "Open Library" / "Sign in"
- Full SEO `head()` with og tags.

### A2. Sidebar (already exists in `AppShell`)
- Keep current sidebar, but add **collapse toggle** + group nav into sections: *Browse* (Library, Favorites, Categories), *Create* (New Prompt), *Help* (README, Chat).
- Highlight active route (already done) + add small category sub-list.

### A3. Beginner-friendly prompts (10 new)
- Add a new category `beginner` + insert ~10 plain-language prompts ("Explain this error", "Write my first commit message", "Refactor this for readability", etc.) — `is_public=true`.
- Add an "🟢 Beginner" filter chip on the library page.

### A4. Loading & error states
- Add Suspense skeletons to `/library`, `/favorites`, `/prompt/$id` (shimmer cards).
- Wrap route `errorComponent` with a friendly retry UI (already partly present in `__root.tsx`, extend per-route).
- Toasts on all mutations (create/update/delete/favorite).

### A5. Persist chat history
- New table `chat_messages (id, user_id, role, content, created_at)` with RLS (user owns own rows).
- Update `HelpChat` to load last 50 messages on open, append + persist new messages.
- "Clear conversation" button.

### A6. Prompt editor (rich)
- Upgrade `/new` and add `/prompt/$id/edit`:
  - Monaco-like textarea with framework template inserter (CO-STAR / Few-Shot / CoT scaffolds as buttons).
  - Live token/char count, tag chips input, category select, public toggle.
  - Side-by-side preview pane.

---

## Part B — **Phase 1: Stability** (ship first)

### B1. RBAC
Already have `user_roles` + `has_role()`. Add:
- Enum value `editor` (admin | editor | member).
- Role gates in UI:
  - **member** — view public, create own, favorite.
  - **editor** — edit any public prompt + restore versions.
  - **admin** — manage roles, delete any, view audit log.
- New `/admin` route (gated by `has_role(admin)`) — user list + role assignment.
- Server fn `requireRole(role)` middleware wrapping `requireSupabaseAuth`.

### B2. Prompt versioning & rollback
New table:
```
prompt_versions (
  id, prompt_id, version_number, title, description,
  content, category, tags[], framework,
  edited_by, edited_at, change_note
)
```
- DB trigger on `prompts` UPDATE → snapshot OLD row into `prompt_versions` (auto-increment `version_number` per prompt).
- New route `/prompt/$id/history` — timeline of versions with diff preview.
- "Restore this version" button (editor/admin only) → server fn that writes the old content back (which itself creates another version → full audit trail).

### B3. Audit logs
New table:
```
audit_logs (
  id, actor_id, action, entity_type, entity_id,
  metadata jsonb, created_at
)
```
- Server fn helper `logAudit({ action, entityType, entityId, metadata })` called from every mutation server fn (create/update/delete prompt, role change, version restore, favorite toggle optional).
- `/admin/audit` page (admin only) — paginated table, filter by actor/action/entity.
- RLS: only admins can SELECT.

---

## Technical details

**New files**
- `src/routes/index.tsx` (rewrite — public landing)
- `src/routes/_authenticated/admin.tsx`, `admin.audit.tsx`
- `src/routes/_authenticated/prompt.$id.history.tsx`, `prompt.$id.edit.tsx`
- `src/components/PromptEditor.tsx`, `LoadingSkeleton.tsx`, `RoleGate.tsx`
- `src/lib/audit.functions.ts`, `src/lib/versions.functions.ts`, `src/lib/admin.functions.ts`, `src/lib/chat-history.functions.ts`
- `src/lib/rbac.ts` (role helpers + `requireRole` middleware)

**Edited**
- `src/components/AppShell.tsx` — collapsible sidebar, grouped nav, role-aware admin link
- `src/components/HelpChat.tsx` — persisted history
- `src/lib/chat.functions.ts` — save messages
- `src/routes/library.tsx`, `favorites.tsx`, `prompt.$id.tsx`, `new.tsx`

**DB migrations** (1 file)
1. Add `editor` to `app_role` enum
2. Create `prompt_versions`, `audit_logs`, `chat_messages` + RLS
3. Snapshot trigger on `prompts`
4. Helper fn `log_audit()` (SECURITY DEFINER, called from server fns via supabaseAdmin)

**Data inserts** (separate, after migration)
- 10 beginner prompts
- New `beginner` is just a `category` text value — no schema change

---

## Ship order

1. **Phase 1 first** (B1–B3): migration → server fns → admin UI → versioning UI → audit page.
2. Then **Part A** (homepage, sidebar polish, beginner prompts, loading states, chat persistence, prompt editor).

## Out of scope (would defer)

- Real-time collaborative editing
- Prompt comments / reviews
- Public sharing links for non-auth users
- Branching versions (only linear history)
- Diff view beyond side-by-side text (no semantic diff)

---

Approve to proceed — I'll start with the Phase 1 migration.
