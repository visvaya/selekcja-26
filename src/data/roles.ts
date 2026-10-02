import type { RoleId } from "./types.ts";

// Every RoleId, compile-time complete: a missing or unknown key fails the type check.
const ROLE_SET: Readonly<Record<RoleId, true>> = Object.freeze({
  aerial: true,
  ballPlaying: true,
  ballWinning: true,
  boxPresence: true,
  buildUp: true,
  centreBack: true,
  dribbling: true,
  experience: true,
  leader: true,
  leftFoot: true,
  linkUp: true,
  longShots: true,
  pace: true,
  playmaker: true,
  potential: true,
  pressing: true,
  reach: true,
  reflexes: true,
  rightBack: true,
  setPieces: true,
  striker: true,
  winger: true,
  wingBack: true,
});

export const ROLE_IDS: readonly RoleId[] = Object.freeze(
  Object.keys(ROLE_SET) as RoleId[],
);
