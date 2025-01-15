import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import {
  Table,
  Container,
  Form,
  Button,
  InputGroup,
  Modal,
  Card,
  Col,
  Row,
} from "react-bootstrap";
import DatePicker from "react-datepicker";
import Select from "react-select";
import "react-datepicker/dist/react-datepicker.css";
import "./JobApplicationTable.css";

import {
  FaPencilAlt,
  FaTrash,
  FaSortAlphaDown,
  FaSortAlphaUp,
} from "react-icons/fa";
import axios from "axios";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { useNavigate, useLocation } from "react-router-dom";

import { useModalContext } from "../../context/ModalContext";
import { useApplicationContext } from "../../context/ApplicationContext";

import StatisticsModal from "../StatisticsModal/StatisticsModal"; // Adjust the path as needed
import FilterConfigModal from "../FilterConfigModal/FilterConfigModal"; // Add to the imports at the top

import { JobApplication } from "../../types/jobApplication";
import { Company } from "../../types/company";

// Remove the local JobApplication interface definition
interface JobApplicationTableProps {
  darkMode: boolean;
}

function combineRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref && typeof ref === "object" && ref.current !== undefined) {
        (ref as React.MutableRefObject<T | null>).current = node;
      }
    });
  };
}

const API_URL = "http://10.0.0.101:5000/applications";

const jobStatuses = [
  "Applied",
  "Recruiter Conversation/Screening",
  "Online Assessment",
  "In-Person Assessment",
  "Interview Offered",
  "Interview 1",
  "Interview 2",
  "Interview 3",
  "Offer",
  "Offer Accepted",
  "Offer Declined",
  "Ghosted",
  "Rejected",
  "Dropped Out",
];

const statusColors: { [key: string]: string } = {
  // Initial Application Stage - Soft Blues
  Applied: "#f0f4f8",
  "Recruiter Conversation/Screening": "#90caf9",

  // Assessment Stage - Muted Purples
  "Online Assessment": "#ce93d8",
  "In-Person Assessment": "#b39ddb",

  // Interview Stage - Warm to Cool progression
  "Interview Offered": "#ffcc80",
  "Interview 1": "#fff176",
  "Interview 2": "#a5d6a7",
  "Interview 3": "#80cbc4",

  // Offer Stage - Greens
  "Offer": "#81c784",
  "Offer Accepted": "#66bb6a",
  "Offer Declined": "#ef9a9a",

  // Negative Outcomes - Soft Reds
  "Ghosted": "#ff8a65",
  "Rejected": "#e57373",
  "Dropped Out": "#ffab91",

  // Other
  "Other (Custom)": "#b0bec5",
};

const jobLevelOptions = [
  { value: "Internship", label: "Internship" },
  { value: "Junior/Entry", label: "Junior/Entry" },
  { value: "Graduate", label: "Graduate" },
  { value: "Mid-Level", label: "Mid-Level" },
  { value: "Senior", label: "Senior" },
];

const generalRoleOptions = [
  { value: "Software Developer", label: "Software Developer" },
  { value: "DevOps Engineer", label: "DevOps Engineer" },
  { value: "Solution Engineer", label: "Solution Engineer" },
  { value: "Consultant", label: "Consultant" },
  { value: "Analyst", label: "Analyst" },
  { value: "Data Scientist", label: "Data Scientist" },
  { value: "Other", label: "Other" },
];

const fieldMapping: { [key: string]: string } = {
  jobTitle: "job_title",
  cityTown: "city_town",
  generalRole: "general_role",
  jobLevel: "job_level",
  dateAppNotif: "date_app_notif",
  lastUpdate: "last_update",
  daNow: "da_now",
  daLu: "da_lu",
  luNow: "lu_now",
  upcomingInterviewDate: "upcoming_interview_date",
  lastCompletedStage: "last_completed_stage",
  jobDescription: "job_description",
  companyWebsite: "company_website",
  roleLink: "role_link",
  external: "external",
};

const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 61 }, (_, i) => ({
    value: currentYear - 50 + i,
    label: (currentYear - 50 + i).toString(),
  }));
};

const yearOptions = generateYearOptions();

/**
 * An interface that both JobApplication and Company can satisfy:
 * - 'name': the fallback domain name
 * - 'companyWebsite': an optional URL
 */
interface HasWebsiteAndName {
  name: string;
  companyWebsite?: string;
}

/**
 * If the string doesn't start with http(s), prepend 'https://'
 */
function normalizeURL(urlString: string): string {
  if (urlString && !/^https?:\/\//i.test(urlString)) {
    return `https://${urlString}`;
  }
  return urlString;
}

/**
 * A generic favicon fetcher that works for any object
 * with 'name' and optionally 'companyWebsite'.
 */
export function fetchFavicon<T extends HasWebsiteAndName>(obj: T): string {
  try {
    // 1. Try using companyWebsite if present
    if (obj.companyWebsite) {
      const domainString = normalizeURL(obj.companyWebsite);
      try {
        const url = new URL(domainString);
        return `https://www.google.com/s2/favicons?sz=64&domain=${url.hostname}`;
      } catch (e) {
        console.error("Invalid URL:", domainString, e);
      }
    }

    // 2. Try with company name
    const normalizedName = obj.name.replace(/\s+/g, "").toLowerCase();

    // 3. Return a default favicon if everything fails
    return (
      `https://www.google.com/s2/favicons?sz=64&domain=${normalizedName}.com` ||
      "/default-favicon.png"
    ); // Add a default favicon in your public folder
  } catch (error) {
    console.error("Error fetching favicon:", error);
    return "/default-favicon.png"; // Fallback to default
  }
}

const getDefaultValue = {
  string: (value?: string) => value || "",
  number: (value?: number) => value ?? 0,
  date: (value?: string) => value || new Date().toISOString().split("T")[0],
};

