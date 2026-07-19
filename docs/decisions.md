# Knowledge log — ui-kit

> Architecture decisions + the _why_, recorded so the next session doesn't re-derive them. Append-only,
> **newest on top**. Standard: `nuc-platform/05-documentation-standard.md §5`. Record only the non-obvious.

---

## 2026-07-19 — `EmptyState` gained a `children` slot instead of a second component

**Context:** sakubun independently built its own `components/empty-state.tsx` (a `children`-only box) during
its P2 reuse pass, not noticing the registry already shipped `empty-state` with a structured
`icon`/`title`/`description`/`action` API. Two components, one name, one look — a fork.
**Decision:** extend the canonical with an optional `children` slot (and relax `title` to optional) rather
than register a second variant; sakubun then adopted the canonical as a copy-in. `children` renders as a
**direct child**, not inside a wrapper `<div>`, and passing it also mutes the container text.
**Why:** sakubun's copy exists because its empty-state copy is rich inline JSX (`<code>`, `<em>`, an embedded
`<ImportDialog />`) that doesn't fit a `title: string`. The wrapper matters: three sakubun call sites style
the box as a flex stack (`flex flex-col items-center gap-4`), and wrapping the children would make them one
flex item, silently collapsing the gap. The change is **strictly additive** — every existing consumer
(`todo` 8 sites, `journal`) keeps rendering identically, so no copy-in needs re-syncing to stay correct.
**Watch out:** the canonical's default padding is `px-6 py-16`, sakubun's fork was `p-8` — adopting it means
call sites relying on the old default need an explicit `p-8` or the box visibly grows.

## 2026-06 — Copy-in distribution (shadcn registry), not a published npm package

**Context:** several MiniServer frontends need the same components; how to share across independent repos?
**Decision:** a shadcn **registry** distributed **copy-in** — `registry.json` → `shadcn build` → `public/r/*.json`; consumers `npx shadcn add` to copy the source into their repo (and own it). Registry-first (not raw file copy) so `registryDependencies` resolve transitively (e.g. `page-header` pulls `info-hint`) with the right npm deps + target path.
**Why:** each project is an independent repo + image; a published package would need a private npm registry, a publish pipeline, and coordinated version bumps across all consumers. Copy-in decouples the registry from consumer release cycles and matches the shadcn philosophy (components are code you own). **Trade-off:** bug fixes don't auto-propagate — consumers re-run `shadcn add` for important patches.
**Related:** `registry.json`, `README.md`, `nuc-platform/08-SHARED-ASSETS.md`, [[link-manager-golden-ref-dangling]].

## 2026-06 — Only product-agnostic, stable, ≥3×-reused components belong here

**Context:** it's tempting to dump every nice component into the shared kit.
**Decision / Pitfall:** only stable, product-agnostic, reused-across-projects components are extracted; per-app UI (`streak-chip`, `mood-picker`, `day-nav`) stays in its app. `page-header` is Next-only (`next/link`); `date-picker`'s shadcn `calendar` template must match the installed `react-day-picker` major (v8 vs v9/v10 API differs).
**Why:** premature extraction couples projects to a shared shape that isn't actually shared (the rule-of-three from `/code-reuse`). Keep the glue shared, keep the feature local.
**Related:** `registry/thiengthb/`, `/code-reuse`, `/react-ui-craft`.

---

_(Add new decisions above this line, newest on top.)_
