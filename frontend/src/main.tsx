import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { useAuthStore } from "@/store/authStore";
import "./index.css";

useAuthStore.getState().hydrate();

registerSW({
  immediate: true,
  onNeedRefresh() {
    // Auto-update is enabled via registerType: autoUpdate
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
