import type { ReactElement, SVGProps } from "react";

import type { EquipmentSlug } from "@/content/services";
import { cn } from "@/lib/utils";

/**
 * Simple side-view illustrations of the seven supported equipment types, drawn
 * in the HAULIX palette (warm white outlines, orange details). They sit at the
 * top of equipment cards so each type is recognizable at a glance. Purely
 * decorative: the card's text already names the equipment.
 */

const OUTLINE = "stroke-cream/55";
const SOFT_FILL = "fill-cream/[0.07]";

function Wheel({ cx, cy = 92 }: { cx: number; cy?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="11" className={cn("fill-ink", OUTLINE)} strokeWidth="2.5" />
      <circle cx={cx} cy={cy} r="3.5" className="fill-orange" />
    </g>
  );
}

/** Conventional tractor facing right. `x` is the left edge of the cab. */
function Tractor({ x = 190 }: { x?: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="-6" y="14" width="5" height="40" rx="2" className="fill-cream/40" />
      <path
        d="M0 88 V38 Q0 30 8 28 H38 Q44 28 48 34 L60 52 H84 Q90 52 90 58 V88 Z"
        className={cn(SOFT_FILL, OUTLINE)}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M10 37 H34 L44 50 H10 Z"
        className="fill-cream/10 stroke-cream/40"
        strokeWidth="1.5"
      />
      <rect x="86" y="62" width="4" height="8" rx="1" className="fill-orange" />
      <rect x="-20" y="86" width="116" height="6" rx="2" className="fill-cream/25" />
      <Wheel cx={14} />
      <Wheel cx={38} />
      <Wheel cx={72} />
    </g>
  );
}

function Trailer({ children, w = 170 }: { children?: React.ReactNode; w?: number }) {
  return (
    <g>
      <rect
        x="16"
        y="28"
        width={w}
        height="58"
        rx="4"
        className={cn(SOFT_FILL, OUTLINE)}
        strokeWidth="2"
      />
      {children}
      <Wheel cx={48} />
      <Wheel cx={74} />
    </g>
  );
}

