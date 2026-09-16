// Shared placeholder-image generator — an inline SVG gradient rather than a
// fetch to a placeholder-image service, so it renders instantly with no
// network dependency and no risk of an external service being unreachable
// or rate-limited. Deterministic per seed: the same seed always produces
// the same image, so a given venue/slot/etc. keeps a stable placeholder
// across reloads without needing to store anything.
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function gradientStop(seed: string, salt: number, lightness: number): string {
  const hue = hashString(seed + salt) % 360;
  return `hsl(${hue},38%,${lightness}%)`;
}

export function placeholderPhoto(seed: string, width = 900, height = 1200): string {
  const c1 = gradientStop(seed, 1, 32);
  const c2 = gradientStop(seed, 2, 52);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
