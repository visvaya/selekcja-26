import React from "react";
import { createRoot } from "react-dom/client";
import { GameApp } from "./ui/game-app.tsx";
import "./ui/styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GameApp />
  </React.StrictMode>,
);
