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

import StatisticsModal from "../StatisticsModal/StatisticsModal"; // Adjust the path as needed

interface JobApplicationTableProps {
  showAddApplicationModal: boolean;
  onCloseAddApplicationModal: () => void;
  darkMode: boolean; // Add darkMode prop
}

interface JobApplication {
  id?: number;
  employer: string;
  jobTitle: string;
  cityTown: string;
  year: number;
  generalRole: string;
  jobLevel: string;
  dateAppNotif: string;
  lastUpdate: string;
  daNow: number;
  daLu: number;
  luNow: number;
  upcomingInterviewDate?: string | undefined; // Ensure compatibility
  lastCompletedStage: string;
  notes?: string;
  external: string;
  jobDescription?: string;
  companyWebsite?: string;
  roleLink?: string;
  sector?: string; // Optional to ensure backward compatibility
}

interface Company {
  name: string;
  companyWebsite?: string;
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
  "Ghosted",
  "Rejected",
];

const statusColors: { [key: string]: string } = {
  Applied: "#e7f0fe",
  "Recruiter Conversation/Screening": "#e2ffd9",
  "Interview Offered": "#d1f7c4",
  "Online Assessment": "#a8ed91",
  "In-Person Assessment": "#6fd94c",
  "Interview 1": "#c4f0f7",
  "Interview 2": "#c4e4f7",
  "Interview 3": "#c4c7f7",
  Ghosted: "#f7d4c4",
  Rejected: "#f7c4c4",
  "Other (Custom)": "#f5f5f5",
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

const fetchCompanyFavicon = (company: Company): string => {
  if (company.companyWebsite) {
    // Extract domain
    try {
      const url = new URL(company.companyWebsite);
      return `https://www.google.com/s2/favicons?sz=64&domain=${url.hostname}`;
    } catch (e) {
      // Invalid URL fallback
    }
  }
  const normalizedEmployer = company.name.replace(/\s+/g, "").toLowerCase();
  return `https://www.google.com/s2/favicons?sz=64&domain=${normalizedEmployer}.com`;
};

const JobApplicationTable: React.FC<JobApplicationTableProps> = ({
  showAddApplicationModal,
  onCloseAddApplicationModal,
  darkMode,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const tableRef = useRef<HTMLTableElement | null>(null); // Ref for the table element
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<JobApplication>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  // const [filter, setFilter] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof JobApplication | null;
    direction: "asc" | "desc";
  }>({
    key: null,
    direction: "asc",
  });

  const [showModal, setShowModal] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string | null>(null);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
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

  const [selectedFilters, setSelectedFilters] = useState<FilterOption[]>([]);

  const [hideGhostedRejected, setHideGhostedRejected] = useState(false);

  const [dateRange, setDateRange] = useState<
    [Date | undefined, Date | undefined]
  >([undefined, undefined]);

  const [newApplication, setNewApplication] = useState<Partial<JobApplication>>(
    {
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
    }
  );

  const [searchQuery, setSearchQuery] = useState<string>("");

  const searchSelectRef = useRef<any>(null); // React-select uses 'any' for its ref
  const searchRef = useRef<any>(null); // React-select uses 'any' for its ref

  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const editingRef = useRef<HTMLElement | null>(null);
  const [buttonPosition, setButtonPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

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
            setHideGhostedRejected((prev) => !prev);
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
    setHideGhostedRejected,
    setViewMode,
    setShowShortcutsModal,
  ]);

  const handleFocus = () => {
    setIsSearchFocused(true);
  };

  const handleBlur = () => {
    setIsSearchFocused(false);
  };

  const [isSticky, setIsSticky] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const initialOffset = useRef<number | null>(null);

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

    const hideGhostedRejectedFromURL = params.get("hideGhostedRejected");
    setHideGhostedRejected(hideGhostedRejectedFromURL === "true");
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
    params.set("hideGhostedRejected", hideGhostedRejected.toString());

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
    hideGhostedRejected,
    dateRange,
    navigate,
  ]);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await axios.get(API_URL);
        console.log("Backend API Response:", response.data); // Debug log
        const formattedData: JobApplication[] = response.data.map(
          (application: any, index: number) => ({
            id: application.id || application._id || index, // Use index as fallback
            employer: application.employer || "", // Default to empty string
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
            upcomingInterviewDate:
              application.upcoming_interview_date || undefined,
            lastCompletedStage: application.last_completed_stage || "",
            notes: application.notes || "",
            external: application.external || "No",
            jobDescription: application.job_description || "",
            companyWebsite: application.company_website || "",
            roleLink: application.role_link || "",
            sector: application.sector || "",
          })
        );

        setAllJobApplications(formattedData); // Store all applications
        setJobApplications(formattedData);

        // Populate allSuggestions with unique values by category
        const suggestionsSet: { [key: string]: Set<string> } = {
          Employer: new Set(),
          City: new Set(),
          JobTitle: new Set(),
          GeneralRole: new Set(),
          JobLevel: new Set(),
          Sector: new Set(),
        };

        formattedData.forEach((app) => {
          if (app.employer) suggestionsSet.Employer.add(app.employer);
          if (app.cityTown) suggestionsSet.City.add(app.cityTown);
          if (app.jobTitle) suggestionsSet.JobTitle.add(app.jobTitle);
          if (app.generalRole) suggestionsSet.GeneralRole.add(app.generalRole);
          if (app.jobLevel) suggestionsSet.JobLevel.add(app.jobLevel);
          if (app.sector) suggestionsSet.Sector.add(app.sector);
        });

        const suggestionsArray = Object.entries(suggestionsSet).flatMap(
          ([type, values]) =>
            Array.from(values).map((value) => ({ value, label: value, type }))
        );

        setAllSuggestions(suggestionsArray);
        console.log("All Suggestions:", suggestionsArray);

        const companyMap = new Map<
          string,
          { name: string; companyWebsite?: string }
        >();
        for (const app of formattedData) {
          // If we haven't stored this company yet, store it now
          if (!companyMap.has(app.employer)) {
            companyMap.set(app.employer, {
              name: app.employer,
              companyWebsite: app.companyWebsite,
            });
          }
        }

        setCompanies(Array.from(companyMap.values()));
      } catch (error) {
        toast.error("Failed to fetch job applications. Please try again.", {
          position: "top-center",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

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

  const handleSaveApplication = async (
    application: JobApplication | Partial<JobApplication>,
    isNew: boolean = false
  ) => {
    try {
      const response = isNew
        ? await axios.post(API_URL, application)
        : await axios.put(`${API_URL}/${application.id}`, application);

      const updatedApplication: JobApplication = {
        id: isNew ? response.data.id : application.id!,
        employer: application.employer || "",
        jobTitle: application.jobTitle || "",
        cityTown: application.cityTown || "",
        year: application.year || new Date().getFullYear(),
        generalRole: application.generalRole || "",
        jobLevel: application.jobLevel || "",
        dateAppNotif: application.dateAppNotif || "",
        lastUpdate: application.lastUpdate || "",
        daNow: application.daNow || 0,
        daLu: application.daLu || 0,
        luNow: application.luNow || 0,
        upcomingInterviewDate: application.upcomingInterviewDate || undefined,
        lastCompletedStage: application.lastCompletedStage || "",
        notes: application.notes || "",
        external: application.external || "No",
        jobDescription: application.jobDescription || "",
        companyWebsite: application.companyWebsite || "",
        roleLink: application.roleLink || "",
        sector: application.sector || "",
      };

      // Update the job applications state
      setJobApplications((prev) =>
        isNew
          ? [...prev, updatedApplication]
          : prev.map((app) =>
              app.id === updatedApplication.id ? updatedApplication : app
            )
      );

      setEditingRow(null);
      toast.success(`Application ${isNew ? "added" : "updated"} successfully!`);
    } catch (error) {
      console.error("Error saving application:", error);
      toast.error("Failed to save application. Please try again.");
    }
  };

  const handleModalSave = () => handleSaveApplication(selectedApplication!);
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
  //       year: newApplication.year || new Date().getFullYear(),
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

    // Replace `selectedFilters` processing with groupedFilters
    const matchesGroupedFilters = Object.entries(groupedFilters).every(
      ([type, values]) => {
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
      }
    );

    const matchesStages =
      selectedStages.length === 0 ||
      selectedStages.includes(application.lastCompletedStage);

    const matchesHideGhostedRejected =
      !hideGhostedRejected || // If the toggle is off, include all applications
      (application.lastCompletedStage !== "Ghosted" &&
        application.lastCompletedStage !== "Rejected");

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
      matchesHideGhostedRejected &&
      matchesDateRange
    );
  };

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

      // Add to jobApplications
      setJobApplications((prev) => [...prev, savedApplication]);

      // Dynamically recalculate filteredApplications
      if (matchesFilters(savedApplication)) {
        // Optionally trigger UI changes for visibility
        setEditingRow(savedApplication.id!);
        setEditValues(savedApplication); // Pre-fill the editing values
        setTimeout(() => {
          const newRowIndex = jobApplications.findIndex(
            (app) => app.id === savedApplication.id
          );
          const row = tableRowRefs.current[newRowIndex];
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100); // Wait for the table to update
        toast.success("New application added and matches filters!", {
          position: "top-center",
        });
      } else {
        toast.info(
          "New application added but doesn't match current filters. Adjust filters to see it.",
          { position: "top-center" }
        );
      }
    } catch (error) {
      console.error("Error adding new application:", error);
      toast.error("Failed to add new application. Please try again.");
    }
  };

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
    type: "text" | "number" | "date" | "select",
    id?: number,
    options?: { value: any; label: string }[]
  ) => {
    const application = jobApplications.find((app) => app.id === id);
    const currentValue = editValues[field] || application?.[field] || "";

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
            value={currentValue}
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

      return (
        <div style={{ width: "100%" }}>
          <DatePicker
            className="form-control"
            popperClassName="border-0 shadow-lg"
            selected={
              parsedDate instanceof Date && !isNaN(parsedDate.getTime())
                ? parsedDate
                : null
            }
            onChange={(date) =>
              handleEditChange(field, date?.toISOString().split("T")[0] || "")
            }
            dateFormat="yyyy-MM-dd"
            isClearable
          />
        </div>
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
        value={currentValue}
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

  const filteredApplications = jobApplications.filter((app) => {
    return matchesFilters(app);
  });

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
            const selectedApplication = filteredApplications[currentIndex];
            if (selectedApplication) {
              handleEditRow(selectedApplication.id!); // Enter edit mode for the selected card
            }
            return currentIndex;
          }

          return nextIndex;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sortedApplications, handleEditRow]);

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
    hideGhostedRejected,
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
                    (el) => (tableRowRefs.current[index] = el), // Ref for scrolling
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
                      src={fetchCompanyFavicon(
                        getCompanyForJob(job, companies)
                      )}
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
                      <td>{job.dateAppNotif || "N/A"}</td>
                      <td>{job.lastUpdate || "N/A"}</td>
                      <td style={{ backgroundColor }}>
                        {job.dateAppNotif ? daysSinceApplied : "N/A"}
                      </td>
                      <td>
                        {calculateDaysBetween(job.dateAppNotif, job.lastUpdate)}
                      </td>
                      <td>{job.upcomingInterviewDate || "N/A"}</td>
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
            </tr>
          </thead>
          <tbody>
            {filteredCompanies.map((company, index) => (
              <tr key={index}>
                <td>
                  {fetchCompanyFavicon(company) && (
                    <img
                      src={fetchCompanyFavicon(company)}
                      alt="favicon"
                      style={{ width: 24, height: 24 }}
                    />
                  )}
                </td>
                <td>{company.name}</td>
                <td>
                  {/* For companies, maybe a "More Info" or "View Applications" link */}
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
          <tfoot></tfoot>
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

            const faviconUrl = fetchCompanyFavicon(
              getCompanyForJob(job, companies)
            );

            // Calculate DA-LU only if dateAppNotif and lastUpdate are defined
            const daLuValue =
              job.dateAppNotif && job.lastUpdate
                ? calculateDaysBetween(job.dateAppNotif, job.lastUpdate)
                : null;

            return (
              <Col
                key={job.id}
                ref={combineRefs(
                  (el) => (cardRefs.current[index] = el), // Ref for scrolling
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
                          {job.dateAppNotif || "N/A"}
                          <br />
                          <strong>Last Update:</strong>{" "}
                          {job.lastUpdate || "N/A"}
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
              const faviconUrl = fetchCompanyFavicon(company);
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
              onHide={() => setShowStatisticsModal(false)}
              allJobApplications={allJobApplications} // Pass the unfiltered applications
            />
          </>
          <Button
            variant={hideGhostedRejected ? "secondary" : "primary"}
            onClick={() => setHideGhostedRejected((prev) => !prev)}
            className="me-2"
          >
            {hideGhostedRejected
              ? "Show All Applications"
              : "Hide Ghosted & Rejected"}
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
        </div>

        {viewMode === "cards" ? (
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
              <option value="lastUpdate:asc">
                Last Updated (Oldest First)
              </option>
              <option value="lastUpdate:desc">
                Last Updated (Newest First)
              </option>
            </Form.Select>
          </div>
        ) : (
          <div></div>
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
                  <strong>Notes:</strong>
                  <br />
                  {selectedApplication?.notes || "No notes available."}
                </p>
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
            <Modal show={true} onHide={onCloseAddApplicationModal} centered>
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
                          year: opt?.value,
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
                          generalRole: opt?.value,
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
                          jobLevel: opt?.value,
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
                          dateAppNotif: date?.toISOString().split("T")[0],
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
                          lastUpdate: date?.toISOString().split("T")[0],
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
                          upcomingInterviewDate: date
                            ?.toISOString()
                            .split("T")[0],
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
                          lastCompletedStage: opt?.value || "",
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
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="success"
                  onClick={() =>
                    handleSaveApplication(selectedApplication!, false)
                  }
                >
                  Save
                </Button>
                <Button
                  variant="secondary"
                  onClick={onCloseAddApplicationModal}
                >
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
      </Container>
    );
  }
};

export default JobApplicationTable;