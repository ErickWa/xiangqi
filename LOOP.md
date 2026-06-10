# Loop prompt

Run with `/loop` (self-paced) or `/loop 30m` (fixed interval):

```
/loop Read SPEC.md. If lint, build, or tests are broken, fix that first.
Otherwise, count work commits since the last `review:` commit (or since the
loop started): if there have been 2 or more, this iteration is a REVIEW
iteration; otherwise implement exactly one item — the topmost unchecked
roadmap entry.

Work iteration: write the minimum code that fully satisfies the spec for that
item — prefer deleting and simplifying over adding, no new dependencies,
match existing style, and respect the Engineering constraints section.

Review iteration: diff all changes since the last review (`git diff` against
the last `review:` commit, or the loop's first commit). Hunt for bugs,
overcomplication, dead code, scope creep beyond SPEC.md, and LOC-budget
violations. Apply only fixes and simplifications — no new features. Commit
with a message starting `review:`. If nothing needs fixing, note that in the
Progress log and move on to a work iteration.

Either way: verify with `npm run lint && npm run build` (and `npm test` once
it exists). Only when green: update SPEC.md (check off the item / append a
one-line Progress log entry), commit with a concise message, and push. One
iteration per invocation. If every roadmap item is checked, run a final
review iteration, verify the Definition of done end to end, and if it holds,
stop the loop.
```
