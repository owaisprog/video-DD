import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./theme.tsx";
import { AuthProvider } from "./context/auth-context.tsx";
import { LoadingProvider } from "./context/loading-context.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <LoadingProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LoadingProvider>
    </ThemeProvider>
  </StrictMode>,
);
