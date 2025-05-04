import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeDefaultScenario } from "./lib/defaultScenarios";

// Initialize the default scenario in local storage
initializeDefaultScenario();

createRoot(document.getElementById("root")!).render(<App />);
