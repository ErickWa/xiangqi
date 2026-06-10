# Loop prompt

Run with `/loop` (self-paced) or `/loop 30m` (fixed interval):

```
/loop Read SPEC.md. If lint, build, or tests are broken, fix that first.
Otherwise implement exactly one item: the topmost unchecked roadmap entry.
Write the minimum code that fully satisfies the spec for that item — prefer
deleting and simplifying over adding, no new dependencies, match existing
style, and respect the Engineering constraints section. Verify with
`npm run lint && npm run build` (and `npm test` once it exists). Only when
green: check the item off in SPEC.md, append a one-line entry to its Progress
log, and commit with a concise message. One item per iteration. If every
roadmap item is checked, verify the Definition of done end to end; if it
holds, stop the loop.
```
