# Performance & Implementation Priority Audit (March 27, 2026)

This audit maps proposed improvements to the current codebase and orders them by impact on app speed and perceived performance.

## Priority 0 (Do first): Split event detail mega component + lazy-load heavy organizer UI

**Why this is top priority**
- `app/events/[id]/page.tsx` is currently ~2200 lines with many independent concerns and large client state surface.
- The page imports/owns items, claims, invites, friends, members, polls, votes, chat, tasks, RSVP, email reminders, and deletion flows in one client component.
- This increases initial JS work, makes rerenders expensive, and slows iteration.

**Current evidence in code**
- Giant component and broad state ownership live in one file (`EventPage`).
- Organizer-only areas (poll/event/invite/tasks tabs) are embedded in same client tree, so non-organizers also pay parsing/render costs.

**Implementation suggestions**
1. Extract feature hooks:
   - `useEventCore(eventId)` (session, event, members, role checks)
   - `useEventItems(eventId)`
   - `useEventTasks(eventId)`
   - `useEventChat(eventId)`
   - `useEventPolls(eventId)`
2. Split view components by feature card and memoize props.
3. Lazy-load organizer-only tools via `next/dynamic` gated behind `isCreator`.
4. Keep polling/chat subscriptions scoped to only mounted panes.

**Expected impact**
- Lower JS parse/hydration cost for event detail.
- Reduced rerender blast radius.
- Easier performance debugging and future feature delivery.

## Priority 1: Move initial data fetch to server components/actions

**Why this is next**
- Several routes are client-only and do auth/data loading in `useEffect`, which delays meaningful content and can cause “loading first, data later” UX.

**Current evidence in code**
- Client session/data fetch in effects on events, profile, invites, join, and event detail pages.

**Implementation suggestions**
1. Convert route shells to Server Components for first render data.
2. Use Server Actions/Route Handlers for mutations.
3. Hydrate only interactive islands (task controls, chat input, poll voting).
4. Keep realtime subscriptions client-side but feed them server-rendered initial data.

**Expected impact**
- Faster first paint and better perceived speed.
- Lower client bundle work and fewer data-fetch race conditions.

## Priority 2: Add measurable guardrails before/while refactoring

**Why this is important**
- Refactors are safer and more credible with objective deltas.

**Implementation suggestions**
1. Add baseline metrics (LCP/INP/TBT via Lighthouse + Web Vitals).
2. Add bundle analyzer to track `events/[id]` and shared chunks.
3. Add simple render counters during development for hot paths.

## Priority 3: Design-system primitives to cut duplicate UI/runtime work

**Current evidence in code**
- Repeated inline style objects and duplicated `Card`/button/row patterns across pages.

**Implementation suggestions**
1. Introduce reusable primitives (`Button`, `Card`, `Input`, `StatusBanner`, `EmptyState`).
2. Centralize tokens (spacing/radii/color/type) in one module.
3. Favor consistent component APIs for faster feature shipping.

**Expected impact**
- Smaller duplication footprint and faster UI iteration.
- Cleaner a11y and styling consistency rollout.

## Priority 4: Loading/empty-state improvements

**Current evidence in code**
- Many generic “Loading…” and plain empty messages remain.

**Implementation suggestions**
1. Add skeleton components for key list/detail regions.
2. Add CTA-driven empty states (“Create first event”, “Invite friends”).
3. Reuse a shared status/empty pattern component.

**Expected impact**
- Better perceived performance and onboarding clarity.

## Priority 5: A11y pass (quick wins)

**Current evidence in code**
- Status regions exist, but forms still rely heavily on placeholders and inline UI semantics.

**Implementation suggestions**
1. Ensure all form controls have associated labels.
2. Add visible keyboard focus styles globally.
3. Validate heading hierarchy and semantic button/link usage.
4. Add live regions only where needed for async updates.

## Security/back-end hardening status against your list

### Already implemented / largely in place
- **Invite inbox query filter by signed-in email** is explicitly present in `invites/page.tsx` via `.eq("email", email)`.
- **Internal navigation** appears to use `next/link` for internal routes in the checked pages.
- **Email reminder route hardening** already includes:
  - bearer token auth check,
  - creator authorization (`events.creator_id` match),
  - server-side recipient resolution from `event_invites`,
  - in-memory rate limiting.

### Still worth adding
- Persistent/distributed rate limiting (current in-memory map resets on cold start / multi-instance).
- Idempotency keys for send endpoint.
- Audit logging table for reminder sends (who/when/event/recipient count).

## Product feature readiness (after performance priorities)

Once Priorities 0–2 are underway, these are natural fits:
1. Calendar export and deep links (already partially aligned with existing calendar invite generation in event detail).
2. Expanded RSVP surfaces/analytics.
3. Notification center fed by existing invite/task/poll/chat events.
4. Event templates seeded from event type + task/item presets.

## Recommended execution order (fastest impact)

1. **P0**: Split event detail + lazy-load organizer panes.
2. **P1**: Server-render initial data for events/profile/invites/join/event shells.
3. **P2**: Add performance baselines and bundle budgets.
4. **P3**: Build shared UI primitives/tokens.
5. **P4**: Upgrade loading/empty states.
6. **P5**: A11y quick wins.
7. Product add-ons (calendar/RSVP center/templates).

## Supabase change impact for this refactor

- For the organizer-panel extraction and lazy-loading work itself, **no new Supabase migration is required**.
- The refactor only reorganizes front-end component boundaries and shared TypeScript types.
- Supabase changes become necessary only when introducing new DB schema, RPC contracts, or authorization policies (for example: notification center tables, template presets, or server-enforced idempotency/audit logs for email reminders).
