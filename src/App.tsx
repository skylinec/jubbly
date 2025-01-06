import React, { useEffect } from "react";
import "./App.css";
import JobApplicationTable from "./components/JobApplicationTable/JobApplicationTable";
import PageHeader from "./components/PageHeader/PageHeader";
import { BrowserRouter as Router } from "react-router-dom";
import { useDarkMode } from "./hooks/useDarkMode";
import AppRoutes from "./routes/AppRoutes";
import { ModalProvider } from "./context/ModalContext";
import { ApplicationProvider } from "./context/ApplicationContext";

const App: React.FC = () => {
  const [darkMode, toggleDarkMode] = useDarkMode();

  useEffect(() => {
    const root = document.documentElement;
    root.className = darkMode ? "dark-theme" : "light-theme";
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <ModalProvider>
      <ApplicationProvider>
        <Router>
          <div className="App">
            <PageHeader darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />
            <AppRoutes darkMode={darkMode} />
          </div>
        </Router>
      </ApplicationProvider>
    </ModalProvider>
  );
};

export default App;
