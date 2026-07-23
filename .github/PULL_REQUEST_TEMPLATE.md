## Summary

<!-- What does this change and why? -->

## Related issues

<!-- e.g. Closes #123 -->

## How was this tested?

<!-- Manual steps, contexts exercised (local / SSH), screenshots for UI changes. -->

## Checklist

- [ ] `npm run build` passes (tsc + vite)
- [ ] `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings` pass
- [ ] Any new IPC command has a matching `lib/backend.ts` wrapper **and**
      `lib/mock.ts` mock
- [ ] No shell-string command construction (process calls use argument vectors)
- [ ] Docs / CHANGELOG updated if behavior changed
