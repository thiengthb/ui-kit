# Knowledge log — ui-kit

> Architecture decisions + the _why_, recorded so the next session doesn't re-derive them. Append-only,
> **newest on top**. Standard: `nuc-platform/05-documentation-standard.md §5`. Record only the non-obvious.

---

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
