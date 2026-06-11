const RADIUS = 26;

export default function Piece({ piece, x, y, isSelected, onClick, className }) {
  const isRed = piece.color === 'red';
  const fill = isRed ? '#CC2200' : '#1a1a1a';
  const textColor = isRed ? '#FFE066' : '#CC2200';
  const ring = isRed ? '#FFE066' : '#555';

  return (
    <g
      onClick={onClick}
      className={className}
      // CSS transform (not the SVG attribute) so moves glide via transition.
      style={{
        transform: `translate(${x}px,${y}px)`,
        transition: 'transform 300ms ease',
        cursor: 'pointer',
      }}
    >
      {isSelected && (
        <circle r={RADIUS + 5} fill="none" stroke="#00AAFF" strokeWidth="3" strokeDasharray="6 3" />
      )}
      <circle r={RADIUS} fill={fill} stroke={ring} strokeWidth="2" />
      <circle r={RADIUS - 5} fill="none" stroke={ring} strokeWidth="1" opacity="0.5" />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill={textColor}
        fontSize="20"
        fontFamily="'Noto Serif SC', STSong, SimSun, serif"
        fontWeight="bold"
      >
        {piece.char}
      </text>
    </g>
  );
}
