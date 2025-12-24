import './FloatingLines.css';

const lines = [
  { top: "-25%", left: "-40%", blur: 32, opacity: 0.7, duration: 24 },
  { top: "0%", left: "-20%", blur: 20, opacity: 0.6, duration: 28 },
  { top: "20%", left: "-10%", blur: 26, opacity: 0.65, duration: 32 },
  { top: "40%", left: "-30%", blur: 34, opacity: 0.55, duration: 36 },
];

export default function FloatingLinesBackground() {
  return (
    <div className="floating-lines-background pointer-events-none">
      {lines.map((line, index) => (
        <span
          key={line.top + line.left + index}
          className="floating-line"
          style={{
            top: line.top,
            left: line.left,
            filter: `blur(${line.blur}px)`,
            opacity: line.opacity,
            animationDuration: `${line.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
