// Weather glyphs for the "When to go" month tiles. 2026-11-16 (direct request): Meteocons "line" set (MIT, see
// src/assets/weather/NOTES.txt), cloud outlines darkened to read on white. The city data has no weather yet (the
// backend will send it), so every kind has an icon already.
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
  | "windy"
  | "freezing"
  | "sleet"
  | "drizzle"
  | "hail"
  | "humid"
  | "haze"
  | "monsoon"
  | "cold-clear"
  | "sun-showers"
  | "sandstorm";

// Every kind, in a fixed order (used by the mock data to show all the icons).
export const WEATHER_KINDS: WeatherKind[] = [
  "sunny", "partly-cloudy", "cloudy", "rain", "heavy-rain", "storm", "snow", "hot", "fog", "windy",
  "freezing", "sleet", "drizzle", "hail", "humid", "haze", "monsoon", "cold-clear", "sun-showers", "sandstorm",
];

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
  freezing: "Freezing cold",
  sleet: "Sleet",
  drizzle: "Drizzle",
  hail: "Hail",
  humid: "Hot and humid",
  haze: "Hazy",
  monsoon: "Monsoon rain",
  "cold-clear": "Cold and clear",
  "sun-showers": "Sun and showers",
  sandstorm: "Sandstorm",
};

// One file per kind in src/assets/weather, named after the kind (sunny.svg, heavy-rain.svg, ...).
const FILES = import.meta.glob("../assets/weather/*.svg", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const SVG = Object.fromEntries(
  Object.entries(FILES).map(([path, svg]) => [path.split("/").pop()!.replace(".svg", ""), svg]),
) as Record<WeatherKind, string>;

export default function WeatherIcon({ kind, size = 54, className }: { kind: WeatherKind; size?: number; className?: string }) {
  return (
    <span
      className={className}
      role="img"
      aria-label={WEATHER_LABEL[kind]}
      style={{ display: "inline-flex", width: size, height: size, flex: "none" }}
      dangerouslySetInnerHTML={{ __html: SVG[kind].replace("<svg ", '<svg width="100%" height="100%" ') }}
    />
  );
}
