import type { LucideIcon } from "lucide-react";
import styles from "./MapPin.module.css";

// A colored circular badge with a category glyph inside — shared by every
// map on the site (CityMap's real Google map, MockCityMap's no-key
// placeholder, and PlanRouteMap's itinerary route) so a symbol always
// stands in for "what kind of place is this", not just a plain dot.
export default function MapPin({
  Icon,
  color,
  size = 30,
  active = false,
  dim = false,
}: {
  Icon: LucideIcon;
  color: string;
  size?: number;
  active?: boolean;
  dim?: boolean;
}) {
  return (
    <div
      className={`${styles.pin}${active ? ` ${styles.active}` : ""}${dim ? ` ${styles.dim}` : ""}`}
      style={{ width: size, height: size, background: color }}
    >
      <Icon size={Math.round(size * 0.52)} strokeWidth={2} color="#fff" />
    </div>
  );
}
