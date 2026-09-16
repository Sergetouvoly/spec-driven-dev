## What changes

<!-- One or two sentences. Which templates or adapters, and why. -->

## Checklist

- [ ] I edited `templates/` or `adapters/`, never `dist/` by hand.
- [ ] I ran `node scripts/build.mjs` and committed the regenerated `dist/`.
- [ ] `node scripts/check.mjs` passes.
- [ ] If I added or changed a guarantee, the adapter's `enforces`, `advisory`
      and `degrades` still describe what the target really does.

**`dist/` is generated.** A change made there is reverted by the next build,
and the target it belongs to silently drifts from every other one. If the diff
touches `dist/` without a matching change under `templates/` or `adapters/`,
that is the thing to fix first.
