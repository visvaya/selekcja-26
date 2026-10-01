import { START_TEXT } from "./text/start.ts";
import { LIST_TEXT } from "./text/list.ts";
import { BOARD_TEXT } from "./text/board.ts";
import { DIALOGS_TEXT } from "./text/dialogs.ts";
import { REPORT_TEXT } from "./text/report.ts";
import { SYSTEM_TEXT } from "./text/system.ts";

// Every Polish string shown to the player, assembled from one module per screen or area.
export const UI_TEXT = {
  ...START_TEXT,
  ...LIST_TEXT,
  ...BOARD_TEXT,
  ...DIALOGS_TEXT,
  ...REPORT_TEXT,
  ...SYSTEM_TEXT,
} as const;
