# UI patterns

AdminLTE4 CSS stays isolated from third-party widget styles; every screen renders explicit loading/error/empty states; all notifications go through SweetAlert2. Normative rule: [.cursor/rules/ui-patterns.mdc](../.cursor/rules/ui-patterns.mdc).

| Need | Path |
|------|------|
| Shared primitives | `src/components/{SkeletonBlock,ErrorState,EmptyState,TableEmptyRow,DataTable,RowActions}.vue` |
| Detail loader | `src/composables/useDetailLoader.ts` |
| Server-driven row actions | `src/utils/mapQueryRowActions.ts` + Monolith `row.actions[]` |
| Dialogs/toasts | `src/lib/swal.ts` |
| Safe URL/redirect rules | `src/utils/safeUrl.ts`, `src/lib/safeRedirect.ts` |
| Realtime channels | `src/composables/echo/channelRegistry.ts` |
| AdminLTE4 layout and component patterns | `ui-patterns.mdc` |
| Tests | [testing.md](testing.md) |

## Template namespaces

- **AdminLTE4** (Bootstrap 5, `src/assets/main-ltr.css` / `main-rtl.css`) — the authenticated `/apps/*` shell and auth pages. One card at content root, two cards share a breakpoint, a missing sibling expands the remaining cell to `col-12`.

Keep vendor widget styles scoped to their owning component. Do not add a second global CSS namespace.

## States, actions, dialogs

- Skeleton → error-with-retry → empty/data, always. `DataTable` needs `:error` and `@retry`; a list view must start its own first load (`useServerDataTable` or `void fetchList()` in `onMounted`) because `useResource` never fetches on its own.
- A button whose only effect is navigation is a `<router-link>`; real actions stay `<button>`; a disabled nav link uses `class="disabled"` + `aria-disabled` + `tabindex="-1"`.
- Row controls come from the server's `row.actions[]` — never invent keys in the view, never add sibling buttons next to `RowActions`.
- All notifications/confirmations use `src/lib/swal.ts` (`useAlert`, `confirmDialog`, `inputDialog`); never native `alert`/`confirm`/`prompt`, never raw `Swal.fire` modals.
- Extract by concern: composable per concern + section components with typed props/emits; realtime handlers live in the composable. Heavy vendor widgets (select2) load through `defineAsyncComponent`.
- Dependent field visibility is gated in the control, the option list, a reset watcher, and the request payload — `disabled` (still visible) differs from hidden.

## Select2

`FormSelect2` wraps jQuery Select2 over paginated lookups: identity `lookups/users`, `lookups/roles`, navigation `navigation/lookups/menus` (nested tree per root group, flattened by `flattenTreeForSelect2()` into one-level optgroups with the root as its own group's first leaf). `grouped` must be set for that tree source.

**Select2 values must survive a failed hydrate.** Ajax-backed selects receive their `selectedOptions` after mount, so the component appends them in place and re-applies the value instead of re-initialising select2 (a re-init drops the ajax adapter). `applyValue()` suppresses its own `change.select2` echo: a select whose `<option>` rows are not hydrated yet would otherwise read as "cleared" and wipe the stored pivot. `MenuEditView` prunes only lookups that actually succeeded, tracked by `failedLookups` and surfaced through `web.menus.hydrate_partial_warning`.
