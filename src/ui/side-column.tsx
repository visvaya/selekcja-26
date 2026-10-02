import type { ReactNode } from "react";
import type { GameState } from "../data/types.ts";
import { Kpis } from "./game-head.tsx";

// Desktop side column (from 1024 px): the squad indicators above the game actions.
export function SideColumn({
  state,
  children,
}: {
  state: GameState;
  children: ReactNode;
}) {
  return (
    <aside className="dock-side">
      <Kpis state={state} className="kpis-side" />
      {children}
    </aside>
  );
}
