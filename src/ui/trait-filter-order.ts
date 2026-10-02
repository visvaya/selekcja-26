import type { RoleId } from "../data/types.ts";

// Trait checkboxes in the detailed filters panel, in display order. The lead foot
// (`leftFoot`) has its own fieldset and is not offered as a trait.
export const TRAIT_FILTER_ORDER: readonly Exclude<RoleId, "leftFoot">[] =
  Object.freeze([
    "centreBack",
    "buildUp",
    "ballWinning",
    "leader",
    "setPieces",
    "playmaker",
    "pressing",
    "striker",
    "linkUp",
    "wingBack",
    "winger",
    "pace",
    "reflexes",
    "experience",
    "reach",
    "boxPresence",
    "aerial",
    "ballPlaying",
    "dribbling",
    "longShots",
    "potential",
    "rightBack",
  ]);
