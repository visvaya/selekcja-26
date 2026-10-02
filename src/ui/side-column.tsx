import type { ReactNode } from "react";
import type { GameState } from "../data/types.ts";
import { Kpis } from "./game-head.tsx";

// Desktop side column (from 1024 px): the squad indicators, the board and the game
// actions. Not a landmark: the board inside it is the named region.
export function SideColumn({
  state,
  board,
  children,
}: {
  state: GameState;
  board: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="dock-side">
      <Kpis state={state} className="kpis-side" />
      {board}
      {children}
    </div>
  );
}
