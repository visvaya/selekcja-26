import React from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./ui/error-boundary.tsx";
import { GameApp } from "./ui/game-app.tsx";
import "./ui/styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GameApp />
    </ErrorBoundary>
  </React.StrictMode>,
);
