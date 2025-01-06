import React from 'react';
import { Routes, Route } from 'react-router-dom';
import JobApplicationTable from '../components/JobApplicationTable/JobApplicationTable';
import InterviewCalendar from '../components/InterviewCalendar/InterviewCalendar';

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
    </Routes>
  );
};

export default AppRoutes;
