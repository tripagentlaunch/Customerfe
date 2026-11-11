// Weather glyphs for the "When to go" month tiles (2026-11-11, direct request). The city data has no weather yet
// (only a best/good/quieter tier per month); the backend will send it later, so every kind of weather has an icon
// here already. 32 x 32, drawn to sit on a white card.
export type WeatherKind =
  | "sunny"
  | "partly-cloudy"
  | "cloudy"
  | "rain"
  | "heavy-rain"
  | "storm"
  | "snow"
  | "hot"
  | "fog"
  | "windy";

export const WEATHER_LABEL: Record<WeatherKind, string> = {
  sunny: "Sunny",
  "partly-cloudy": "Partly cloudy",
  cloudy: "Cloudy",
  rain: "Rain",
  "heavy-rain": "Heavy rain",
  storm: "Thunderstorms",
  snow: "Snow",
  hot: "Intense heat",
  fog: "Fog",
  windy: "Windy",
};

const SUN = "#F6B21A";
const HEAT = "#F0642A";
const CLOUD = "#B9C3CF";
const CLOUD_DARK = "#7C8795";
const WATER = "#5AA9F0";

const CLOUD_PATH = "M9.5 25a5.5 5.5 0 0 1-.7-10.95A7.5 7.5 0 0 1 23 13.5a5.75 5.75 0 0 1 .5 11.5z";

function Rays({ cx, cy, r1, r2, color, n = 8 }: { cx: number; cy: number; r1: number; r2: number; color: string; n?: number }) {
  return (
    <g stroke={color} strokeWidth={1.8} strokeLinecap="round">
      {Array.from({ length: n }, (_, i) => {
        const a = (i * 2 * Math.PI) / n;
        return <line key={i} x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1} x2={cx + Math.cos(a) * r2} y2={cy + Math.sin(a) * r2} />;
      })}
    </g>
  );
}

export default function WeatherIcon({ kind, size = 30 }: { kind: WeatherKind; size?: number }) {
  let body: JSX.Element;
  switch (kind) {
    case "sunny":
      body = (
        <>
          <circle cx="16" cy="16" r="5.5" fill={SUN} />
          <Rays cx={16} cy={16} r1={8.5} r2={11.5} color={SUN} />
        </>
      );
      break;
    case "partly-cloudy":
      body = (
        <>
          <circle cx="12" cy="11.5" r="4.6" fill={SUN} />
          <Rays cx={12} cy={11.5} r1={7.2} r2={9.6} color={SUN} />
          <path d={CLOUD_PATH} fill={CLOUD} transform="translate(2.5 1.5) scale(.86)" />
        </>
      );
      break;
    case "cloudy":
      body = <path d={CLOUD_PATH} fill={CLOUD} />;
      break;
    case "rain":
      body = (
        <>
          <path d={CLOUD_PATH} fill={CLOUD} transform="translate(0 -4)" />
          <g stroke={WATER} strokeWidth={2} strokeLinecap="round">
            <line x1="11" y1="23" x2="9.5" y2="27" />
            <line x1="16" y1="23" x2="14.5" y2="27" />
            <line x1="21" y1="23" x2="19.5" y2="27" />
          </g>
        </>
      );
      break;
    case "heavy-rain":
      body = (
        <>
          <path d={CLOUD_PATH} fill={CLOUD_DARK} transform="translate(0 -5)" />
          <g stroke={WATER} strokeWidth={2} strokeLinecap="round">
            <line x1="9" y1="22" x2="7" y2="28" />
            <line x1="14" y1="22" x2="12" y2="28" />
            <line x1="19" y1="22" x2="17" y2="28" />
            <line x1="24" y1="22" x2="22" y2="28" />
          </g>
        </>
      );
      break;
    case "storm":
      body = (
        <>
          <path d={CLOUD_PATH} fill={CLOUD_DARK} transform="translate(0 -5)" />
          <polygon points="17,18 11.5,26.5 16,26.5 14.5,31 21,22 16.5,22 18.5,18" fill={SUN} />
        </>
      );
      break;
    case "snow":
      body = (
        <>
          <path d={CLOUD_PATH} fill={CLOUD} transform="translate(0 -5)" />
          <g stroke="#6FA8DC" strokeWidth={1.7} strokeLinecap="round">
            {[10.5, 16, 21.5].map((x, i) => (
              <g key={x} transform={`translate(${x} ${i === 1 ? 27 : 24.5})`}>
                <line x1="-2" y1="0" x2="2" y2="0" />
                <line x1="0" y1="-2" x2="0" y2="2" />
                <line x1="-1.4" y1="-1.4" x2="1.4" y2="1.4" />
                <line x1="-1.4" y1="1.4" x2="1.4" y2="-1.4" />
              </g>
            ))}
          </g>
        </>
      );
      break;
    case "hot":
      body = (
        <>
          <circle cx="16" cy="13" r="6" fill={HEAT} />
          <Rays cx={16} cy={13} r1={9.2} r2={12.2} color={HEAT} />
          <g fill="none" stroke={HEAT} strokeWidth={1.8} strokeLinecap="round">
            <path d="M7 26c2-2 3 2 5 0s3 2 5 0 3 2 5 0 3 2 4 0" />
          </g>
        </>
      );
      break;
    case "fog":
      body = (
        <>
          <path d={CLOUD_PATH} fill={CLOUD} transform="translate(0 -5)" />
          <g stroke={CLOUD_DARK} strokeWidth={2} strokeLinecap="round">
            <line x1="7" y1="23" x2="25" y2="23" />
            <line x1="10" y1="27" x2="27" y2="27" />
          </g>
        </>
      );
      break;
    case "windy":
      body = (
        <g fill="none" stroke={CLOUD} strokeWidth={2} strokeLinecap="round">
          <path d="M5 12h14a3.5 3.5 0 1 0-3.5-3.5" />
          <path d="M5 17h19a3.5 3.5 0 1 1-3.5 3.5" />
          <path d="M5 22h9" />
        </g>
      );
      break;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={WEATHER_LABEL[kind]}>
      {body}
    </svg>
  );
}