const JobApplicationTable: React.FC<JobApplicationTableProps> = ({
  darkMode,
}) => {
  const { showAddApplicationModal, closeAddApplicationModal } =
    useModalContext();
  const {
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
    handleSaveFilterConfig,
    selectedFilters,
    dateRange,
    hideNegativeOutcomes,
    setHideNegativeOutcomes,
    selectedStages,
    setSelectedFilters,
    setDateRange,
    setSelectedStages,
    searchQuery,
    setSearchQuery,
    deleteFilterConfig,
  } = useApplicationContext();

  const location = useLocation();
  const navigate = useNavigate();

  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  const tableRef = useRef<HTMLTableElement | null>(null); // Ref for the table element
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<JobApplication>>({});
  // const [searchTerm, setSearchTerm] = useState("");
  // const [filter, setFilter] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof JobApplication | null;
    direction: "asc" | "desc";
  }>({
    key: null,
    direction: "asc",
  });

  // Add these at the top with other useRefs
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const initialOffset = useRef<number | null>(null);

  // Add these with other useState declarations
  const [isSticky, setIsSticky] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [suggestions, setSuggestions] = useState<
    { value: string; label: string; type: string }[]
  >([]);
  const [activeField, setActiveField] = useState<keyof JobApplication | null>(
    null
  );
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [selectedApplication, setSelectedApplication] =
    useState<JobApplication | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [modalEditMode, setModalEditMode] = useState(false);

  interface CompanyLike {
    name: string;
    companyWebsite?: string;
    applicationCount: number;
  }

  const [companies, setCompanies] = useState<Company[]>([]);

  const [currentDataType, setCurrentDataType] = useState<
    "applications" | "companies"
  >("applications");
  // Already have viewMode for "table" | "cards":
  // const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [allSuggestions, setAllSuggestions] = useState<
    { value: string; label: string; type: string }[]
  >([]);

  interface FilterOption {
    value: string;
    label: string;
    type: string;
  }

  const searchSelectRef = useRef<any>(null); // React-select uses 'any' for its ref
  const searchRef = useRef<any>(null); // React-select uses 'any' for its ref

  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const editingRef = useRef<HTMLElement | null>(null);
  const [buttonPosition, setButtonPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [useFilteredData, setUseFilteredData] = useState(false);

  const handleBlur = () => {
    setIsSearchFocused(false);
  };

  useEffect(() => {
    if (editingRow && editingRef.current) {
      const rect = editingRef.current.getBoundingClientRect();
      setButtonPosition({ top: rect.bottom + window.scrollY, left: rect.left });
    } else {
      setButtonPosition(null); // Reset position when editing ends
    }
  }, [editingRow]);

  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const [allJobApplications, setAllJobApplications] = useState<
    JobApplication[]
  >([]);

  // const [useFilteredData, setUseFilteredData] = useState(false);

  // const onChange = (event) => {
  //   setUseFilteredData(event.target.checked);
  // };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;

      // Check if the active element is an input, textarea, or a part of react-select
      const isInteractiveElementFocused =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.classList.contains("react-select__control") ||
        activeElement?.closest(".react-select__menu"); // React-Select dropdown menu

      // If `Enter` is pressed while an interactive element is focused, prevent default "Edit" action
      if (event.key === "Enter" && isInteractiveElementFocused) {
        return; // Skip the default behavior
      }

      // Global shortcuts
      if (!isInteractiveElementFocused) {
        switch (event.key.toLowerCase()) {
          case "n":
            event.preventDefault(); // Prevent browser default (if any)
            handleAddRow(); // Trigger the add and edit logic
            break;
          case "s":
            if (searchRef.current) {
              (activeElement as HTMLElement)?.blur();
              setTimeout(() => {
                searchRef.current.focus();
              }, 0);
            }
            break;
          case "f":
            if (searchSelectRef.current) {
              // Temporarily blur active element
              (activeElement as HTMLElement)?.blur();
              setTimeout(() => {
                searchSelectRef.current.focus(); // Focus the filter search field
              }, 0); // Use 0 delay to execute focus after blur
            }
            break;
          case "a":
            // event.preventDefault();
            setCurrentDataType("applications");
            break;
          case "e":
            // event.preventDefault();
            setCurrentDataType("companies");
            break;
          case "g":
            event.preventDefault();
            setHideNegativeOutcomes((prev) => !prev);
            break;
          case "t":
            // event.preventDefault();
            setViewMode("table");
            break;
          case "c":
            // event.preventDefault();
            setViewMode("cards");
            break;
          case "?":
            // event.preventDefault();
            setShowShortcutsModal(true);
            break;
          default:
            break;
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Hide shortcuts modal when '?' key is released
      if (event.key === "?") {
        setShowShortcutsModal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    searchRef,
    searchSelectRef,
    setCurrentDataType,
    setHideNegativeOutcomes,
    setViewMode,
    setShowShortcutsModal,
  ]);

  useEffect(() => {
    const handleAddApplicationEvent = () => {
      handleAddRow();
    };

    window.addEventListener("addApplication", handleAddApplicationEvent);
    return () => {
      window.removeEventListener("addApplication", handleAddApplicationEvent);
    };
  }, []); // Add necessary dependencies if handleAddRow uses any state

  const handleFocus = () => {
    setIsSearchFocused(true);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (searchContainerRef.current) {
        // Record the initial offset on the first scroll event
        if (initialOffset.current === null) {
          initialOffset.current =
            searchContainerRef.current.getBoundingClientRect().top +
            window.scrollY;
        }

        // Calculate the current scroll position relative to the initial offset
        const currentScrollPosition = window.scrollY;
        const shouldBeSticky = currentScrollPosition >= initialOffset.current;

        // Update sticky state only when it changes
        if (shouldBeSticky !== isSticky) {
          setIsSticky(shouldBeSticky);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isSticky]);

  const [groupedFilters, setGroupedFilters] = useState<
    Record<string, string[]>
  >({});

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const filtersFromURL = params.get("filters");
    if (filtersFromURL) {
      try {
        const parsedFilters: FilterOption[] = JSON.parse(
          decodeURIComponent(filtersFromURL)
        );
        setSelectedFilters(parsedFilters);

        // Group filters for internal use
        const groupedFilters = parsedFilters.reduce<Record<string, string[]>>(
          (acc, filter) => {
            if (!acc[filter.type]) acc[filter.type] = [];
            acc[filter.type].push(filter.value.toLowerCase());
            return acc;
          },
          {}
        );
        setGroupedFilters(groupedFilters);
      } catch (e) {
        console.error("Failed to parse filters from URL:", e);
      }
    }

    // Handle other parameters (view mode, data type, etc.)
    const viewModeFromURL = params.get("viewMode");
    if (viewModeFromURL) setViewMode(viewModeFromURL as "table" | "cards");

    const dataTypeFromURL = params.get("dataType");
    if (dataTypeFromURL)
      setCurrentDataType(dataTypeFromURL as "applications" | "companies");

    const startDateParam = params.get("startDate");
    const endDateParam = params.get("endDate");
    setDateRange([
      startDateParam ? new Date(startDateParam) : undefined,
      endDateParam ? new Date(endDateParam) : undefined,
    ]);

    const hideNegativeOutcomesFromURL = params.get("hideNegativeOutcomes");
    setHideNegativeOutcomes(hideNegativeOutcomesFromURL === "true");
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (selectedFilters.length > 0) {
      params.set(
        "filters",
        encodeURIComponent(JSON.stringify(selectedFilters))
      );
    }

    params.set("viewMode", viewMode);
    params.set("dataType", currentDataType);
    params.set("hideNegativeOutcomes", hideNegativeOutcomes.toString());

    if (dateRange[0]) {
      params.set("startDate", dateRange[0].toISOString().split("T")[0]);
    } else {
      params.delete("startDate");
    }

    if (dateRange[1]) {
      params.set("endDate", dateRange[1].toISOString().split("T")[0]);
    } else {
      params.delete("endDate");
    }

    navigate({ search: params.toString() }, { replace: true });
  }, [
    selectedFilters,
    viewMode,
    currentDataType,
    hideNegativeOutcomes,
    dateRange,
    navigate,
  ]);

  useEffect(() => {
    setJobApplications(allApplications);
  }, [allApplications]);

  useEffect(() => {
    const updateButtonPosition = () => {
      if (editingRow !== null && editingRef.current && tableRef.current) {
        const editingRect = editingRef.current.getBoundingClientRect();
        const tableRect = tableRef.current.getBoundingClientRect();

        setButtonPosition({
          top: editingRect.bottom - tableRect.top + window.scrollY + 5, // 5px below the row
          left: editingRect.right - tableRect.left + window.scrollX + 10, // 10px to the right of the cell
        });
      } else {
        setButtonPosition(null); // Reset position when no row is being edited
      }
    };

    window.addEventListener("scroll", updateButtonPosition);
    window.addEventListener("resize", updateButtonPosition);

    // Trigger initial position calculation
    updateButtonPosition();

    return () => {
      window.removeEventListener("scroll", updateButtonPosition);
      window.removeEventListener("resize", updateButtonPosition);
    };
  }, [editingRow, editingRef, tableRef]);

  const handleLoadFilterConfig = (config: any) => {
    const {
      filters,
      dateRange,
      hideNegativeOutcomes,
      selectedStages,
      searchQuery,
    } = config;

    setSelectedFilters(filters);
    setDateRange(
      dateRange
        ? [
            dateRange[0] ? new Date(dateRange[0]) : undefined,
            dateRange[1] ? new Date(dateRange[1]) : undefined,
          ]
        : [undefined, undefined]
    );
    setHideNegativeOutcomes(hideNegativeOutcomes);
    setSelectedStages(selectedStages);
    setSearchQuery(searchQuery || "");

    toast.success("Filter configuration loaded successfully");
  };

  const handleFilterChange = (filters: FilterOption[]) => {
    const groupedFilters = filters.reduce<Record<string, string[]>>(
      (acc, filter) => {
        if (!acc[filter.type]) acc[filter.type] = [];
        if (!acc[filter.type].includes(filter.value.toLowerCase())) {
          acc[filter.type].push(filter.value.toLowerCase());
        }
        return acc;
      },
      {}
    );

    // Store grouped filters alongside the raw filters
    setSelectedFilters(filters); // Raw selected filters
    setGroupedFilters(groupedFilters); // Store grouped filters if state exists

    console.log("Grouped Filters:", groupedFilters); // Debugging
  };

  const handleViewModeChange = (mode: "table" | "cards") => {
    setViewMode(mode); // Update the state
  };

  const handleDataTypeChange = (type: "applications" | "companies") => {
    setCurrentDataType(type); // Update the state
  };

  const filterByCompany = (companyName: string) => {
    // Add the Employer filter
    const newFilters = [
      ...selectedFilters.filter((filter) => filter.type !== "Employer"), // Remove existing Employer filters
      { value: companyName, label: companyName, type: "Employer" }, // Add the new Employer filter
    ];

    // Update the filters and navigate
    handleFilterChange(newFilters); // Updates groupedFilters and selectedFilters
    setCurrentDataType("applications"); // Ensure view switches to Applications
    toast.info(`Filter updated to show applications for: ${companyName}`, {
      position: "top-center",
    });
  };

  const handleEditChange = (field: keyof JobApplication, value: any) => {
    setEditValues((prev) => ({
      ...prev,
      [field]: value ?? "", // Ensure empty strings are allowed
    }));
  };

  const [editingRowOriginalIndex, setEditingRowOriginalIndex] = useState<
    number | null
  >(null);

  const handleEditRow = (id: number) => {
    const application = jobApplications.find((app) => app.id === id);
    if (application) {
      setEditingRow(id);
      setEditValues({ ...application });
    }
  };

  const updateLastUpdatedToToday = (id: number) => {
    const today = new Date().toISOString().split("T")[0];

    // Update local edit values for the specific application
    setEditValues((prev) => ({
      ...prev,
      lastUpdate: today,
    }));

    toast.info("Last updated date set to today. Click Save to confirm.", {
      position: "top-center",
    });
  };

  // Add this function near your other utility functions
  const ensureValidDateTime = (
    dateString: string | undefined
  ): string | undefined => {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return undefined;
    // Set default time to 9 AM if no time is specified
    if (date.getHours() === 0) {
      date.setHours(9, 0, 0);
    }
    return date.toISOString();
  };

  const handleSaveApplication = async (
    application: JobApplication | Partial<JobApplication>,
    isNew: boolean = false
  ) => {
    try {
      const updatedApplication = {
        ...application,
        upcomingInterviewTime:
          application.upcomingInterviewTime ||
          (application.upcomingInterviewDate ? "09:00" : null),
      };

      const response = isNew
        ? await axios.post(API_URL, updatedApplication)
        : await axios.put(
            `${API_URL}/${updatedApplication.id}`,
            updatedApplication
          );

      const savedApplication = {
        ...updatedApplication,
        id: isNew ? response.data.id : updatedApplication.id!,
      };

      // Update the job applications state
      setJobApplications((prev) =>
        isNew
          ? [...prev, savedApplication as JobApplication]
          : prev.map((app) =>
              app.id === savedApplication.id
                ? (savedApplication as JobApplication)
                : app
            )
      );

      await refreshApplications();
      setEditingRow(null);
      toast.success(`Application ${isNew ? "added" : "updated"} successfully!`);
    } catch (error) {
      console.error("Error saving application:", error);
      toast.error("Failed to save application. Please try again.");
    }
  };

  const handleModalSave = () => {
    handleSaveApplication(selectedApplication!);

    setShowInfoModal(false);
  };
  const handleSaveRow = () =>
    handleSaveApplication(editValues as JobApplication);

  // const handleSaveApplication = async () => {
  //   try {
  //     const response = await axios.post(API_URL, newApplication);

  //     const completeApplication: JobApplication = {
  //       id: response.data.id,
  //       employer: newApplication.employer || "", // Default to an empty string
  //       jobTitle: newApplication.jobTitle || "",
  //       cityTown: newApplication.cityTown || "",
  //       year: new Date().getFullYear(),
  //       generalRole: newApplication.generalRole || "",
  //       jobLevel: newApplication.jobLevel || "",
  //       dateAppNotif:
  //         newApplication.dateAppNotif || new Date().toISOString().split("T")[0],
  //       lastUpdate:
  //         newApplication.lastUpdate || new Date().toISOString().split("T")[0],
  //       daNow: newApplication.daNow || 0,
  //       daLu: newApplication.daLu || 0,
  //       luNow: newApplication.luNow || 0,
  //       upcomingInterviewDate: newApplication.upcomingInterviewDate,
  //       lastCompletedStage: newApplication.lastCompletedStage || "Applied",
  //       notes: newApplication.notes || "",
  //       external: newApplication.external || "No",
  //       jobDescription: newApplication.jobDescription || "",
  //       companyWebsite: newApplication.companyWebsite || "",
  //       roleLink: newApplication.roleLink || "",
  //       sector: newApplication.sector || "",
  //     };

  //     setJobApplications((prev) => [...prev, completeApplication]);

  //     setNewApplication({
  //       employer: "",
  //       jobTitle: "",
  //       cityTown: "",
  //       year: new Date().getFullYear(),
  //       generalRole: "",
  //       jobLevel: "",
  //       dateAppNotif: new Date().toISOString().split("T")[0],
  //       lastUpdate: new Date().toISOString().split("T")[0],
  //       daNow: 0,
  //       daLu: 0,
  //       luNow: 0,
  //       upcomingInterviewDate: undefined,
  //       lastCompletedStage: "Applied",
  //       notes: "",
  //       external: "No",
  //       jobDescription: "",
  //       companyWebsite: "",
  //       roleLink: "",
  //       sector: "",
  //     });

  //     toast.success("Application saved successfully!", {
  //       position: "top-center",
  //     });
  //     onCloseAddApplicationModal();
  //   } catch (error) {
  //     toast.error("Failed to save application. Please try again.", {
  //       position: "top-center",
  //     });
  //   }
  // };

  const matchesFilters = (application: JobApplication): boolean => {
    const matchesSearchQuery =
      !searchQuery ||
      Object.values(application)
        .filter((value) => typeof value === "string")
        .some((value) =>
          value.toLowerCase().includes(searchQuery.toLowerCase())
        );

    // Add safety check for empty filters
    const matchesGroupedFilters = Object.keys(groupedFilters).length === 0 || 
      Object.entries(groupedFilters).every(([type, values]) => {
        if (!values) return true; // Skip if values is undefined
        
        // Return true if at least one value matches
        switch (type) {
          case "Employer":
            return values.some(
              (value) => application.employer.toLowerCase() === value
            );
          case "City":
            return values.some(
              (value) => application.cityTown.toLowerCase() === value
            );
          case "Sector":
            return application.sector
              ? values.some(
                  (value) => application.sector!.toLowerCase() === value
                )
              : false;
          case "JobTitle":
            return values.some(
              (value) => application.jobTitle.toLowerCase() === value
            );
          case "GeneralRole":
            return values.some(
              (value) => application.generalRole.toLowerCase() === value
            );
          case "JobLevel":
            return values.some(
              (value) => application.jobLevel.toLowerCase() === value
            );
          default:
            return true; // If unrecognized type, skip filter
        }
    });

    const matchesStages =
      selectedStages.length === 0 ||
      selectedStages.includes(application.lastCompletedStage);

    const matchesNegativeOutcomes =
      !hideNegativeOutcomes ||
      !["Ghosted", "Rejected", "Dropped Out", "Offer Declined"].includes(
        application.lastCompletedStage
      );

    // Date range filter for dateAppNotif only
    const matchesDateRange = (() => {
      if (!dateRange[0] && !dateRange[1]) {
        return true; // No date range selected, include all applications
      }

      const dateAppNotif = application.dateAppNotif
        ? new Date(application.dateAppNotif)
        : null;

      if (dateRange[0] && dateAppNotif && dateAppNotif < dateRange[0]) {
        return false; // Exclude if dateAppNotif is before the start date
      }

      if (dateRange[1] && dateAppNotif && dateAppNotif > dateRange[1]) {
        return false; // Exclude if dateAppNotif is after the end date
      }

      return true; // Passes the date range filter
    })();

    return (
      matchesSearchQuery &&
      matchesGroupedFilters &&
      matchesStages &&
      matchesNegativeOutcomes &&
      matchesDateRange
    );
  };

  const filteredApplications = jobApplications.filter((app) => {
    return matchesFilters(app);
  });

  const findNewApplicationIndex = (
    application: JobApplication,
    applications: JobApplication[],
    sortConfig: { key: keyof JobApplication | null; direction: "asc" | "desc" }
  ): number => {
    // First filter and sort the list
    const sortedList = [...applications].sort((a, b) => {
      if (!sortConfig.key) return 0;
      const aVal = String(a[sortConfig.key]);
      const bVal = String(b[sortConfig.key]);
      return sortConfig.direction === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });

    // Find index of new application
    return sortedList.findIndex((app) => app.id === application.id);
  };

  function fetchCompaniesWithAppCountLocally(
    jobApps: JobApplication[]
  ): CompanyLike[] {
    const companiesMap = new Map<string, CompanyLike>();

    jobApps.forEach((app) => {
      const employer = app.employer.trim();
      if (!companiesMap.has(employer)) {
        companiesMap.set(employer, {
          name: employer,
          companyWebsite: app.companyWebsite, // take first encountered website
          applicationCount: 1,
        });
      } else {
        const existing = companiesMap.get(employer)!;
        existing.applicationCount += 1;
        // Optionally, update the website if this app has one and we haven't stored it yet
        if (!existing.companyWebsite && app.companyWebsite) {
          existing.companyWebsite = app.companyWebsite;
        }
      }
    });

    return Array.from(companiesMap.values());
  }

  /**
   * Build a unique list of "companies" from the given job apps.
   */
  function getCompaniesFromJobApps(jobApps: JobApplication[]): CompanyLike[] {
    return fetchCompaniesWithAppCountLocally(jobApps);
  }

  async function fetchCompaniesWithAppCount(): Promise<
    { name: string; companyWebsite?: string; applicationCount: number }[]
  > {
    try {
      const response = await axios.get(
        "http://10.0.0.101:5000/companies?withCounts=true"
      );
      // The data should be an array of objects with { name, companyWebsite?, applicationCount } at least.
      return response.data;
    } catch (err) {
      console.error("Failed to fetch companies with counts", err);
      return []; // Return empty array if error
    }
  }

  useEffect(() => {
    if (currentDataType === "companies") {
      // Produce the "companies" array from the job apps
      const localCompanies = getCompaniesFromJobApps(jobApplications);
      setCompanies(localCompanies);
    }
  }, [jobApplications, currentDataType]);

  const [newApplicationId, setNewApplicationId] = useState<number | null>(null);

  const handleAddRow = async () => {
    const newApplication: JobApplication = {
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
      external: "",
      jobDescription: "",
      companyWebsite: "",
      roleLink: "",
      sector: "",
    };

    try {
      const response = await axios.post(API_URL, newApplication);
      const savedApplication = { ...newApplication, id: response.data.id };

      setAllJobApplications((prev) => [...prev, savedApplication]);
      setJobApplications((prev) => [...prev, savedApplication]);
      setEditingRow(savedApplication.id!);
      setEditValues(savedApplication);
      setNewApplicationId(savedApplication.id!); // Track the new application

      toast.success("New application added successfully!");
    } catch (error) {
      console.error("Error adding new application:", error);
      toast.error("Failed to add new application. Please try again.");
    }
  };

  // Add new effect for handling scrolling
  useEffect(() => {
    if (!newApplicationId) return;

    // Find application in filtered and sorted list
    const index = filteredApplications.findIndex(
      (app) => app.id === newApplicationId
    );

    if (index === -1) {
      toast.info("New application added but hidden by current filters");
      setNewApplicationId(null);
      return;
    }

    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      if (viewMode === "table") {
        const row = tableRowRefs.current[index];
        if (row) {
          row.scrollIntoView({ behavior: "smooth", block: "center" });
          setFocusedIndex(index);
        }
      } else {
        const card = cardRefs.current[index];
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          setFocusedCardIndex(index);
        }
      }
      setNewApplicationId(null); // Reset after scrolling
    }, 100);
  }, [newApplicationId, filteredApplications, viewMode]);

  const handleDeleteRow = async () => {
    if (!deleteTargetId) return;

    try {
      await axios.delete(`${API_URL}/${deleteTargetId}`);
      setJobApplications((prev) =>
        prev.filter((app) => app.id !== deleteTargetId)
      );

      toast.success("Job application deleted successfully.", {
        position: "top-center",
      });
    } catch (error) {
      toast.error("Failed to delete the application. Please try again.", {
        position: "top-center",
      });
    } finally {
      setDeleteModalVisible(false); // Hide modal after deletion
      setDeleteTargetId(null); // Reset target ID
    }
  };

  const calculateDaysBetween = (start: string, end: string): string =>
    start && end
      ? `${Math.ceil(
          (new Date(end).getTime() - new Date(start).getTime()) /
            (1000 * 60 * 60 * 24)
        )}`
      : "N/A";

  const calculateDaysSinceApplied = (dateApplied: string): number => {
    const today = new Date();
    const appliedDate = new Date(dateApplied);
    if (isNaN(appliedDate.getTime())) return 0; // Return 0 if the date is invalid
    const difference = today.getTime() - appliedDate.getTime();
    return Math.ceil(difference / (1000 * 60 * 60 * 24)); // Convert milliseconds to days
  };

  const getDaysSinceColor = (days: number): string => {
    const redIntensity = Math.min(255, days * 5); // Increase red intensity by 5 for each day
    return `rgb(${redIntensity}, 200, 200)`; // Adjust green and blue to maintain a light red gradient
  };

  const handleSort = (key: keyof JobApplication) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    const sortedApplications = [...filteredApplications].sort((a, b) => {
      if (!sortConfig.key) return 0;
      const key = sortConfig.key;

      if (a[key]! < b[key]!) return sortConfig.direction === "asc" ? -1 : 1;
      if (a[key]! > b[key]!) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    setJobApplications(sortedApplications);
  };

  const renderEditableCell = (
    field: keyof JobApplication,
    type: "text" | "number" | "date" | "time" | "select",
    id?: number,
    options?: { value: any; label: string }[]
  ) => {
    const application = jobApplications.find((app) => app.id === id);
    const currentValue = editValues[field] || application?.[field] || "";

    // Handle complex object fields
    const getDisplayValue = (value: any): string => {
      if (!value) return "";

      // Handle salary object
      if (field === "salary" && typeof value === "object") {
        return `${value.currency || "£"}${value.min || 0} - ${
          value.currency || "£"
        }${value.max || 0}`;
      }

      // Handle arrays (interviewHistory, contacts)
      if (Array.isArray(value)) {
        return JSON.stringify(value);
      }

      // Handle primitive values
      return String(value);
    };

    if (type === "text") {
      const isSuggestionField = [
        "employer",
        "jobTitle",
        "cityTown",
        "sector",
      ].includes(field);

      return (
        <div style={{ position: "relative", width: "100%" }}>
          <Form.Control
            type="text"
            value={getDisplayValue(currentValue)}
            onChange={(e) => {
              handleEditChange(field, e.target.value);

              if (isSuggestionField) {
                setActiveField(field);
                setActiveRow(id ?? null);
                setSuggestions(getFieldSuggestions(field, e.target.value));
              }

              setEditValues((prev) => ({
                ...prev,
                [field]: e.target.value,
              }));
            }}
            onFocus={() => {
              if (isSuggestionField) {
                setActiveField(field);
                setActiveRow(id ?? null);
                setSuggestions(
                  getFieldSuggestions(field, String(currentValue))
                );
              }
            }}
            onBlur={() => {
              setTimeout(() => setSuggestions([]), 200);
            }}
            style={{ width: "100%" }}
          />

          {/* Show suggestions only if this cell is the active field and row */}
          {isSuggestionField &&
            activeField === field &&
            activeRow === id &&
            suggestions.length > 0 && (
              <ul
                style={{
                  position: "absolute",
                  background: "#fff",
                  border: "1px solid #ddd",
                  zIndex: 1000,
                  listStyleType: "none",
                  margin: 0,
                  padding: "10px 0",
                  width: "100%",
                  maxHeight: "200px",
                  overflowY: "auto",
                  borderRadius: "4px",
                }}
              >
                {suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    style={{
                      padding: "5px 10px",
                      cursor: "pointer",
                      borderBottom:
                        index === suggestions.length - 1
                          ? "none"
                          : "1px solid #eee",
                      backgroundColor: "white",
                    }}
                    onClick={() => {
                      if (activeField) {
                        setEditValues((prev) => ({
                          ...prev,
                          [activeField]: suggestion.value,
                        }));
                        setSuggestions([]); // Clear suggestions
                      }
                    }}
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
                  >
                    {suggestion.label}
                  </li>
                ))}
              </ul>
            )}
        </div>
      );
    }

    if (type === "date") {
      const parsedDate = currentValue ? new Date(currentValue as string) : null;

      if (field === "upcomingInterviewDate") {
        return (
          <div className="d-flex gap-2">
            <DatePicker
              className="form-control"
              popperClassName="border-0 shadow-lg"
              selected={parsedDate}
              onChange={(date) => {
                handleEditChange(
                  field,
                  date?.toISOString().split("T")[0] || ""
                );
                // If there's no time set yet, set default time
                if (date && !editValues.upcomingInterviewTime) {
                  handleEditChange("upcomingInterviewTime", "09:00");
                }
              }}
              dateFormat="yyyy-MM-dd"
              isClearable
            />
            {parsedDate && (
              <Form.Control
                type="time"
                value={editValues.upcomingInterviewTime || "09:00"}
                onChange={(e) => {
                  handleEditChange("upcomingInterviewTime", e.target.value);
                  setEditValues((prev) => ({
                    ...prev,
                    upcomingInterviewTime: e.target.value,
                  }));
                }}
              />
            )}
          </div>
        );
      }

      return (
        <DatePicker
          className="form-control"
          popperClassName="border-0 shadow-lg"
          selected={parsedDate}
          onChange={(date) =>
            handleEditChange(field, date?.toISOString().split("T")[0] || "")
          }
          dateFormat="yyyy-MM-dd"
          isClearable
        />
      );
    }

    if (type === "select") {
      return (
        <Select
          options={options}
          value={options?.find((opt) => opt.value === currentValue)}
          onChange={(opt) => handleEditChange(field, opt?.value)}
          isClearable
          menuPortalTarget={document.body}
          styles={{
            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
            menu: (base) => ({
              ...base,
              width: "auto",
              minWidth: "200px",
            }),
            control: (base) => ({
              ...base,
              width: "100%", // Dynamic width
              minWidth: "150px",
            }),
          }}
        />
      );
    }

    return (
      <Form.Control
        type={type}
        value={getDisplayValue(currentValue)}
        onChange={(e) =>
          handleEditChange(
            field,
            type === "number" ? parseInt(e.target.value) : e.target.value
          )
        }
        style={{ width: "100%" }} // Full-width inputs
      />
    );
  };

  function getCompanyForJob(
    job: JobApplication,
    companies: Company[]
  ): Company {
    const company = companies.find((c) => c.name === job.employer);
    return company || { name: job.employer };
  }

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (focusedIndex !== null && focusedIndex >= filteredApplications.length) {
      setFocusedIndex(null); // Reset focus if out of bounds
    }
  }, [filteredApplications, focusedIndex]);

  useEffect(() => {
    if (viewMode === "table" && focusedIndex !== null) {
      const focusedRow = tableRowRefs.current[focusedIndex];
      if (focusedRow) {
        focusedRow.scrollIntoView({
          // inline: "center",
          block: "center",
          behavior: "smooth", // Smooth scrolling
        });
      }
    }
    if (viewMode === "cards" && focusedCardIndex !== null) {
      const focusedCard = cardRefs.current[focusedCardIndex];
      if (focusedCard) {
        focusedCard.scrollIntoView({
          behavior: "smooth", // Smooth scrolling
          block: "center",
          // inline: "center", // Center horizontally for better visibility
        });
      }
    }
  }, [focusedIndex, viewMode]);

  const [focusedCardIndex, setFocusedCardIndex] = useState<number | null>(null);
  const [columns, setColumns] = useState<number>(1);

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const calculateColumns = () => {
      const container = document.querySelector(".card-container");
      if (container) {
        const cardWidth = cardRefs.current[0]?.offsetWidth || 200; // Default card width
        const containerWidth = container.clientWidth;
        setColumns(Math.max(1, Math.floor(containerWidth / cardWidth)));
      }
    };

    calculateColumns();
    window.addEventListener("resize", calculateColumns);
    return () => window.removeEventListener("resize", calculateColumns);
  }, []);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const showDeleteModal = (id: number) => {
    setDeleteTargetId(id);
    setDeleteModalVisible(true);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, "gi");
    return (
      <span
        dangerouslySetInnerHTML={{
          __html: text.replace(regex, (match) => `<mark>${match}</mark>`),
        }}
      />
    );
  };

  const sortedApplications = [...filteredApplications].sort((a, b) => {
    if (!sortConfig.key) return 0; // No sorting key set
    const key = sortConfig.key;

    if (a[key]! < b[key]!) return sortConfig.direction === "asc" ? -1 : 1;
    if (a[key]! > b[key]!) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const cancelEdit = () => {
    setEditValues({}); // Clear the editing values
    setEditingRow(null); // Exit editing mode
    toast.info("Edit canceled."); // Provide feedback to the user
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;

      // Skip navigation if an input or interactive element is focused
      const isInteractiveElementFocused =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.classList.contains("react-select__control") ||
        activeElement?.closest(".react-select__menu");
      if (isInteractiveElementFocused) return;

      // Detect Esc key press
      if (event.key === "Escape" && editingRow !== null) {
        cancelEdit(); // Call the function to cancel the edit
      }

      const totalItems =
        viewMode === "table"
          ? filteredApplications.length
          : cardRefs.current.length;
      if (totalItems === 0) return;

      if (["ArrowUp", "ArrowDown", "Enter"].includes(event.key)) {
        event.preventDefault(); // Prevent default behavior like scrolling
      }

      // Handle navigation and selection
      if (viewMode === "table") {
        setFocusedIndex((prevIndex) => {
          const currentIndex = prevIndex ?? 0;
          let nextIndex = currentIndex;

          if (event.key === "ArrowDown") {
            nextIndex = Math.min(currentIndex + 1, totalItems - 1);
          } else if (event.key === "ArrowUp") {
            nextIndex = Math.max(currentIndex - 1, 0);
          } else if (event.key === "Enter") {
            const selectedApplication = filteredApplications[currentIndex];
            if (selectedApplication) {
              handleEditRow(selectedApplication.id!); // Enter edit mode for the selected row
            }
            return currentIndex;
          }

          return nextIndex;
        });
      } else if (viewMode === "cards") {
        setFocusedCardIndex((prevIndex) => {
          const currentIndex = prevIndex ?? 0;
          let nextIndex = currentIndex;

          if (event.key === "ArrowDown") {
            nextIndex = Math.min(currentIndex + columns, totalItems - 1); // Navigate down a row
          } else if (event.key === "ArrowUp") {
            nextIndex = Math.max(currentIndex - columns, 0); // Navigate up a row
          } else if (event.key === "ArrowLeft") {
            nextIndex = Math.max(currentIndex - 1, 0); // Navigate left
          } else if (event.key === "ArrowRight") {
            nextIndex = Math.min(currentIndex + 1, totalItems - 1); // Navigate right
          } else if (event.key === "Enter") {
            const selectedApplication = sortedApplications[currentIndex]; // Use sortedApplications instead of filteredApplications
            if (selectedApplication) {
              handleEditRow(selectedApplication.id!);
            }
            return currentIndex;
          }

          return nextIndex;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    sortedApplications,
    handleEditRow,
    viewMode,
    columns,
    editingRow,
    cancelEdit,
  ]);

  useEffect(() => {
    if (editingRow !== null) {
      setEditValues({});
      setEditingRow(null);
      toast.info("Editing canceled due to filter changes.");
    }
    // Clear selection when filters change
    setFocusedIndex(null);
    setFocusedCardIndex(null);
  }, [
    selectedFilters,
    dateRange,
    hideNegativeOutcomes,
    selectedStages,
    searchQuery,
  ]);

  const visibleSuggestions = (() => {
    const suggestionsSet: { [key: string]: Set<string> } = {
      Employer: new Set(),
      City: new Set(),
      JobTitle: new Set(),
      GeneralRole: new Set(),
      JobLevel: new Set(),
      Sector: new Set(),
    };

    jobApplications.forEach((app) => {
      if (app.employer?.trim()) suggestionsSet.Employer.add(app.employer);
      if (app.cityTown?.trim()) suggestionsSet.City.add(app.cityTown);
      if (app.jobTitle?.trim()) suggestionsSet.JobTitle.add(app.jobTitle);
      if (app.generalRole?.trim())
        suggestionsSet.GeneralRole.add(app.generalRole);
      if (app.jobLevel?.trim()) suggestionsSet.JobLevel.add(app.jobLevel);
      if (app.sector?.trim()) suggestionsSet.Sector.add(app.sector); // Include Sector
    });

    return Object.entries(suggestionsSet).flatMap(([type, values]) =>
      Array.from(values).map((value) => ({ value, label: value, type }))
    );
  })();

  const stageOptions = Array.from(
    new Set(
      jobApplications
        .map((app) => app.lastCompletedStage)
        .filter((stage) => stage?.trim()) // Exclude empty or undefined values
    )
  ).map((stage) => ({ value: stage, label: stage }));

  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [selectedStatistic, setSelectedStatistic] =
    useState<string>("jobStatus"); // Default to job status
  const [chartData, setChartData] = useState<any[]>([]); // Data for the pie chart

  const calculateStatisticData = (statistic: string) => {
    const data = jobApplications.reduce((acc: Record<string, number>, app) => {
      let key = "";
      if (statistic === "generalRole") key = app.generalRole || "Unknown";
      else if (statistic === "jobLevel") key = app.jobLevel || "Unknown";
      else if (statistic === "sector") key = app.sector || "Unknown";
      else if (statistic === "jobStatus")
        key = app.lastCompletedStage || "Unknown";

      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // Transform data into a format suitable for the pie chart
    return Object.entries(data).map(([label, value]) => ({ label, value }));
  };

  useEffect(() => {
    const data = calculateStatisticData(selectedStatistic);
    setChartData(data);
  }, [selectedStatistic, jobApplications]);

  const [showStatisticsModal, setShowStatisticsModal] = useState(false);

  const getSuggestions = (term: string): string[] => {
    if (!term.trim()) return [];

    const items = jobApplications
      .flatMap((app) => [
        app.employer || "",
        app.jobTitle || "",
        app.cityTown || "",
      ])
      .filter(
        (item) =>
          item.toLowerCase().includes(term.toLowerCase()) && item.trim() !== ""
      );

    return Array.from(new Set(items)).slice(0, 10);
  };

  const renderSortIcon = (key: keyof JobApplication) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? (
        <FaSortAlphaDown />
      ) : (
        <FaSortAlphaUp />
      );
    }
    return null;
  };

  const getFieldSuggestions = (
    field: keyof JobApplication,
    term: string
  ): { value: string; label: string; type: string }[] => {
    if (!term.trim()) return []; // Avoid returning suggestions for empty input

    const items = jobApplications
      .map((app) => app[field])
      .filter(
        (value): value is string =>
          typeof value === "string" &&
          value.toLowerCase().includes(term.toLowerCase()) &&
          value.trim() !== ""
      );

    return Array.from(new Set(items)).map((item) => ({
      value: item,
      label: item,
      type: field as string,
    }));
  };

  const tableRowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const formatDateUK = (date: string | null | undefined): string => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const renderTable = (darkMode: boolean) => {
    if (currentDataType === "applications") {
      return (
        <Table
          striped
          bordered
          hover
          responsive
          className={`table ${editingRow === null ? "non-editing-mode" : ""}`}
          ref={tableRef} // Attach the ref to the table
        >
          <thead>
            <tr>
              <th></th>
              <th
                style={{ minWidth: "150px" }}
                onClick={() => handleSort("employer")}
                className="column-employer"
              >
                Employer {renderSortIcon("employer")}
              </th>
              <th
                style={{ minWidth: "200px" }}
                onClick={() => handleSort("jobTitle")}
                className="column-job-title"
              >
                Job Title {renderSortIcon("jobTitle")}
              </th>
              <th
                style={{ minWidth: "200px" }}
                onClick={() => handleSort("sector")}
              >
                Sector {renderSortIcon("sector")}
              </th>
              <th
                style={{ minWidth: "150px" }}
                onClick={() => handleSort("cityTown")}
              >
                City {renderSortIcon("cityTown")}
              </th>
              <th onClick={() => handleSort("year")} className="column-year">
                Year {renderSortIcon("year")}
              </th>
              <th onClick={() => handleSort("generalRole")}>
                General Role {renderSortIcon("generalRole")}
              </th>
              <th onClick={() => handleSort("jobLevel")}>
                Job Level {renderSortIcon("jobLevel")}
              </th>
              <th onClick={() => handleSort("dateAppNotif")}>
                Date Applied {renderSortIcon("dateAppNotif")}
              </th>
              <th onClick={() => handleSort("lastUpdate")}>
                Last Update {renderSortIcon("lastUpdate")}
              </th>
              <th className="column-age">Age</th>
              <th className="column-dalu">DALU</th>
              <th onClick={() => handleSort("upcomingInterviewDate")}>
                Upcoming Interview {renderSortIcon("upcomingInterviewDate")}
              </th>
              <th onClick={() => handleSort("lastCompletedStage")}>
                Stage {renderSortIcon("lastCompletedStage")}
              </th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredApplications.map((job, index) => {
              const isEditing = editingRow === job.id; // Compare IDs
              const daysSinceApplied = calculateDaysSinceApplied(
                job.dateAppNotif
              );
              const backgroundColor = getDaysSinceColor(daysSinceApplied);
              const stageColor =
                statusColors[job.lastCompletedStage] || "#ffffff"; // Default to white if stage isn't defined

              return (
                <tr
                  key={job.id}
                  ref={combineRefs(
                    (el) => {
                      tableRowRefs.current[index] = el;
                    }, // Ref for scrolling
                    editingRow === job.id
                      ? (editingRef as React.RefObject<HTMLTableRowElement>) // Existing ref
                      : undefined
                  )}
                  onMouseEnter={() => setHoveredRow(job.id ?? null)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={index === focusedIndex ? "table-row-focused" : ""}
                  onClick={() => {
                    // If currently editing another row, cancel editing and reset the state
                    if (editingRow !== null && editingRow !== job.id) {
                      setEditValues({});
                      setEditingRow(null);
                      toast.info("Editing canceled.");
                    }

                    // Set focus to the clicked row
                    setFocusedIndex(index);
                  }}
                  style={{
                    backgroundColor: statusColors[job.lastCompletedStage],
                  }}
                >
                  <td>
                    <img
                      src={fetchFavicon({
                        name: job.employer, // pass employer as 'name'
                        companyWebsite: job.companyWebsite,
                      })}
                      alt="favicon"
                      style={{ width: 24, height: 24 }}
                    />
                  </td>
                  {editingRow === job.id ? (
                    <>
                      <td className="column-employer">
                        {renderEditableCell("employer", "text", job.id)}
                      </td>
                      <td className="column-job-title">
                        {renderEditableCell("jobTitle", "text", job.id)}
                      </td>
                      <td>{renderEditableCell("sector", "text", job.id)}</td>
                      <td>{renderEditableCell("cityTown", "text", job.id)}</td>
                      <td className="column-year">
                        {renderEditableCell(
                          "year",
                          "select",
                          job.id,
                          yearOptions
                        )}
                      </td>
                      <td>
                        {renderEditableCell(
                          "generalRole",
                          "select",
                          job.id,
                          generalRoleOptions
                        )}
                      </td>
                      <td>
                        {renderEditableCell(
                          "jobLevel",
                          "select",
                          job.id,
                          jobLevelOptions
                        )}
                      </td>
                      <td>{renderEditableCell("dateAppNotif", "date")}</td>
                      <td>
                        {editingRow === job.id ? (
                          <>
                            {renderEditableCell("lastUpdate", "date", job.id)}
                            <Button
                              size="sm"
                              variant="link"
                              onClick={() => updateLastUpdatedToToday(job.id!)}
                              style={{
                                padding: "0",
                                textDecoration: "underline",
                              }}
                            >
                              Today
                            </Button>
                          </>
                        ) : (
                          job.lastUpdate || "N/A"
                        )}
                      </td>
                      <td style={{ backgroundColor }} className="column-age">
                        {editValues.dateAppNotif
                          ? calculateDaysSinceApplied(editValues.dateAppNotif)
                          : "N/A"}
                      </td>
                      <td className="column-dalu">
                        {calculateDaysBetween(
                          editValues.dateAppNotif || "",
                          editValues.lastUpdate || ""
                        )}
                      </td>
                      <td>
                        {renderEditableCell("upcomingInterviewDate", "date")}
                      </td>
                      <td style={{ backgroundColor: stageColor }}>
                        {renderEditableCell(
                          "lastCompletedStage",
                          "select",
                          job.id,
                          jobStatuses.map((s) => ({ value: s, label: s }))
                        )}
                      </td>
                      <td>
                        {isEditing ? null : (
                          <Button
                            variant="link"
                            onClick={() => {
                              setSelectedApplication(job); // Show the details in the modal
                              setShowInfoModal(true); // Open the modal
                              setModalEditMode(false); // Ensure the modal opens in view mode
                            }}
                          >
                            More Info
                          </Button>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td
                        style={{ cursor: "pointer", color: "#007bff" }} // optional styling for a link-like appearance
                        onClick={() => filterByCompany(job.employer)}
                      >
                        {highlightMatch(job.employer, searchQuery)}
                      </td>
                      <td>{highlightMatch(job.jobTitle, searchQuery)}</td>
                      <td>
                        {highlightMatch(job.sector || "N/A", searchQuery)}
                      </td>
                      <td>{highlightMatch(job.cityTown, searchQuery)}</td>
                      <td>{job.year}</td>
                      <td>{highlightMatch(job.generalRole, searchQuery)}</td>
                      <td>{highlightMatch(job.jobLevel, searchQuery)}</td>
                      <td>{formatDateUK(job.dateAppNotif)}</td>
                      <td>{formatDateUK(job.lastUpdate)}</td>
                      <td style={{ backgroundColor }}>
                        {job.dateAppNotif ? daysSinceApplied : "N/A"}
                      </td>
                      <td>
                        {calculateDaysBetween(job.dateAppNotif, job.lastUpdate)}
                      </td>
                      <td>
                        {job.upcomingInterviewDate
                          ? `${formatDateUK(job.upcomingInterviewDate)} ${
                              job.upcomingInterviewTime || "09:00"
                            }`
                          : "N/A"}
                      </td>
                      <td style={{ backgroundColor: stageColor }}>
                        {job.lastCompletedStage}
                      </td>
                      <td>
                        {isEditing ? null : (
                          <Button
                            variant="link"
                            onClick={() => {
                              setSelectedApplication(job); // Show the details in the modal
                              setShowInfoModal(true); // Open the modal
                              setModalEditMode(false); // Ensure the modal opens in view mode
                            }}
                          >
                            More Info
                          </Button>
                        )}
                      </td>
                    </>
                  )}
                  {hoveredRow === job.id && (
                    <td>
                      <FaPencilAlt
                        className="me-2 text-primary"
                        onClick={() => job.id && handleEditRow(job.id)} // Ensure job.id is valid
                        style={{ cursor: "pointer" }}
                      />
                      <FaTrash
                        className="text-danger"
                        onClick={() => showDeleteModal(job.id!)} // Pass ID to modal
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={15} className="text-center">
                <Button onClick={handleAddRow}>Add New Job Application</Button>
              </td>
            </tr>
          </tfoot>
        </Table>
      );
    } else {
      // Render Companies Table
      return (
        <Table striped bordered hover responsive className="w-100">
          <thead>
            <tr>
              <th>Logo</th>
              <th>Employer</th>
              <th>Applications</th>
              <th>Website</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompanies.map((company, index) => (
              <tr key={index}>
                <td>
                  {fetchFavicon({
                    name: company.name,
                    companyWebsite: company.companyWebsite,
                  }) && (
                    <img
                      src={fetchFavicon({
                        name: company.name,
                        companyWebsite: company.companyWebsite,
                      })}
                      alt="favicon"
                      style={{ width: 24, height: 24 }}
                    />
                  )}
                </td>
                <td>{company.name}</td>
                <td>
                  {
                    jobApplications.filter(
                      (app) => app.employer === company.name
                    ).length
                  }
                </td>
                <td>
                  {company.companyWebsite ? (
                    <a
                      href={company.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none", color: "#007bff" }}
                    >
                      {company.companyWebsite}
                    </a>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td>
                  <Button
                    variant="link"
                    onClick={() => filterByCompany(company.name)}
                    style={{ textDecoration: "none" }}
                  >
                    View Applications
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="text-center">
                <Button onClick={() => setShowAddCompanyModal(true)}>
                  Add New Company
                </Button>
              </td>
            </tr>
          </tfoot>
        </Table>
      );
    }
  };

  const renderCards = () => {
    if (currentDataType === "applications") {
      return (
        <Row xs={1} sm={2} md={3} lg={4} xl={5} className="g-4">
          {sortedApplications.map((job, index) => {
            const isEditing = editingRow === job.id; // Compare IDs correctly
            const stageColor = statusColors[job.lastCompletedStage] || "#ddd"; // Color for stage

            const faviconUrl = fetchFavicon({
              name: job.employer, // pass employer as 'name'
              companyWebsite: job.companyWebsite,
            });

            // Calculate DA-LU only if dateAppNotif and lastUpdate are defined
            const daLuValue =
              job.dateAppNotif && job.lastUpdate
                ? calculateDaysBetween(job.dateAppNotif, job.lastUpdate)
                : null;

            return (
              <Col
                key={job.id}
                ref={combineRefs(
                  (el) => {
                    cardRefs.current[index] = el;
                  }, // Ref for scrolling
                  editingRow === job.id
                    ? (editingRef as React.RefObject<HTMLTableRowElement>) // Existing ref
                    : undefined
                )}
                className={index === focusedCardIndex ? "card-focused" : ""}
                onClick={() => setFocusedCardIndex(index)} // Update focus on click
                tabIndex={0} // Make the card focusable
                style={{
                  outline: index === focusedCardIndex ? "none" : undefined,
                }}
              >
                <Card
                  style={{
                    borderColor: stageColor,
                  }}
                >
                  <Card.Header
                    style={{
                      backgroundColor: stageColor,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {/* Favicon */}
                    {faviconUrl && (
                      <img
                        src={faviconUrl}
                        alt={`${job.employer} favicon`}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "4px",
                        }}
                      />
                    )}
                    <strong>
                      {isEditing
                        ? renderEditableCell("jobTitle", "text")
                        : highlightMatch(job.jobTitle, searchQuery)}
                    </strong>

                    {/* Display Days Since Applied badge if dateAppNotif is set */}
                    {job.dateAppNotif && (
                      <span
                        style={{
                          backgroundColor: getDaysSinceColor(
                            calculateDaysSinceApplied(job.dateAppNotif)
                          ),
                          padding: "5px 10px",
                          borderRadius: "5px",
                          color: "#000",
                        }}
                      >
                        {calculateDaysSinceApplied(job.dateAppNotif) > 1
                          ? `${calculateDaysSinceApplied(
                              job.dateAppNotif
                            )} days old`
                          : `${calculateDaysSinceApplied(
                              job.dateAppNotif
                            )} day old`}
                      </span>
                    )}
                  </Card.Header>

                  <Card.Body>
                    {isEditing ? (
                      <>
                        <Form.Group className="mb-2">
                          <Form.Label>Employer</Form.Label>
                          {renderEditableCell("employer", "text", job.id)}
                        </Form.Group>
                        <Form.Group className="mb-2">
                          <Form.Label>City</Form.Label>
                          {renderEditableCell("cityTown", "text", job.id)}
                        </Form.Group>
                        <Form.Group className="mb-2">
                          <Form.Label>Sector</Form.Label>
                          {renderEditableCell("sector", "text", job.id)}
                        </Form.Group>
                        <Form.Group className="mb-2">
                          <Form.Label>Year</Form.Label>
                          {renderEditableCell(
                            "year",
                            "select",
                            job.id,
                            yearOptions
                          )}
                        </Form.Group>
                        <Form.Group className="mb-2">
                          <Form.Label>General Role</Form.Label>
                          {renderEditableCell(
                            "generalRole",
                            "select",
                            job.id,
                            generalRoleOptions
                          )}
                        </Form.Group>
                        <Form.Group className="mb-2">
                          <Form.Label>Job Level</Form.Label>
                          {renderEditableCell(
                            "jobLevel",
                            "select",
                            job.id,
                            jobLevelOptions
                          )}
                        </Form.Group>
                        <Form.Group className="mb-2">
                          <Form.Label>Date Applied</Form.Label>
                          {renderEditableCell("dateAppNotif", "date")}
                        </Form.Group>
                        <Form.Group className="mb-2">
                          <Form.Label>Last Update</Form.Label>
                          {renderEditableCell("lastUpdate", "date")}
                          <Button
                            size="sm"
                            variant="link"
                            onClick={() => updateLastUpdatedToToday(job.id!)}
                            style={{
                              padding: "0",
                              textDecoration: "underline",
                            }}
                          >
                            Today
                          </Button>
                        </Form.Group>
                        <Form.Group className="mb-2">
                          <Form.Label>Interview Date</Form.Label>
                          {renderEditableCell("upcomingInterviewDate", "date")}
                        </Form.Group>
                        <Form.Group className="mb-2">
                          <Form.Label>Stage</Form.Label>
                          {renderEditableCell(
                            "lastCompletedStage",
                            "select",
                            job.id,
                            jobStatuses.map((s) => ({ value: s, label: s }))
                          )}
                        </Form.Group>
                      </>
                    ) : (
                      <>
                        <Card.Text>
                          <strong>Employer:</strong>{" "}
                          <strong
                            style={{ cursor: "pointer", color: "#007bff" }}
                            onClick={() => filterByCompany(job.employer)}
                          >
                            {highlightMatch(job.employer, searchQuery)}
                          </strong>
                          <br />
                          <strong>Sector: </strong>{" "}
                          {highlightMatch(job.sector || "N/A", searchQuery)}
                          <br />
                          <strong>City:</strong>{" "}
                          {highlightMatch(job.cityTown, searchQuery)}
                          <br />
                          <strong>Year:</strong> {job.year}
                          <br />
                          <strong>General Role:</strong>{" "}
                          {highlightMatch(job.generalRole, searchQuery)}
                          <br />
                          <strong>Level:</strong>{" "}
                          {highlightMatch(job.jobLevel, searchQuery)}
                          <br />
                          <strong>Date Applied:</strong>{" "}
                          {formatDateUK(job.dateAppNotif)}
                          <br />
                          <strong>Last Update:</strong>{" "}
                          {formatDateUK(job.lastUpdate)}
                          <br />
                          <strong>Interview Date:</strong>{" "}
                          {formatDateUK(job.upcomingInterviewDate)}
                          <br />
                          <strong>Stage:</strong> {job.lastCompletedStage}
                          <br />
                          {/* Conditionally show DA-LU value */}
                          {daLuValue && (
                            <>
                              <strong>Date Applied - Last Update:</strong>{" "}
                              {daLuValue} days
                            </>
                          )}
                        </Card.Text>
                      </>
                    )}
                  </Card.Body>

                  <Card.Footer className="d-flex justify-content-between align-items-center">
                    {editingRow === job.id ? (
                      <div className="d-flex gap-2">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={handleSaveRow} // Save changes
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditValues({});
                            setEditingRow(null);
                            toast.info("Changes discarded.");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="d-flex gap-2">
                        <FaPencilAlt
                          className="text-primary"
                          onClick={() => handleEditRow(job.id!)} // Start editing
                          style={{ cursor: "pointer" }}
                        />
                        <FaTrash
                          className="text-danger"
                          onClick={() => showDeleteModal(job.id!)} // Pass ID to modal
                          style={{ cursor: "pointer" }}
                        />
                      </div>
                    )}

                    {isEditing ? null : (
                      <Button
                        variant="link"
                        onClick={() => {
                          setSelectedApplication(job); // Show the details in the modal
                          setShowInfoModal(true); // Open the modal
                          setModalEditMode(false); // Ensure the modal opens in view mode
                        }}
                      >
                        More Info
                      </Button>
                    )}
                  </Card.Footer>
                </Card>
              </Col>
            );
          })}

          {/* Add New Application Button as a Card */}
          <Col>
            <Card className="text-center h-100 d-flex justify-content-center align-items-center">
              <Button variant="primary" className="w-75" onClick={handleAddRow}>
                Add New Application
              </Button>
            </Card>
          </Col>
        </Row>
      );
    } else {
      // Render Companies as Cards
      return (
        <Row xs={1} sm={2} md={3} lg={4} xl={6} className="g-4">
          {companies
            .filter((company) =>
              company.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((company, index) => {
              const faviconUrl = fetchFavicon({
                name: company.name,
                companyWebsite: company.companyWebsite,
              });
              const applicationsCount = jobApplications.filter(
                (app) => app.employer === company.name
              ).length;

              return (
                <Col key={index}>
                  <Card
                    className="h-100"
                    style={{
                      borderColor: "#ddd",
                      // Optional hover effect (if desired):
                      // transition: "box-shadow 0.2s ease",
                    }}
                    // Uncomment if adding a hover effect:
                    // onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)")}
                    // onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                  >
                    <Card.Header
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      {faviconUrl && (
                        <img
                          src={faviconUrl}
                          alt={`${company.name} favicon`}
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "4px",
                          }}
                        />
                      )}
                      <span>{company.name}</span>
                    </Card.Header>

                    <Card.Body>
                      <Card.Text style={{ lineHeight: "1.5" }}>
                        <strong>Applications:</strong> {applicationsCount}
                        <br />
                        <strong>Website:</strong>{" "}
                        {company.companyWebsite ? (
                          <a
                            href={company.companyWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "none", color: "#007bff" }}
                          >
                            {company.companyWebsite}
                          </a>
                        ) : (
                          "N/A"
                        )}
                      </Card.Text>
                    </Card.Body>

                    <Card.Footer className="text-end">
                      <Button
                        variant="link"
                        onClick={() => filterByCompany(company.name)}
                        style={{ textDecoration: "none" }}
                      >
                        View Applications
                      </Button>
                    </Card.Footer>
                  </Card>
                </Col>
              );
            })}
          <Col>
            <Card className="text-center h-100 d-flex justify-content-center align-items-center">
              <Button
                variant="primary"
                onClick={() => setShowAddCompanyModal(true)}
              >
                Add New Company
              </Button>
            </Card>
          </Col>
        </Row>
      );
    }
  };

  if (loading) {
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  } else {
    return (
      <Container
        fluid
        className={`job-application-table ${darkMode ? "dark" : "light"}`}
      >
        <div className="shortcut-message">
          <p>
            Hold <strong>?</strong> to see keyboard shortcuts
          </p>
        </div>
        <InputGroup className="mb-3">
          <Form.Control
            type="text"
            placeholder="Search across all fields..."
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button
            variant="outline-secondary"
            onClick={() => setSearchQuery("")}
          >
            Clear
          </Button>
        </InputGroup>

        <InputGroup
          className="mb-3"
          style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}
        >
          <div style={{ flex: 1, position: "relative", marginRight: "10px" }}>
            <div
              ref={searchContainerRef}
              className={`filter-search-container ${isSticky ? "sticky" : ""}`}
            >
              <Select
                ref={searchSelectRef} // Attach the ref here
                options={visibleSuggestions}
                placeholder="Search by Employer, City, Job Title, General Role, or Job Level..."
                getOptionLabel={(e) => `${e.label} (${e.type})`}
                isMulti
                value={selectedFilters}
                onChange={
                  (selectedOptions) =>
                    handleFilterChange(Array.from(selectedOptions || [])) // Convert readonly to mutable array
                }
                onFocus={handleFocus} // Track when the field is focused
                onBlur={handleBlur} // Track when the field loses focus
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  menu: (base) => ({
                    ...base,
                    width: "auto",
                    minWidth: "300px",
                  }),
                  control: (base) => ({
                    ...base,
                    minWidth: "300px",
                  }),
                }}
                isClearable
              />
            </div>
          </div>

          {/* Stage Filter Dropdown */}
          <div style={{ flexShrink: 0 }}>
            <Select
              options={stageOptions}
              placeholder="Filter by Stages"
              isMulti
              value={selectedStages.map((status) => ({
                value: status,
                label: status,
              }))}
              onChange={(selected) =>
                setSelectedStages(selected.map((s) => s.value))
              }
              styles={{
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                menu: (base) => ({
                  ...base,
                  width: "auto",
                  minWidth: "200px",
                }),
                control: (base) => ({
                  ...base,
                  width: "auto",
                  minWidth: "200px",
                }),
              }}
            />
          </div>

          {/* Date Range Picker */}
          <div style={{ flexShrink: 0, marginLeft: "10px" }}>
            <DatePicker
              className="form-control"
              wrapperClassName="d-flex"
              popperClassName="border-0 shadow-lg"
              startDate={dateRange[0]}
              endDate={dateRange[1]}
              onChange={(update) =>
                setDateRange(update as [Date | undefined, Date | undefined])
              }
              selectsRange
              isClearable
              dateFormat="yyyy-MM-dd"
            />
          </div>
          <Button
            variant="outline-secondary"
            onClick={() => setDateRange([undefined, undefined])}
          >
            Clear
          </Button>
        </InputGroup>

        <div className="filter-buttons d-flex flex-wrap justify-content-end mb-3">
          <>
            <Button
              variant="primary"
              onClick={() => setShowStatisticsModal(true)}
            >
              View Statistics
            </Button>
            <StatisticsModal
              show={showStatisticsModal}
              filteredApplications={filteredApplications} // Add filtered applications
              useFilteredData={useFilteredData} // Add state for filtered data toggle
              setUseFilteredData={setUseFilteredData} // Add setter for filtered data toggle
              onHide={() => setShowStatisticsModal(false)}
            />
          </>
          <Button
            variant={hideNegativeOutcomes ? "secondary" : "primary"}
            onClick={() => setHideNegativeOutcomes((prev) => !prev)}
            className="me-2"
          >
            {hideNegativeOutcomes
              ? "Show All Applications"
              : "Hide Negative Outcomes"}
          </Button>

          <Button
            variant={
              currentDataType === "applications" ? "primary" : "outline-primary"
            }
            onClick={() => handleDataTypeChange("applications")}
            className="me-2"
          >
            Show Applications
          </Button>
          <Button
            variant={
              currentDataType === "companies" ? "primary" : "outline-primary"
            }
            onClick={() => handleDataTypeChange("companies")}
            className="me-2"
          >
            Show Employers
          </Button>
          <Button
            variant={viewMode === "table" ? "primary" : "outline-primary"}
            onClick={() => handleViewModeChange("table")}
            className="me-2"
          >
            Table View
          </Button>
          <Button
            variant={viewMode === "cards" ? "primary" : "outline-primary"}
            onClick={() => handleViewModeChange("cards")}
          >
            Cards View
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowFilterModal(true)}
            className="me-2"
          >
            Manage Filter Presets
          </Button>
        </div>

        {viewMode === "cards" && (
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Form.Select
              onChange={(e) => {
                const [key, direction] = e.target.value.split(":");
                setSortConfig({
                  key: key as keyof JobApplication,
                  direction: direction as "asc" | "desc",
                });
              }}
              defaultValue=""
              style={{ width: "200px" }}
            >
              <option value="" disabled>
                Sort by...
              </option>
              <option value="employer:asc">Employer (A-Z)</option>
              <option value="employer:desc">Employer (Z-A)</option>
              <option value="jobTitle:asc">Job Title (A-Z)</option>
              <option value="jobTitle:desc">Job Title (Z-A)</option>
              <option value="dateAppNotif:asc">
                Date Applied (Oldest First)
              </option>
              <option value="dateAppNotif:desc">
                Date Applied (Newest First)
              </option>
              <option value="lastUpdate:asc">Last Updated (Oldest First)</option>
              <option value="lastUpdate:desc">Last Updated (Newest First)</option>
            </Form.Select>
          </div>
        )}

        {/* View Content */}
        {viewMode === "table" ? renderTable(darkMode) : renderCards()}
        <Modal
          show={showInfoModal}
          onHide={() => setShowInfoModal(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              {selectedApplication?.employer} - Additional Info
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedApplication && (
              <div className="interview-details">
                {modalEditMode ? (
                  // EDIT MODE
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label>Job Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        value={selectedApplication?.jobDescription || ""}
                        onChange={(e) =>
                          setSelectedApplication((prev) =>
                            prev
                              ? { ...prev, jobDescription: e.target.value }
                              : prev
                          )
                        }
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Company Website</Form.Label>
                      <Form.Control
                        type="text"
                        value={selectedApplication?.companyWebsite || ""}
                        onChange={(e) =>
                          setSelectedApplication((prev) =>
                            prev
                              ? { ...prev, companyWebsite: e.target.value }
                              : prev
                          )
                        }
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Role Link</Form.Label>
                      <Form.Control
                        type="text"
                        value={selectedApplication?.roleLink || ""}
                        onChange={(e) =>
                          setSelectedApplication((prev) =>
                            prev ? { ...prev, roleLink: e.target.value } : prev
                          )
                        }
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Work Type</Form.Label>
                      <Select
                        options={[
                          { value: "Remote", label: "Remote" },
                          { value: "Hybrid", label: "Hybrid" },
                          { value: "Office", label: "Office" },
                        ]}
                        value={{
                          value: selectedApplication?.workType || "",
                          label: selectedApplication?.workType || "",
                        }}
                        onChange={(opt) =>
                          setSelectedApplication((prev) =>
                            prev ? { ...prev, workType: opt?.value || "" } : prev
                          )
                        }
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Contract Type</Form.Label>
                      <Select
                        options={[
                          { value: "Full-time", label: "Full-time" },
                          { value: "Part-time", label: "Part-time" },
                          { value: "Contract", label: "Contract" },
                          { value: "Internship", label: "Internship" },
                        ]}
                        value={{
                          value: selectedApplication?.contractType || "",
                          label: selectedApplication?.contractType || "",
                        }}
                        onChange={(opt) =>
                          setSelectedApplication((prev) =>
                            prev
                              ? { ...prev, contractType: opt?.value || "" }
                              : prev
                          )
                        }
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>External Application</Form.Label>
                      <Select
                        options={[
                          { value: "Yes", label: "Yes" },
                          { value: "No", label: "No" },
                        ]}
                        value={{
                          value: selectedApplication?.external || "No",
                          label: selectedApplication?.external || "No",
                        }}
                        onChange={(opt) =>
                          setSelectedApplication((prev) =>
                            prev ? { ...prev, external: opt?.value || "No" } : prev
                          )
                        }
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Notes</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        value={selectedApplication?.notes || ""}
                        onChange={(e) =>
                          setSelectedApplication((prev) =>
                            prev ? { ...prev, notes: e.target.value } : prev
                          )
                        }
                      />
                    </Form.Group>
                  </>
                ) : (
                  // VIEW MODE (Non-editable)
                  <div>
                    <p>
                      <strong>Job Description:</strong>
                      <br />
                      {selectedApplication?.jobDescription || "N/A"}
                    </p>
                    <p>
                      <strong>Company Website:</strong>
                      <br />
                      {selectedApplication?.companyWebsite ? (
                        <a
                          href={selectedApplication.companyWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {selectedApplication.companyWebsite}
                        </a>
                      ) : (
                        "N/A"
                      )}
                    </p>
                    <p>
                      <strong>Role Link:</strong>
                      <br />
                      {selectedApplication?.roleLink ? (
                        <a
                          href={selectedApplication.roleLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {selectedApplication.roleLink}
                        </a>
                      ) : (
                        "N/A"
                      )}
                    </p>
                    <p>
                      <strong>Work Type:</strong>
                      <br />
                      {selectedApplication?.workType || "N/A"}
                    </p>
                    <p>
                      <strong>Contract Type:</strong>
                      <br />
                      {selectedApplication?.contractType || "N/A"}
                    </p>
                    <p>
                      <strong>External Application:</strong>
                      <br />
                      {selectedApplication?.external || "No"}
                    </p>
                    <p>
                      <strong>Notes:</strong>
                      <br />
                      {selectedApplication?.notes || "No notes available."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            {modalEditMode ? (
              <>
                <Button variant="success" onClick={handleModalSave}>
                  Save
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setModalEditMode(false)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  onClick={() => setModalEditMode(true)}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowInfoModal(false)}
                >
                  Close
                </Button>
              </>
            )}
          </Modal.Footer>
        </Modal>

        <div>
          {showAddApplicationModal && (
            <Modal show={true} onHide={closeAddApplicationModal} centered>
              <Modal.Header closeButton>
                <Modal.Title>Add New Job Application</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Employer</Form.Label>
                    <div style={{ position: "relative" }}>
                      <Form.Control
                        type="text"
                        value={newApplication.employer}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewApplication((prev) => ({
                            ...prev,
                            employer: value,
                          }));
                          setSuggestions(
                            getFieldSuggestions("employer", value)
                          );
                          setActiveField("employer");
                        }}
                        onFocus={() =>
                          setSuggestions(
                            getFieldSuggestions(
                              "employer",
                              newApplication.employer || ""
                            )
                          )
                        }
                        onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                      />
                      {activeField === "employer" && suggestions.length > 0 && (
                        <ul
                          style={{
                            position: "absolute",
                            background: "#fff",
                            border: "1px solid #ddd",
                            zIndex: 1000,
                            listStyleType: "none",
                            margin: 0,
                            padding: "10px 0",
                            width: "100%",
                            maxHeight: "200px",
                            overflowY: "auto",
                            borderRadius: "4px",
                          }}
                        >
                          {suggestions.map((suggestion, index) => (
                            <li
                              key={index}
                              style={{
                                padding: "5px 10px",
                                cursor: "pointer",
                                backgroundColor: "white",
                              }}
                              onClick={() => {
                                setNewApplication((prev) => ({
                                  ...prev,
                                  employer: suggestion.value,
                                }));
                                setSuggestions([]);
                              }}
                              onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
                            >
                              {suggestion.label}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Job Title</Form.Label>
                    <div style={{ position: "relative" }}>
                      <Form.Control
                        type="text"
                        value={newApplication.jobTitle}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewApplication((prev) => ({
                            ...prev,
                            jobTitle: value,
                          }));
                          setSuggestions(
                            getFieldSuggestions("jobTitle", value)
                          );
                          setActiveField("jobTitle");
                        }}
                        onFocus={() =>
                          setSuggestions(
                            getFieldSuggestions(
                              "jobTitle",
                              newApplication.jobTitle || ""
                            )
                          )
                        }
                        onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                      />
                      {activeField === "jobTitle" && suggestions.length > 0 && (
                        <ul
                          style={{
                            position: "absolute",
                            background: "#fff",
                            border: "1px solid #ddd",
                            zIndex: 1000,
                            listStyleType: "none",
                            margin: 0,
                            padding: "10px 0",
                            width: "100%",
                            maxHeight: "200px",
                            overflowY: "auto",
                            borderRadius: "4px",
                          }}
                        >
                          {suggestions.map((suggestion, index) => (
                            <li
                              key={index}
                              style={{
                                padding: "5px 10px",
                                cursor: "pointer",
                                backgroundColor: "white",
                              }}
                              onClick={() => {
                                setNewApplication((prev) => ({
                                  ...prev,
                                  jobTitle: suggestion.value,
                                }));
                                setSuggestions([]);
                              }}
                              onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
                            >
                              {suggestion.label}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>City/Town</Form.Label>
                    <div style={{ position: "relative" }}>
                      <Form.Control
                        type="text"
                        value={newApplication.cityTown}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewApplication((prev) => ({
                            ...prev,
                            cityTown: value,
                          }));
                          setSuggestions(
                            getFieldSuggestions("cityTown", value)
                          );
                          setActiveField("cityTown");
                        }}
                        onFocus={() =>
                          setSuggestions(
                            getFieldSuggestions(
                              "cityTown",
                              newApplication.cityTown || ""
                            )
                          )
                        }
                        onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                      />
                      {activeField === "cityTown" && suggestions.length > 0 && (
                        <ul
                          style={{
                            position: "absolute",
                            background: "#fff",
                            border: "1px solid #ddd",
                            zIndex: 1000,
                            listStyleType: "none",
                            margin: 0,
                            padding: "10px 0",
                            width: "100%",
                            maxHeight: "200px",
                            overflowY: "auto",
                            borderRadius: "4px",
                          }}
                        >
                          {suggestions.map((suggestion, index) => (
                            <li
                              key={index}
                              style={{
                                padding: "5px 10px",
                                cursor: "pointer",
                                backgroundColor: "white",
                              }}
                              onClick={() => {
                                setNewApplication((prev) => ({
                                  ...prev,
                                  cityTown: suggestion.value,
                                }));
                                setSuggestions([]);
                              }}
                              onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
                            >
                              {suggestion.label}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {/* Add other fields like Year, General Role, Job Level, etc., without autocomplete */}
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Year</Form.Label>
                    <Select
                      options={yearOptions}
                      value={yearOptions.find(
                        (opt) => opt.value === newApplication.year
                      )}
                      onChange={(opt) =>
                        setNewApplication((prev) => ({
                          ...prev,
                          year: getDefaultValue.number(opt?.value),
                        }))
                      }
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>General Role</Form.Label>
                    <Select
                      options={generalRoleOptions}
                      value={generalRoleOptions.find(
                        (opt) => opt.value === newApplication.generalRole
                      )}
                      onChange={(opt) =>
                        setNewApplication((prev) => ({
                          ...prev,
                          generalRole: getDefaultValue.string(opt?.value),
                        }))
                      }
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Job Level</Form.Label>
                    <Select
                      options={jobLevelOptions}
                      value={jobLevelOptions.find(
                        (opt) => opt.value === newApplication.jobLevel
                      )}
                      onChange={(opt) =>
                        setNewApplication((prev) => ({
                          ...prev,
                          jobLevel: getDefaultValue.string(opt?.value),
                        }))
                      }
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Date Applied</Form.Label>
                    <DatePicker
                      className="form-control"
                      wrapperClassName="d-flex"
                      popperClassName="border-0 shadow-lg"
                      selected={
                        newApplication.dateAppNotif
                          ? new Date(newApplication.dateAppNotif)
                          : null
                      }
                      onChange={(date) =>
                        setNewApplication((prev) => ({
                          ...prev,
                          dateAppNotif: getDefaultValue.date(
                            date?.toISOString().split("T")[0]
                          ),
                        }))
                      }
                      dateFormat="yyyy-MM-dd"
                      isClearable
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Last Update</Form.Label>
                    <DatePicker
                      className="form-control"
                      wrapperClassName="d-flex"
                      popperClassName="border-0 shadow-lg"
                      selected={
                        newApplication.lastUpdate
                          ? new Date(newApplication.lastUpdate)
                          : null
                      }
                      onChange={(date) =>
                        setNewApplication((prev) => ({
                          ...prev,
                          lastUpdate: getDefaultValue.date(
                            date?.toISOString().split("T")[0]
                          ),
                        }))
                      }
                      dateFormat="yyyy-MM-dd"
                      isClearable
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Upcoming Interview Date</Form.Label>
                    <DatePicker
                      className="form-control"
                      wrapperClassName="d-flex"
                      popperClassName="border-0 shadow-lg"
                      selected={
                        newApplication.upcomingInterviewDate
                          ? new Date(newApplication.upcomingInterviewDate)
                          : null
                      }
                      onChange={(date) =>
                        setNewApplication((prev) => ({
                          ...prev,
                          upcomingInterviewDate: getDefaultValue.date(
                            date?.toISOString().split("T")[0]
                          ),
                        }))
                      }
                      dateFormat="yyyy-MM-dd"
                      isClearable
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Last Completed Stage</Form.Label>
                    <Select
                      options={jobStatuses.map((s) => ({ value: s, label: s }))}
                      value={{
                        value: newApplication.lastCompletedStage,
                        label: newApplication.lastCompletedStage,
                      }}
                      onChange={(opt) =>
                        setNewApplication((prev) => ({
                          ...prev,
                          lastCompletedStage:
                            getDefaultValue.string(opt?.value) || "",
                        }))
                      }
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Notes</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={newApplication.notes}
                      onChange={(e) =>
                        setNewApplication((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Job Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={newApplication.jobDescription}
                      onChange={(e) =>
                        setNewApplication((prev) => ({
                          ...prev,
                          jobDescription: e.target.value,
                        }))
                      }
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Company Website</Form.Label>
                    <Form.Control
                      type="text"
                      value={newApplication.companyWebsite}
                      onChange={(e) =>
                        setNewApplication((prev) => ({
                          ...prev,
                          companyWebsite: e.target.value,
                        }))
                      }
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Role Link</Form.Label>
                    <Form.Control
                      type="text"
                      value={newApplication.roleLink}
                      onChange={(e) =>
                        setNewApplication((prev) => ({
                          ...prev,
                          roleLink: e.target.value,
                        }))
                      }
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Work Type</Form.Label>
                    <Select
                      options={[
                        { value: "Remote", label: "Remote" },
                        { value: "Hybrid", label: "Hybrid" },
                        { value: "Office", label: "Office" },
                      ]}
                      value={{
                        value: newApplication.workType || "",
                        label: newApplication.workType || "",
                      }}
                      onChange={(opt) =>
                        setNewApplication((prev) => ({
                          ...prev,
                          workType: opt?.value || "",
                        }))
                      }
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Contract Type</Form.Label>
                    <Select
                      options={[
                        { value: "Full-time", label: "Full-time" },
                        { value: "Part-time", label: "Part-time" },
                        { value: "Contract", label: "Contract" },
                        { value: "Internship", label: "Internship" },
                      ]}
                      value={{
                        value: newApplication.contractType || "",
                        label: newApplication.contractType || "",
                      }}
                      onChange={(opt) =>
                        setNewApplication((prev) => ({
                          ...prev,
                          contractType: opt?.value || "",
                        }))
                      }
                    />
                  </Form.Group>
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="success" onClick={handleSaveNewApplication}>
                  Save
                </Button>
                <Button variant="secondary" onClick={closeAddApplicationModal}>
                  Cancel
                </Button>
              </Modal.Footer>
            </Modal>
          )}
        </div>

        <Modal
          show={showShortcutsModal}
          onHide={() => setShowShortcutsModal(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Keyboard Shortcuts</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ul>
              <li>
                <strong>s</strong> - Focus Search
              </li>
              <li>
                <strong>f</strong> - Focus Filter Search
              </li>
              <li>
                <strong>a</strong> - Applications View
              </li>
              <li>
                <strong>e</strong> - Employers View
              </li>
              <li>
                <strong>g</strong> - Toggle Ghosted Jobs
              </li>
              <li>
                <strong>t</strong> - Table View
              </li>
              <li>
                <strong>c</strong> - Cards View
              </li>
              <li>
                <strong>n</strong> - Add new application
              </li>
              <li>
                <strong>Enter</strong> - Edit currently selected application
              </li>
              <li>
                <strong>Esc</strong> - Cancel edit for currently selected
                application
              </li>
            </ul>
          </Modal.Body>
        </Modal>

        <Modal
          show={deleteModalVisible}
          onHide={() => setDeleteModalVisible(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Confirm Deletion</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to delete this application? This action cannot
            be undone.
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setDeleteModalVisible(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteRow}>
              Delete
            </Button>
          </Modal.Footer>
        </Modal>

        {viewMode == "table" && editingRow !== null && (
          <div
            className="fixed-save-cancel-buttons"
            style={{
              position: "fixed",
              bottom: "20px", // Distance from the bottom of the viewport
              right: "20px", // Distance from the right of the viewport
              zIndex: 1050, // Ensure the buttons are above other UI elements
              display: "flex",
              gap: "10px",
            }}
          >
            <Button
              size="lg"
              variant="success"
              onClick={() => handleSaveRow()} // Save changes
            >
              Save
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                setEditValues({});
                setEditingRow(null);
                toast.info("Changes discarded.");
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        <div ref={bottomRef}></div>

        <>
          <ToastContainer />
          {/* Rest of your component's JSX */}
        </>
        <FilterConfigModal
          show={showFilterModal}
          onHide={() => setShowFilterModal(false)}
          filterConfigs={filterConfigs}
          onSave={handleSaveFilterConfig}
          onDelete={deleteFilterConfig}
          onLoad={handleLoadFilterConfig} // Add this line
          currentConfig={{
            filters: selectedFilters,
            dateRange,
            hideNegativeOutcomes,
            selectedStages,
            searchQuery,
          }}
        />
      </Container>
    );
  }
};

export default JobApplicationTable;
