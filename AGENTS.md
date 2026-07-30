# Gym Tracker App - Agent Guidelines

This file contains critical context and rules for any AI agent or assistant working on the `gym-tracker-app` codebase. 

## 1. Project Overview & Tech Stack
- **Framework**: Next.js (App Router). Do NOT use the `pages/` directory. All routes are inside `app/`.
- **Language**: TypeScript (strict mode). Avoid using `any`; type everything properly.
- **Styling**: Tailwind CSS v4.
- **Database & Auth**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`). Database migrations are stored in `supabase/migrations/`.
- **Animations**: Framer Motion (`framer-motion`).
- **Icons**: Lucide React (`lucide-react`).
- **PWA / Offline**: The app uses `serwist` for offline capabilities and service workers.

## 2. Design & Aesthetics (CRITICAL)
- **Premium Look**: The UI must feel premium, modern, and native-app-like.
- **Colors**: Use the custom tailwind colors (`gym-accent`, `gym-bg`, `gym-surface`, `gym-danger`, `gym-success`, `gym-warning`, `gym-info`). Avoid basic primary colors (red, blue, green) unless they are the gym semantic colors.
- **Glassmorphism**: Use translucent backgrounds (`bg-white/[0.03]`), blur effects (`backdrop-blur-md`), and subtle borders (`border-white/10`) extensively.
- **Typography**: Use high contrast. Main titles are bold/extrabold (`font-black`, `font-extrabold`). Use uppercase tracking for small labels (`text-[10px] uppercase tracking-wider`).
- **Interactions**: All clickable elements must have active states (`active:scale-95` or `whileTap={{ scale: 0.95 }}`) and smooth transitions.

## 3. UI Components & Patterns
- **Modals & Popups**: Use Bottom Sheets for mobile-first popups. When rendering modals over pages with `framer-motion` transforms, you MUST use `createPortal` to render the modal into `document.body` to prevent CSS stacking context issues. Use `<AnimatePresence>` for enter/exit animations.
- **Data Display**: Prefer rounded cards (`rounded-2xl` or `rounded-[1.5rem]`) with inner shadows (`shadow-inner`).
- **Icons**: Always use `lucide-react` icons. Do not use emojis for UI icons.

## 4. Backend & Database
- **Supabase Client**: Always use `createServerSupabaseClient` from `@/lib/supabase/server` for server components/actions, and `createBrowserSupabaseClient` from `@/lib/supabase/client` for client components.
- **Database Changes**: If a schema change is needed, ALWAYS write a new SQL migration file in `supabase/migrations/`. Do not apply changes directly via UI without a migration file.

## 5. Offline-First Architecture
- The app supports offline mode.
- Any action that mutates data during a workout MUST support offline saving (using `lib/sync/offlineSync.ts` or local state).
- Use `useOnlineStatus` hook to determine if the device is connected to the internet.

## 6. Development Workflow
- When asked to add a feature, first check if an existing component or `lib/` function already handles part of the logic.
- Run `npm run typecheck` (`tsc --noEmit`) to verify TypeScript compilation after making significant logic changes.
- Never use `cat` to modify files in bash; use the IDE native tools to replace file content.
