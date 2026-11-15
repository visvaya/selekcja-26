import React from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./ui/error-boundary.tsx";
import { GameApp } from "./ui/game-app.tsx";
// The web fonts (latin and latin-ext faces of both families) and their fallback faces.
import "./ui/styles/fonts.css";
import "./ui/styles/tokens.css";
import "./ui/styles/base.css";
import "./ui/styles/hint.css";
import "./ui/styles/undo-toast.css";
import "./ui/styles/topbar.css";
import "./ui/styles/pitch.css";
import "./ui/styles/board.css";
import "./ui/styles/phone-board.css";
import "./ui/styles/dialogs.css";
import "./ui/styles/profile-compare.css";
import "./ui/styles/start.css";
import "./ui/styles/list.css";
import "./ui/styles/filters.css";
import "./ui/styles/range-field.css";
import "./ui/styles/player-strip.css";
import "./ui/styles/legacy.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GameApp />
    </ErrorBoundary>
  </React.StrictMode>,
);
