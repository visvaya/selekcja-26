import type { CSSProperties } from "react";
import { GAME_RULES } from "../data/constants.ts";
import { scoreBand } from "./score-band.ts";

// One rating bar, shared by the strip and the profile: tinted by the value's band, named
// "Label: value" for assistive technology.
export function Meter({ label, value }: { label: string; value: number }) {
  return (
    <progress
      className="meter"
      style={{ "--tint": `var(--meter-${scoreBand(value)})` } as CSSProperties}
      value={value}
      max={GAME_RULES.ratingMaximumPoints}
      aria-label={`${label}: ${value}`}
    />
  );
}
