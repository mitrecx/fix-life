import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { useAuthStore } from "@/store/authStore";
import "./index.css";

// Hydrate auth state from localStorage before app renders
useAuthStore.getState().hydrate();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
