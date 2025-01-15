import React, { createContext, useContext, useState, useEffect } from 'react';
import { useModalContext } from './ModalContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { JobApplication } from '../types/jobApplication';

const API_URL = "http://10.0.0.101:5000/applications";
const FILTER_CONFIG_URL = "http://10.0.0.101:5000/filter-configs"; // Add this line

// Add new interfaces for filter types
interface FilterOption {
  value: string;
  label: string;
  type: string;
}

interface FilterConfig {
  id: number;
  name: string;
  config: string;
}

interface SavedFilterConfig {
  filters: FilterOption[];
  dateRange: [Date | undefined, Date | undefined];
  hideNegativeOutcomes: boolean; // Updated name
  selectedStages: Array<{ value: string; label: string } | string>;
  searchQuery?: string;
}

interface ApplicationContextProps {
  handleAddApplication: () => void;
  newApplication: JobApplication;
  setNewApplication: React.Dispatch<React.SetStateAction<JobApplication>>;
  handleSaveNewApplication: () => Promise<void>;
  allApplications: JobApplication[];
  loading: boolean;
  refreshApplications: () => Promise<void>;
  saveFilterConfig: (name: string, config: any) => Promise<void>;
  loadFilterConfigs: () => Promise<any[]>;
  filterConfigs: FilterConfig[];
  selectedConfig: string;
  setSelectedConfig: React.Dispatch<React.SetStateAction<string>>;
  handleSaveFilterConfig: (name?: string) => Promise<void>;
  handleLoadFilterConfig: (config: SavedFilterConfig) => void;
  selectedFilters: FilterOption[];
  dateRange: [Date | undefined, Date | undefined];
  hideNegativeOutcomes: boolean;
  selectedStages: string[];
  setSelectedFilters: React.Dispatch<React.SetStateAction<FilterOption[]>>;
  setDateRange: React.Dispatch<React.SetStateAction<[Date | undefined, Date | undefined]>>;
  setHideNegativeOutcomes: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedStages: React.Dispatch<React.SetStateAction<string[]>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  showFilterModal: boolean;
  setShowFilterModal: React.Dispatch<React.SetStateAction<boolean>>;
  deleteFilterConfig: (id: number) => Promise<void>;
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

