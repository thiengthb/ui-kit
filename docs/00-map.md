# ui-kit — Map

> One sentence: the platform's shared **shadcn registry** of reusable React/Next UI components, distributed **copy-in** (consumers run `npx shadcn add`, own the code). `kind`: `meta` (NOT deployed — no Docker/CI/Traefik). Dev path `MiniServer/ui-kit`.

## 1. Essence

Build the reusable UI thing **once**. Components proven in `todo` are extracted here so other MiniServer frontends copy them in (shadcn philosophy: components are code you own, not an npm dependency). No server, no image, no pipeline. Only stable, product-agnostic components belong here — per-app UI stays in its app.

## 2. Stack

| Layer | Tech |
| --- | --- |
| Tooling | `shadcn` CLI (`npx shadcn@latest build`) — devDependency only |
| Format | TypeScript + TSX, shadcn `new-york` style, Tailwind CSS vars, `rsc:true` |
| Build | `registry.json` (source of truth) → `shadcn build` → `public/r/<name>.json` (self-contained, what consumers fetch) |
| Deploy | **none** — `private:true`, no Dockerfile, no `deploy.yml`, no `.env` |

## 3. Module map / entry points

```
registry.json            authoritative manifest: 10 items (name/type/description/dependencies/registryDependencies/files[].target)
components.json          shadcn config for THIS repo (new-york, Tailwind neutral, @/ aliases)
package.json             @thiengthb/ui-kit, private:true, script registry:build → shadcn build
README.md                consumption guide (local path vs namespaced registry) + authoring guide + gotchas
registry/thiengthb/
  truncate · empty-state · icon-tooltip · info-hint · reveal · field* · date-picker · time-picker · skeletons · page-header**
  (* field & page-header depend on @thiengthb/info-hint;  ** page-header is Next-only via next/link)
public/r/<name>.json     BUILT output (embedded source) — committed, fetched by `shadcn add`
```

## 4. Main flows

1. **Author**: add `registry/thiengthb/<name>.tsx` → add an entry to `registry.json` (`dependencies` npm, `registryDependencies` shadcn/`@thiengthb/*`, `files[].target`) → `npx shadcn@latest build` → commit `public/r/`.
2. **Consume — local path** (same machine): `npx shadcn@latest add ../ui-kit/public/r/truncate.json` (transitive registry deps added manually).
3. **Consume — namespaced registry** (remote): add `"@thiengthb": "https://raw.githubusercontent.com/thiengthb/ui-kit/main/public/r/{name}.json"` to the consumer's `components.json`, then `npx shadcn@latest add @thiengthb/page-header` (transitive `@thiengthb/info-hint` resolved automatically).

## 5. Highlights

- **`todo` is the reference** — components were extracted from there, proven in production.
- **`page-header` is Next-only** (`next/link`); don't use in non-Next projects unmodified.
- **`date-picker` → shadcn `calendar` → `react-day-picker`**: the calendar template must match the installed `react-day-picker` major (v8 vs v9/v10 API differs — documented gotcha).
- Copy-in means **bug fixes don't auto-propagate** — consumers re-run `shadcn add` for important patches.

## 6. Invariants

- **NOT deployed** — never add a Dockerfile, `deploy.yml`, Traefik label, or `.env`.
- **Naming**: PascalCase React exports, **kebab-case filenames** (`date-picker.tsx`).
- **Every edit to `registry/*.tsx` or `registry.json` ⇒ `npx shadcn build` + commit `public/r/`** (else consumers fetch stale output).
- **Only product-agnostic, stable, reused-across-projects components** belong here (per-app UI stays in its app).
- **Keep `registry.json` ↔ `nuc-platform/08-SHARED-ASSETS.md` in sync** when the component list changes.
- `package.json` stays `private:true` — never published to npm.

## 7. Secrets / env

None — no runtime, no `.env`, no credentials.

## 8. Further reading

- Consumption + authoring + gotchas: `README.md` · why copy-in/registry-first: `docs/decisions.md`
- Shared-asset catalog: `nuc-platform/08-SHARED-ASSETS.md` · standard: `/react-ui-craft` ("build the reusable thing ONCE")
