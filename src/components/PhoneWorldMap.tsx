import { useNavigate } from "react-router-dom";
import WorldMapMobile from "./WorldMapMobile";

// The phone world map with this site's wiring: city taps go through the
// router, photos come from /img/map/<slug>.webp.
export default function PhoneWorldMap({
  activeTabOverride,
  worldRevealKey,
  scrollFriendly,
}: {
  activeTabOverride?: string;
  worldRevealKey?: number;
  scrollFriendly?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <WorldMapMobile
      activeTabOverride={activeTabOverride}
      worldRevealKey={worldRevealKey}
      scrollFriendly={scrollFriendly}
      onNavigate={(href) => navigate(href)}
      getCityHref={(slug) => `/city-${slug}`}
      resolveImage={(path) => `/img/map/${path.split("?")[0].split("/").pop()!.replace(/\.[a-z]+$/i, "")}.webp`}
    />
  );
}
