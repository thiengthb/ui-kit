# @thiengthb/ui-kit — shared shadcn registry

A **shared** frontend component set for every React/Next project in `D:\Projects\MiniServer\`,
distributed as a **shadcn custom registry** — i.e. **copy-in, NOT a runtime dependency**.

> **Why copy-in rather than an npm package?** MiniServer architecture: each project = an independent
> repo + Docker image, the NUC only pulls. A runtime dep (`@thiengthb/ui`) would force maintaining a
> private registry + publish pipeline + bumping versions across many repos at once, and goes against
> the shadcn philosophy ("a component is code you own, not a dep"). Copy-in: each project pulls the
> source down, **owns and can edit it**, with no runtime coupling. The trade-off: a fix in one place
> does NOT propagate automatically — when there's an important patch, `shadcn add` it again.

## What's in the registry

| Item | Description | shadcn deps to add | Notes |
| --- | --- | --- | --- |
| `truncate` | Smart single-line clamp, only shows the tooltip on overflow | `tooltip` | |
| `empty-state` | Shared empty state | – | |
| `icon-tooltip` | Read-only tooltip for icon buttons (replaces `title=`) | `tooltip` | |
| `info-hint` | ⓘ icon opening an explanation Popover (touch + a11y friendly) | `popover` | |
| `reveal` | Reveal gradually on entering the viewport, pure CSS | – | |
| `field` | Wraps label + control + hint/info for forms | (pulls in `info-hint`) | |
| `date-picker` | Popover + Calendar, value `YYYY-MM-DD` local | `button` `calendar` `popover` | npm `date-fns`; inline helpers |
| `time-picker` | Input + Popover time presets, value `HH:MM` | `input` `popover` `scroll-area` | inline helpers |
| `skeletons` | Skeleton set matching the standard card for `loading.tsx` | `skeleton` | |
| `page-header` | Consistent page header (eyebrow + h1 + action + back) | (pulls in `info-hint`) | ⚠️ **Next-only** (`next/link`) |

The item sources live in `registry/thiengthb/*.tsx`. Every item assumes the consuming project already
has shadcn (`@/lib/utils` exposes `cn`, the `@/` alias) — just like every MiniServer frontend.

## 1) Build the registry (in this folder)

`shadcn build` reads `registry.json` → generates JSON embedding the source into `public/r/<name>.json`
(this is what other projects fetch).

```bash
cd D:\Projects\MiniServer\ui-kit
npx shadcn@latest build      # outputs public/r/*.json
```

Re-run this command whenever you edit/add a component, then commit `public/r/`.

## 2) Consuming from another project

There are 2 approaches, pick per your needs:

### Approach A — LOCAL path (zero-infra, usable right away)

Since every project is on the same machine, point straight at the built JSON file:

```bash
cd D:\Projects\MiniServer\journal
npx shadcn@latest add ../ui-kit/public/r/truncate.json
npx shadcn@latest add ../ui-kit/public/r/empty-state.json
```

shadcn copies the component to the right `target`, installs the npm dep (e.g. `lucide-react`) and pulls
the shadcn deps (`tooltip`, `popover`) if missing.

### Approach B — namespaced registry (when you want to use it from another machine / more concise)

Push `ui-kit` to GitHub **public** (`thiengthb/ui-kit` — it's only UI source, no secret), then declare
the registry in the consuming project's `components.json`:

```jsonc
{
  "registries": {
    "@thiengthb": "https://raw.githubusercontent.com/thiengthb/ui-kit/main/public/r/{name}.json"
  }
}
```

Then:

```bash
npx shadcn@latest add @thiengthb/truncate
npx shadcn@latest add @thiengthb/page-header   # automatically pulls in @thiengthb/info-hint
```

> `page-header` declares `registryDependencies: ["@thiengthb/info-hint"]`, so APPROACH B pulls in
> `info-hint` automatically. With APPROACH A, `add` `info-hint.json` before page-header.

## 3) Adding a new component to the registry

1. Create `registry/thiengthb/<name>.tsx` (keep the `@/lib/utils`, `@/components/ui/*` imports as in the app).
2. Add an entry to `items[]` in `registry.json`: declare `dependencies` (npm) + `registryDependencies`
   (shadcn primitives or other `@thiengthb/<item>`) + `files[].target`.
3. `npx shadcn@latest build` → commit.

**Only put STABLE things here that are NOT tied to a specific product.** Do NOT add `app-shell`, `streak-chip`,
`day-nav`, `mood-picker`… (those are per-app UI).

## Known gotcha

- **`date-picker` pulls shadcn `calendar`** → `calendar` in turn depends on **`react-day-picker`**. The
  shadcn `calendar` template must MATCH the major version of the installed `react-day-picker` (v8 uses
  `classNames.table`, v9/v10 changed the API → a mismatch errors with `'table' does not exist in type
  Partial<ClassNames>`). If you hit it: reinstall `calendar` at the right version (`npx shadcn add calendar`)
  to match the project's `react-day-picker`, or drop `date-picker` if unused. (This is a shadcn↔react-day-picker
  issue, not one of this registry.)

## Relation to the shared rules

This realizes the **"Frontend — shared engineering standard"** section in `MiniServer/CLAUDE.md`
(skill `/react-ui-craft`): "build the reusable thing ONCE". The components here are extracted from the
`todo` app (actually running per §12) — `todo` is the reference implementation.
