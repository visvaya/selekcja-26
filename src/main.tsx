import React from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./ui/error-boundary.tsx";
import { GameApp } from "./ui/game-app.tsx";
// The variable weight axis only (the same file the mockup loads as index.css). Each package
// declares latin, latin-ext and vietnamese faces with unicode-range, so a browser downloads
// only the subsets the page uses: latin and latin-ext for Polish.
import "@fontsource-variable/pathway-extreme/wght.css";
import "@fontsource-variable/commissioner/wght.css";
import "./ui/styles/tokens.css";
import "./ui/styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GameApp />
    </ErrorBoundary>
  </React.StrictMode>,
);
