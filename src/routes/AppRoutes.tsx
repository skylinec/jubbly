import React from "react";
import { Routes, Route } from "react-router-dom";
import JobApplicationTable from "../components/JobApplicationTable/JobApplicationTable";

const AppRoutes: React.FC<{
  showAddApplicationModal: boolean;
  onCloseAddApplicationModal: () => void;
  darkMode: boolean;
}> = ({ showAddApplicationModal, onCloseAddApplicationModal, darkMode }) => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <JobApplicationTable
            showAddApplicationModal={showAddApplicationModal}
            onCloseAddApplicationModal={onCloseAddApplicationModal}
            darkMode={darkMode}
          />
        }
      />
      {/* Add more routes as needed */}
    </Routes>
  );
};

export default AppRoutes;
