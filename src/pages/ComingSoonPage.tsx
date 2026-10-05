export default function ComingSoonPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "24px",
        background: "#FAF8F5",
        fontFamily: "Jost, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          fontFamily: "Cormorant Garamond, Georgia, serif",
          fontSize: "clamp(28px, 4vw, 42px)",
          color: "#111",
          marginBottom: "16px",
        }}
      >
        TripAgent
      </div>
      <h1
        style={{
          fontFamily: "Cormorant Garamond, Georgia, serif",
          fontWeight: 400,
          fontSize: "clamp(32px, 6vw, 56px)",
          color: "#111",
          margin: "0 0 20px",
          lineHeight: 1.1,
        }}
      >
        Something beautiful<br />is on its way.
      </h1>
      <p
        style={{
          fontSize: "16px",
          color: "#4A4744",
          maxWidth: "480px",
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        A private travel maison, by invitation. We're putting the final
        touches in place — check back soon.
      </p>
    </div>
  );
}
