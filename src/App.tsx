import React, { useState, useEffect } from "react";
import "./App.css";
import JobApplicationTable from "./components/JobApplicationTable/JobApplicationTable";
import PageHeader from "./components/PageHeader/PageHeader";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { useDarkMode } from "./hooks/useDarkMode";
import AppRoutes from "./routes/AppRoutes";
import { ModalProvider, useModalContext } from "./context/ModalContext";

const App: React.FC = () => {
  const [darkMode, toggleDarkMode] = useDarkMode();

  const [showAddApplicationModal, setShowAddApplicationModal] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.className = darkMode ? "dark-theme" : "light-theme";
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleShowAddApplicationModal = () => {
    setShowAddApplicationModal(true);
  };

  const handleCloseAddApplicationModal = () => {
    setShowAddApplicationModal(false);
  };

  return (
    <ModalProvider>
      <Router>
        <div className="App">
          <PageHeader
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
          />
          <AppRoutes showAddApplicationModal={showAddApplicationModal}
            onCloseAddApplicationModal={handleCloseAddApplicationModal}
            darkMode={darkMode} />
        </div>
      </Router>
    </ModalProvider>
  );
};

export default App;
