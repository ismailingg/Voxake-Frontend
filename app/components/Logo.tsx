export default function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "14px" }}>
      <span style={{
        fontSize: "30px",
        fontWeight: 400,
        letterSpacing: "-0.02em",
        color: "#1A1A17",
        fontStyle: "italic",
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}>
        Voxake
      </span>
      <span style={{
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        fontSize: "10px",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "#8A7F68",
      }}>
        The Voice Memo Dispatch
      </span>
    </div>
  )
}