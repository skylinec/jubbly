import React, { createContext, useContext, useState, useEffect } from 'react';
import { useModalContext } from './ModalContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { JobApplication } from '../types/jobApplication';

const API_URL = "http://10.0.0.101:5000/applications";

interface ApplicationContextProps {
  handleAddApplication: () => void;
  newApplication: JobApplication;
  setNewApplication: React.Dispatch<React.SetStateAction<JobApplication>>;
  handleSaveNewApplication: () => Promise<void>;
  allApplications: JobApplication[];
  loading: boolean;
  refreshApplications: () => Promise<void>;
}

export const ApplicationContext = createContext<ApplicationContextProps | undefined>(undefined);

export const ApplicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { openAddApplicationModal, closeAddApplicationModal } = useModalContext();
  const [newApplication, setNewApplication] = useState<JobApplication>({
    employer: "",
    jobTitle: "",
    cityTown: "",
    year: new Date().getFullYear(),
    generalRole: "",
    jobLevel: "",
    dateAppNotif: new Date().toISOString().split("T")[0],
    lastUpdate: new Date().toISOString().split("T")[0],
    daNow: 0,
    daLu: 0,
    luNow: 0,
    upcomingInterviewDate: undefined,
    lastCompletedStage: "Applied",
    notes: "",
    external: "No",
    jobDescription: "",
    companyWebsite: "",
    roleLink: "",
    sector: "",
  });

  const [allApplications, setAllApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshApplications = async () => {
    try {
      const response = await axios.get(API_URL);
      const formattedData: JobApplication[] = response.data.map(
        (application: any, index: number) => ({
          id: application.id || application._id || index,
          employer: application.employer || "",
          jobTitle: application.job_title || "",
          cityTown: application.city_town || "",
          year: application.year || new Date().getFullYear(),
          generalRole: application.general_role || "",
          jobLevel: application.job_level || "",
          dateAppNotif: application.date_app_notif || "",
          lastUpdate: application.last_update || "",
          daNow: application.da_now || 0,
          daLu: application.da_lu || 0,
          luNow: application.lu_now || 0,
          upcomingInterviewDate: application.upcoming_interview_date || undefined,
          lastCompletedStage: application.last_completed_stage || "",
          notes: application.notes || "",
          external: application.external || "No",
          jobDescription: application.job_description || "",
          companyWebsite: application.company_website || "",
          roleLink: application.role_link || "",
          sector: application.sector || "",
        })
      );

      setAllApplications(formattedData);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshApplications();
  }, []);

  const handleAddApplication = () => {
    openAddApplicationModal();
  };

  const handleSaveNewApplication = async () => {
    try {
      const response = await axios.post(API_URL, newApplication);
      toast.success("Application saved successfully!");
      closeAddApplicationModal();
      await refreshApplications(); // Refresh all applications after adding new one

      // Reset form with all new fields
      setNewApplication({
        employer: "",
        jobTitle: "",
        cityTown: "",
        year: new Date().getFullYear(),
        generalRole: "",
        jobLevel: "",
        dateAppNotif: new Date().toISOString().split("T")[0],
        lastUpdate: new Date().toISOString().split("T")[0],
        daNow: 0,
        daLu: 0,
        luNow: 0,
        upcomingInterviewDate: undefined,
        lastCompletedStage: "Applied",
        notes: "",
        external: "No",
        jobDescription: "",
        companyWebsite: "",
        roleLink: "",
        sector: "",
        workType: "",
        contractType: "",
        salary: undefined,
        interviewHistory: [],
        contacts: [],
        applicationMethod: "",
      });

      return response.data;
    } catch (error) {
      toast.error("Failed to save application. Please try again.");
      throw error;
    }
  };

  return (
    <ApplicationContext.Provider value={{ 
      handleAddApplication, 
      newApplication, 
      setNewApplication,
      handleSaveNewApplication,
      allApplications,
      loading,
      refreshApplications
    }}>
      {children}
    </ApplicationContext.Provider>
  );
};

export const useApplicationContext = () => {
  const context = useContext(ApplicationContext);
  if (!context) {
    throw new Error('useApplicationContext must be used within an ApplicationProvider');
  }
  return context;
};

export default ApplicationContext;
