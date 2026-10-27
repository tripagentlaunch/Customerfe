# How it Works illustrations: original set (archived 2026-10-27)

The five images the homepage "How it Works" section used before the visuals were
redone in a thinner, glass-UI style.

| File | Stage |
|---|---|
| enquiry.png | 1. Enquiry |
| booking.png | 2. Booking |
| departure.png | 3. The Journey (was "Departure") |
| intrip.png | 4. The Contingency Desk (was "In-trip") |
| home.png | 5. Home |

Stored outside `public/` on purpose, so this folder is tracked by git but is not
copied into the built site.

## Bring them back
```bash
cp design-archive/how-it-works-2026-10-27-original/*.png public/img/how-it-works/
```
The section reads `/img/how-it-works/<name>.png` (src/data/how-it-works-stages.ts),
so no code change is needed.

The same files are also in git history at `public/img/how-it-works/` (for example
commit 87ec580).
