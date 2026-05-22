## Plan

Three additions to Prompt Directory:

### 1. AI Help Chatbot
- Floating chat bubble (bottom-right) available on every authenticated page via `AppShell`.
- Click → opens a chat panel (Sheet/Drawer) with a conversation thread.
- Uses **Lovable AI Gateway** (`google/gemini-2.5-flash`, no API key required) via a `createServerFn` (`src/lib/chat.functions.ts`) protected by `requireSupabaseAuth`.
- System prompt makes it a "Prompt Directory assistant" — answers questions about how to use the app (library, favorites, creating prompts, frameworks like CO-STAR / Few-Shot / Chain-of-Thought) and helps users refine their own prompts.
- Conversation kept in component state (not persisted) — keeps scope small. Markdown rendering via `react-markdown`.
- Handles 429 (rate limit) and 402 (credits exhausted) with friendly toast messages.

### 2. Light / Dark Mode Toggle
- Add a `ThemeProvider` (`src/lib/theme.tsx`) that toggles a `.light` / `.dark` class on `<html>` and persists choice in `localStorage` (default: dark — matches current Charcoal & Ember).
- Add a **light palette** to `src/styles.css` under `:root.light` (warm off-white background, charcoal text, same ember `#e85d3a` primary so brand stays consistent).
- Add a Sun/Moon toggle button in the sidebar footer of `AppShell` next to the user avatar.

### 3. More Examples per Category (5–6 each)
Currently 2–3 prompts per category. Add 3–4 more high-quality public prompts to each of the 8 categories (Code Review, Documentation, Security, Testing, DevOps & Infrastructure, Debugging, Development, Architecture) → ~28 new seed prompts via a data insert. All `is_public=true`, owned by an existing admin user (or first available user).

### Technical Details
- Files created:
  - `src/lib/chat.functions.ts` — server fn calling Lovable AI Gateway
  - `src/components/HelpChat.tsx` — floating button + chat panel UI
  - `src/lib/theme.tsx` — ThemeProvider + `useTheme` hook
  - `src/components/ThemeToggle.tsx` — Sun/Moon button
- Files edited:
  - `src/components/AppShell.tsx` — mount `<HelpChat />` and `<ThemeToggle />`
  - `src/routes/__root.tsx` — wrap with `ThemeProvider`
  - `src/styles.css` — add `.light` token overrides
- Package added: `react-markdown`
- DB: insert ~28 prompts (no schema change, uses existing `prompts` table).

### Out of scope (ask if wanted)
- Persisting chat history across sessions
- Multiple chat conversations
- Following the system theme automatically (we default to dark + manual toggle)