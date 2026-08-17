import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { AppProviders } from "./app/providers.js";
import { router } from "./app/router.js";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("missing #root mount point");
}

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
