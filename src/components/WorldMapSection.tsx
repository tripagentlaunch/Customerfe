import WorldMap from "./WorldMap";
import StickyWorldMap from "./StickyWorldMap";
import styles from "./WorldMapSection.module.css";

// The "Where we go" world-map section — heading, stats and the interactive
// map — shared by the homepage (sticky scroll-cycling) and the Destinations
// page (plain, no pinning). One definition, so changes land on both.
function Intro() {
  return (
    <div className="wrap">
      <div className={styles.mapIntro}>
        <div>
          <div className="eyebrow reveal">Where we go</div>
          <div className="rule" />
          <h2 className={`reveal d1 ${styles.mapHeading}`}>
            The world, within <em>reach.</em>
          </h2>
          <p className={`reveal d1 ${styles.mapSub}`}>
            Explore extraordinary destinations and start planning your next journey with our expert advisors.
          </p>
        </div>
        <dl className={`reveal d2 ${styles.mapStats}`}>
          <div>
            <dt>100+</dt>
            <dd>Destinations</dd>
          </div>
          <div>
            <dt>50+</dt>
            <dd>Expert advisors</dd>
          </div>
          <div>
            <dt>24/7</dt>
            <dd>Personal support</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

// The map runs full page width (not inside a `.wrap`) — `.band`/`.tight`
// only add vertical padding, so a direct child already spans edge-to-edge.
export default function WorldMapSection({ sticky = false }: { sticky?: boolean }) {
  return (
    <section className="band tight">
      <div className={styles.worldMapWrap}>
        {sticky ? (
          <StickyWorldMap>
            <Intro />
          </StickyWorldMap>
        ) : (
          <>
            <Intro />
            <WorldMap />
          </>
        )}
      </div>
    </section>
  );
}
