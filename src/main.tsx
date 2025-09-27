import React from "react";
import { createRoot } from "react-dom/client";
// App.tsx está en la RAÍZ del repo:
import App from "../App";

const el = document.getElementById("root")!;
createRoot(el).render(<App />);
