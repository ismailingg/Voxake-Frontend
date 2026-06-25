export default function Logo({ size = 22 }: { size?: number }) {
  const barWidth = size * 0.25
  const gap = size * 0.38
  const heights = [size * 0.33, size * 0.67, size, size * 0.67, size * 0.33]
  const totalMark = barWidth * 5 + gap * 4

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <svg
        width={totalMark}
        height={size}
        viewBox={`0 0 ${totalMark} ${size}`}
      >
        {heights.map((h, i) => (
          <rect
            key={i}
            x={i * (barWidth + gap)}
            y={(size - h) / 2}
            width={barWidth}
            height={h}
            rx={barWidth / 2}
            fill="#1D9E75"
          />
        ))}
      </svg>
      <span style={{
        fontSize: size,
        fontWeight: 500,
        letterSpacing: "-0.03em",
        color: "#0F2420",
        lineHeight: 1,
      }}>
        Vox<span style={{ color: "#1D9E75" }}>ake</span>
      </span>
    </div>
  )
}