import { GAME_VERSION } from "../data/changelog.ts";
import { UI_TEXT as text } from "./text.ts";

export function AppHeader({
  phase,
  inert = false,
}: {
  phase: string;
  inert?: boolean;
}) {
  return (
    <header className="topbar" inert={inert}>
      <div className="topbar-inner">
        <div className="brand-group">
          <div className="brand">
            <span className="brand-mark">26</span> {text.brand}
          </div>
          <span className="topbar-version">
            <span aria-hidden="true">{text.topBarVersion(GAME_VERSION)}</span>
            <span className="visually-hidden">
              {text.topBarVersionAccessible(GAME_VERSION)}
            </span>
          </span>
        </div>
        <div className="phase-group">
          <span className="phase-label">{text.phaseLabel}</span>
          <div className="phase">{phase}</div>
        </div>
      </div>
    </header>
  );
}
