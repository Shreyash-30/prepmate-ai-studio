import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupDevToken } from "./utils/devSetup";

// Initialize development authentication for testing
setupDevToken();

createRoot(document.getElementById("root")!).render(<App />);
