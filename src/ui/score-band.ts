import { UI_CONFIG } from "./ui-config.ts";

export type ScoreBand = "high" | "mid" | "low";

export function scoreBand(value: number): ScoreBand {
  if (value >= UI_CONFIG.scoreBandHighMinimumPoints) return "high";
  if (value >= UI_CONFIG.scoreBandMidMinimumPoints) return "mid";
  return "low";
}