const illustrations: Record<EquipmentSlug, () => ReactElement> = {
  "dry-van": () => (
    <>
      <Trailer>
        {[48, 80, 112, 144].map((x) => (
          <line
            key={x}
            x1={x}
            x2={x}
            y1="36"
            y2="78"
            className="stroke-cream/20"
            strokeWidth="1.5"
          />
        ))}
        <rect x="16" y="72" width="170" height="4" className="fill-orange/80" />
      </Trailer>
      <Tractor />
    </>
  ),
  reefer: () => (
    <>
      <Trailer>
        <rect
          x="172"
          y="34"
          width="14"
          height="28"
          rx="2"
          className="fill-orange/25 stroke-orange"
          strokeWidth="1.5"
        />
        {[42, 48, 54].map((y) => (
          <line
            key={y}
            x1="175"
            x2="183"
            y1={y}
            y2={y}
            className="stroke-orange"
            strokeWidth="1.5"
          />
        ))}
        <rect x="16" y="72" width="156" height="4" className="fill-orange/80" />
      </Trailer>
      <Tractor />
    </>
  ),
  flatbed: () => (
    <>
      <rect
        x="16"
        y="78"
        width="170"
        height="8"
        rx="2"
        className={cn("fill-cream/20", OUTLINE)}
        strokeWidth="2"
      />
      <rect
        x="32"
        y="48"
        width="56"
        height="30"
        rx="2"
        className={cn(SOFT_FILL, OUTLINE)}
        strokeWidth="2"
      />
      <rect
        x="98"
        y="58"
        width="48"
        height="20"
        rx="2"
        className={cn(SOFT_FILL, OUTLINE)}
        strokeWidth="2"
      />
      {[48, 66, 116].map((x) => (
        <line
          key={x}
          x1={x}
          x2={x}
          y1={x === 116 ? 58 : 48}
          y2="78"
          className="stroke-orange"
          strokeWidth="2"
        />
      ))}
      <Wheel cx={48} />
      <Wheel cx={74} />
      <Tractor />
    </>
  ),
  "step-deck": () => (
    <>
      <polygon
        points="16,84 120,84 120,68 186,68 186,76 128,76 128,90 16,90"
        className={cn("fill-cream/20", OUTLINE)}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect
        x="30"
        y="36"
        width="82"
        height="48"
        rx="2"
        className={cn(SOFT_FILL, OUTLINE)}
        strokeWidth="2"
      />
      <line x1="52" x2="52" y1="36" y2="84" className="stroke-orange" strokeWidth="2" />
      <line x1="90" x2="90" y1="36" y2="84" className="stroke-orange" strokeWidth="2" />
      <Wheel cx={48} cy={96} />
      <Wheel cx={74} cy={96} />
      <Tractor />
    </>
  ),
  "power-only": () => (
    <>
      <Tractor x={122} />
      <rect x="108" y="78" width="46" height="8" rx="2" className="fill-orange" />
      <path d="M131 70 V78" className="stroke-orange" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="131" cy="66" r="4" className="fill-none stroke-orange" strokeWidth="2.5" />
    </>
  ),
  "box-truck": () => (
    <>
      <rect
        x="24"
        y="26"
        width="150"
        height="62"
        rx="4"
        className={cn(SOFT_FILL, OUTLINE)}
        strokeWidth="2"
      />
      {[44, 54, 64, 74].map((y) => (
        <line
          key={y}
          x1="34"
          x2="66"
          y1={y}
          y2={y}
          className="stroke-orange/80"
          strokeWidth="1.5"
        />
      ))}
      <path
        d="M178 88 V46 Q178 40 184 40 H206 Q212 40 216 46 L232 64 V88 Z"
        className={cn(SOFT_FILL, OUTLINE)}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M186 47 H204 L214 60 H186 Z"
        className="fill-cream/10 stroke-cream/40"
        strokeWidth="1.5"
      />
      <rect x="20" y="86" width="216" height="5" rx="2" className="fill-cream/25" />
      <Wheel cx={60} />
      <Wheel cx={86} />
      <Wheel cx={206} />
    </>
  ),
  hotshot: () => (
    <>
      <rect
        x="20"
        y="74"
        width="190"
        height="6"
        rx="2"
        className={cn("fill-cream/20", OUTLINE)}
        strokeWidth="2"
      />
      <rect
        x="44"
        y="46"
        width="74"
        height="28"
        rx="2"
        className={cn(SOFT_FILL, OUTLINE)}
        strokeWidth="2"
      />
      <line x1="64" x2="64" y1="46" y2="74" className="stroke-orange" strokeWidth="2" />
      <line x1="98" x2="98" y1="46" y2="74" className="stroke-orange" strokeWidth="2" />
      <path d="M196 74 L226 62" className="stroke-orange" strokeWidth="2.5" strokeLinecap="round" />
      <Wheel cx={70} cy={90} />
      <Wheel cx={96} cy={90} />
      <path
        d="M214 88 V58 Q214 52 220 52 H246 Q252 52 256 58 L266 70 H292 Q298 70 298 76 V88 Z"
        className={cn(SOFT_FILL, OUTLINE)}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M222 58 H244 L252 68 H222 Z"
        className="fill-cream/10 stroke-cream/40"
        strokeWidth="1.5"
      />
      <Wheel cx={238} />
      <Wheel cx={282} />
    </>
  ),
};

interface EquipmentIllustrationProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  slug: EquipmentSlug;
}

export function EquipmentIllustration({ slug, className, ...props }: EquipmentIllustrationProps) {
  const Drawing = illustrations[slug];
  return (
    <svg
      viewBox="0 0 320 112"
      fill="none"
      aria-hidden="true"
      className={cn("h-full w-full", className)}
      {...props}
    >
      <Drawing />
    </svg>
  );
}
