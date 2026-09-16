# Demo branch version log

Tracks every push to the `demo` branch. Each push gets a version tag (`demo-v1`, `demo-v2`, ...)
so you can roll back to any point with:

```bash
git checkout demo-v<N>
```

or reset the branch back to it with:

```bash
git reset --hard demo-v<N>
```

| Version | Commit | Date | What changed |
|---------|--------|------|--------------|
| demo-v1 | f660155 | 2026-09-09 | Initial push of `demo` branch to GitHub (branched from `main`); added this version log |
| demo-v2 | bc4138f | 2026-09-16 | CITY: reference city page template (Santorini) + zone template, plus supporting map/plan/calendar components and data-contract hardening. `main-snapshot-2026-09-16` tag preserves main's state as it was just before this push (main and demo hadn't diverged before this). |
| demo-v3 | 28e3fda | 2026-09-16 | CITY: remove signature experiences section (reverted after review) |
