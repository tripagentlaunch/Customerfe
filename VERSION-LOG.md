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
