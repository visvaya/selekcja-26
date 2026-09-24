import { GAME_VERSION } from "../data/changelog.ts";
import { UI_TEXT as text } from "./text.ts";

export function AppHeader({ phase }: { phase: string }) {
  return (
    <header className="topbar">
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
        <div className="phase">{phase}</div>
      </div>
    </header>
  );
}
