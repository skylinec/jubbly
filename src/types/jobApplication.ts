export interface JobApplication {
  id?: number;                        // Unique identifier
  employer: string;                   // Company name
  jobTitle: string;                   // Position title
  cityTown: string;                   // Location
  year: number;                       // Year of application
  generalRole: string;                // Category of role
  jobLevel: string;                   // Seniority level
  dateAppNotif: string;              // Date application submitted (YYYY-MM-DD)
  lastUpdate: string;                 // Date of last status update (YYYY-MM-DD)
  daNow: number;                      // Days between application date and today
  daLu: number;                      // Days between application date and last update
  luNow: number;                      // Days between last update and today
  upcomingInterviewDate?: string;     // Next interview date (YYYY-MM-DD)
  upcomingInterviewTime?: string;     // Add this new field
  lastCompletedStage: string;         // Current application stage
  notes?: string;                     // Additional notes
  external: string;                   // External application flag
  jobDescription?: string;            // Full job description
  companyWebsite?: string;            // Company website URL
  roleLink?: string;                  // Job posting URL
  sector?: string;                    // Industry sector
  salary?: {                          // Optional salary information
    min?: number;
    max?: number;
    currency?: string;
  };
  interviewHistory?: {                // Optional interview tracking
    date: string;
    type: string;
    notes?: string;
  }[];
  contacts?: {                        // Optional contact information
    name: string;
    role: string;
    email?: string;
    phone?: string;
  }[];
  applicationMethod?: string;         // How the application was submitted
  workType?: string;                  // Remote/Hybrid/Office
  contractType?: string;             // Full-time/Part-time/Contract
}