  // Filter-related states
  const [selectedFilters, setSelectedFilters] = useState<FilterOption[]>([]);
  const [dateRange, setDateRange] = useState<[Date | undefined, Date | undefined]>([undefined, undefined]);
  const [hideNegativeOutcomes, setHideNegativeOutcomes] = useState(false);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [filterConfigs, setFilterConfigs] = useState<FilterConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showFilterModal, setShowFilterModal] = useState(false);

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
          upcomingInterviewTime: application.upcoming_interview_time || "09:00", // Add default time
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

  // Add new effect to load filter configs on mount
  useEffect(() => {
    loadFilterConfigs().then(configs => {
      setFilterConfigs(configs);
    });
  }, []);

  const handleAddApplication = () => {
    openAddApplicationModal();
  };

  const handleSaveNewApplication = async () => {
    try {
      // Ensure time is included in new applications
      const applicationToSave = {
        ...newApplication,
        upcomingInterviewTime: newApplication.upcomingInterviewTime || 
          (newApplication.upcomingInterviewDate ? "09:00" : undefined)
      };

      const response = await axios.post(API_URL, applicationToSave);
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

  const saveFilterConfig = async (name: string, config: any) => {
    try {
      // Transform stages to consistent format
      const processedStages = config.selectedStages.map((stage: string | { value: string; label: string }) => {
        if (typeof stage === 'string') {
          return { value: stage, label: stage };
        }
        return stage;
      });
  
      // Sanitize config with explicit type handling
      const sanitizedConfig = {
        filters: config.filters.map((filter: any) => ({
          value: String(filter.value || ''),
          label: String(filter.label || filter.value || ''),
          type: String(filter.type || '')
        })),
        dateRange: config.dateRange ? [
          config.dateRange[0] ? config.dateRange[0].toISOString() : null,
          config.dateRange[1] ? config.dateRange[1].toISOString() : null
        ] : [null, null],
        hideNegativeOutcomes: Boolean(config.hideNegativeOutcomes),
        selectedStages: processedStages,
        searchQuery: String(config.searchQuery || '')
      };
  
      // Store stringified config
      await axios.post(FILTER_CONFIG_URL, { 
        name, 
        config: JSON.stringify(sanitizedConfig)
      });
      
      toast.success("Filter configuration saved successfully!");
    } catch (error) {
      console.error('Error saving filter config:', error);
      toast.error("Failed to save filter configuration.");
    }
  };

  const loadFilterConfigs = async () => {
    try {
      const response = await axios.get(FILTER_CONFIG_URL);
      return response.data;
    } catch (error) {
      toast.error("Failed to load filter configurations.");
      return [];
    }
  };

  const handleSaveFilterConfig = async (name?: string) => {
    try {
      const config: SavedFilterConfig = {
        filters: selectedFilters,
        dateRange,
        hideNegativeOutcomes,
        selectedStages,
        searchQuery: searchQuery
      };

      if (!name) {
        setShowFilterModal(true);
        return;
      }

      await saveFilterConfig(name, config);
      await loadFilterConfigs().then(configs => {
        setFilterConfigs(configs);
      });
      toast.success("Filter configuration saved successfully!");
    } catch (error) {
      toast.error("Failed to prepare filter configuration");
    }
  };

  const handleLoadFilterConfig = (config: SavedFilterConfig) => {
    try {
      console.log('Received in context:', config);

      // Reset all states first
      setSelectedFilters([]);
      setDateRange([undefined, undefined]);
      setHideNegativeOutcomes(false);
      setSelectedStages([]);
      setSearchQuery('');

      // Then set new values with proper type checking
      if (Array.isArray(config.filters)) {
        setSelectedFilters(config.filters.map(filter => ({
          value: String(filter.value),
          label: String(filter.label),
          type: String(filter.type)
        })));
      }

      if (Array.isArray(config.dateRange)) {
        const startDate = config.dateRange[0] ? new Date(config.dateRange[0]) : undefined;
        const endDate = config.dateRange[1] ? new Date(config.dateRange[1]) : undefined;
        setDateRange([
          startDate && !isNaN(startDate.getTime()) ? startDate : undefined,
          endDate && !isNaN(endDate.getTime()) ? endDate : undefined
        ]);
      }

      setHideNegativeOutcomes(Boolean(config.hideNegativeOutcomes));

      if (Array.isArray(config.selectedStages)) {
        const stages = config.selectedStages.map(stage => {
          if (typeof stage === 'object' && stage !== null && 'value' in stage) {
            return stage.value;
          }
          return String(stage);
        });
        setSelectedStages(stages);
      }

      if (typeof config.searchQuery === 'string') {
        setSearchQuery(config.searchQuery);
      }

      // Force a UI update by triggering a state change
      setTimeout(() => {
        toast.success('Filter configuration loaded successfully');
      }, 100);

    } catch (error) {
      console.error('Error loading filter config:', error);
      console.error('Problematic config:', config);
      toast.error('Failed to load filter configuration');
    }
  };

  const deleteFilterConfig = async (id: number) => {
    try {
      await axios.delete(`${FILTER_CONFIG_URL}/${id}`);
      const updatedConfigs = await loadFilterConfigs();
      setFilterConfigs(updatedConfigs);
      toast.success('Filter configuration deleted successfully');
    } catch (error) {
      console.error('Error deleting filter configuration:', error);
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
      refreshApplications,
      saveFilterConfig,
      loadFilterConfigs,
      filterConfigs,
      selectedConfig,
      setSelectedConfig,
      selectedFilters,
      dateRange,
      hideNegativeOutcomes,
      selectedStages,
      setSelectedFilters,
      setDateRange,
      setHideNegativeOutcomes,
      setSelectedStages,
      handleSaveFilterConfig,
      handleLoadFilterConfig,
      searchQuery,
      setSearchQuery,
      showFilterModal,
      setShowFilterModal,
      deleteFilterConfig,
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

// ...existing code...

interface FilterConfigModalProps {
  show: boolean;
  onHide: () => void;
  filterConfigs: FilterConfig[];
  onSave: (name: string, config: any) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onLoadConfig: (config: SavedFilterConfig) => void; // Add this line
  currentConfig: {
    filters: any[];
    dateRange: [Date | undefined, Date | undefined];
    hideNegativeOutcomes: boolean;
    selectedStages: string[];
    searchQuery?: string;
  };
}

// ...existing code...
