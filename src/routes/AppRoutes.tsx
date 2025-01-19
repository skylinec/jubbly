import React from 'react';
import { Routes, Route } from 'react-router-dom';
import JobApplicationTable from '../components/JobApplicationTable/JobApplicationTable';
import InterviewCalendar from '../components/InterviewCalendar/InterviewCalendar';
import ScorecardPage from "../pages/ScorecardPage";

interface AppRoutesProps {
  darkMode: boolean;
}

const AppRoutes: React.FC<AppRoutesProps> = ({ darkMode }) => {
  return (
    <Routes>
      <Route path="/" element={<JobApplicationTable darkMode={darkMode} />} />
      <Route 
        path="/calendar" 
        element={<InterviewCalendar darkMode={darkMode} />} 
      />
      <Route
        path="/scorecard"
        element={<ScorecardPage />}
      />
    </Routes>
  );
};

export default AppRoutes;
