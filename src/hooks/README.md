# src/hooks

Reusable React hooks (client-side only). Currently: `use-post-json.ts`, used by the lead and
contact forms. `submit()` resolves to `{ ok: true }` or `{ ok: false, fieldErrors }`; forms map
`fieldErrors` onto fields with `pickFieldErrors` (`src/lib/form-errors.ts`). Non-JSON responses
(host error pages) become a clear server error, not a "could not reach the server" message. Add a hook here only when two or more components need the same stateful logic.
