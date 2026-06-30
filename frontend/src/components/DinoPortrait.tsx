// Deterministic procedural dino "portrait": a hand-rolled SVG identicon seeded
// by species + color + id, so the same dino always renders the same avatar and
// different dinos look distinct. No external dependency, no network art.
import { hashString, mulberry32 } from '../utils/seededRandom';

interface Props {
  species: string;
  color?: string | null;
  id: number;
  size?: number;
  alive?: boolean;
}

export default function DinoPortrait({ species, color, id, size = 48, alive = true }: Props) {
  const seed = `${species}|${color ?? 'plain'}|${id}`;
  const rand = mulberry32(hashString(seed));
  const hue = hashString(color ?? species) % 360;
  const sat = alive ? 55 : 0;
  const body = `hsl(${hue} ${sat}% 48%)`;
  const dark = `hsl(${hue} ${sat}% 32%)`;
  const bg = `hsl(${hue} ${Math.round(sat * 0.7)}% 92%)`;

  const longNeck = rand() > 0.5;
  const headX = 68 + rand() * 8;
  const headY = longNeck ? 26 : 38;
  const spots = Array.from({ length: 3 + Math.floor(rand() * 3) }, () => ({
    cx: 28 + rand() * 38,
    cy: 46 + rand() * 26,
    r: 2.5 + rand() * 4,
  }));

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${species} portrait`}
    >
      <rect x="0" y="0" width="100" height="100" rx="18" fill={bg} />
      {/* tail */}
      <path d={`M28 64 Q10 60 8 76 Q24 70 34 70 Z`} fill={dark} />
      {/* body */}
      <ellipse cx="46" cy="62" rx="26" ry="18" fill={body} />
      {/* hind leg */}
      <rect x="40" y="74" width="8" height="16" rx="3" fill={dark} />
      <rect x="54" y="74" width="8" height="16" rx="3" fill={dark} />
      {/* neck + head */}
      <path
        d={`M60 56 Q${headX} ${headY + 16} ${headX} ${headY + 8} L${headX + 12} ${headY + 8} Q66 60 64 64 Z`}
        fill={body}
      />
      <circle cx={headX + 6} cy={headY + 2} r="11" fill={body} />
      {/* eye */}
      <circle cx={headX + 10} cy={headY} r="2.4" fill="#1b1b1b" />
      {/* spots */}
      {spots.map((spot, index) => (
        <circle key={index} cx={spot.cx} cy={spot.cy} r={spot.r} fill={dark} opacity="0.6" />
      ))}
    </svg>
  );
}
