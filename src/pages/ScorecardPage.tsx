import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Card, Row, Col, Container, Form, Button } from "react-bootstrap"
import { JobApplication } from "../types/jobApplication";
import { useApplicationContext } from "../context/ApplicationContext";
import { statusColors } from "../utils/constants";
import { fetchFavicon } from "../utils/favicon";
import axios from 'axios';
import { toast } from 'react-toastify';
import debounce from 'lodash/debounce';

interface ScorecardPageProps {
  darkMode?: boolean;
}

const API_URL = "http://10.0.0.101:5000/applications"; // Add this line

// Add sort options
const SORT_OPTIONS = [
  { value: 'employer-asc', label: 'Employer (A-Z)' },
  { value: 'employer-desc', label: 'Employer (Z-A)' },
  { value: 'jobTitle-asc', label: 'Job Title (A-Z)' },
  { value: 'jobTitle-desc', label: 'Job Title (Z-A)' },
  { value: 'score-asc', label: 'Score (Low to High)' },
  { value: 'score-desc', label: 'Score (High to Low)' },
  { value: 'stage-asc', label: 'Stage (A-Z)' },
  { value: 'stage-desc', label: 'Stage (Z-A)' },
];

const INTERVIEW_STAGES = [
  "Recruiter Conversation/Screening",
  "Online Assessment",
  "Interview Offered",
  "Interview 1",
  "Interview 2",
  "Interview 3",
  "Offer",
  "Offer Accepted",
//   "Offer Declined"
];

const DEFAULT_FACTORS = [
  { id: "communication", name: "Communication", max: 10 },
  { id: "skillMatch", name: "Skill Match", max: 10 },
  { id: "friendliness", name: "Friendliness", max: 10 },
  { id: "cultureFit", name: "Culture Fit", max: 10 },
  { id: "compensation", name: "Compensation", max: 10 },
  { id: "growthPotential", name: "Growth Potential", max: 10 },
  { id: "workplace", name: "Workplace", max: 10 },
  { id: "benefits", name: "Benefits", max: 10 }
];

const ScorecardPage: React.FC<ScorecardPageProps> = ({ darkMode }) => {
  const { allApplications } = useApplicationContext();
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});
  const [sortBy, setSortBy] = useState<string>('employer-asc');
  const [sortedApps, setSortedApps] = useState<JobApplication[]>([]);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [currentSortedApps, setCurrentSortedApps] = useState<JobApplication[]>([]);
  
  // Add local cache ref to prevent unnecessary server calls
  const scoresCache = useRef<Record<string, Record<string, number>>>({});
  
  // Memoize filtered applications
  const interviewApps = useMemo(() => 
    allApplications.filter(app => INTERVIEW_STAGES.includes(app.lastCompletedStage)),
    [allApplications]
  );

  // Batch load scores on mount
  useEffect(() => {
    const loadAllScores = async () => {
      try {
        // Get all application IDs
        const appIds = interviewApps.map(app => app.id).filter(Boolean);
        
        // Check cache first
        const idsToFetch = appIds.filter(id => !scoresCache.current[id!]);
        
        if (idsToFetch.length === 0) {
          setScores(scoresCache.current);
          return;
        }

        // Fetch all scores in parallel
        const promises = idsToFetch.map(id =>
          axios.get(`${API_URL}/${id}/scores`)
            .then(response => ({ id, scores: response.data.scores }))
            .catch(error => {
              console.error(`Failed to load scores for ${id}:`, error);
              return { id, scores: {} };
            })
        );

        const results = await Promise.all(promises);
        
        // Update cache and state
        const newScores = { ...scoresCache.current };
        results.forEach(({ id, scores }) => {
          if (id) {
            newScores[id] = scores;
          }
        });
        
        scoresCache.current = newScores;
        setScores(newScores);
      } catch (error) {
        console.error('Error loading scores:', error);
        toast.error('Failed to load some scores');
      }
    };

    loadAllScores();
  }, [interviewApps]);

  // Debounced save function
  const debouncedSave = useMemo(
    () => debounce(async (appId: number, factorId: string, value: number) => {
      try {
        setIsSaving(true);
        await axios.post(`${API_URL}/${appId}/scores`, {
          scores: { [factorId]: value }
        });
        
        // Update cache
        scoresCache.current[appId] = {
          ...scoresCache.current[appId],
          [factorId]: value
        };
        
        toast.success('Score saved');
      } catch (error) {
        console.error('Failed to save score:', error);
        toast.error('Failed to save score');
        
        // Revert cache and state on error
        setScores(prevScores => ({
          ...prevScores,
          [appId]: scoresCache.current[appId] || {}
        }));
      } finally {
        setIsSaving(false);
      }
    }, 500),
    []
  );

  // Modified score change handler
  const handleScoreChange = useCallback((appId: number, factorId: string, value: number) => {
    // Update local state immediately
    setScores(prev => ({
      ...prev,
      [appId]: {
        ...(prev[appId] || {}),
        [factorId]: value
      }
    }));

    // Set refresh needed for sorting
    if (sortBy.startsWith('score-')) {
      setNeedsRefresh(true);
    }

    // Trigger debounced save
    debouncedSave(appId, factorId, value);
  }, [sortBy, debouncedSave]);

  // Add handler for removing scores
  const handleRemoveScore = useCallback(async (appId: number, factorId: string) => {
    try {
      setIsSaving(true);
      
      // Update local state immediately
      setScores(prev => ({
        ...prev,
        [appId]: {
          ...prev[appId],
          [factorId]: undefined
        }
      }));

      // Update cache
      if (scoresCache.current[appId]) {
        delete scoresCache.current[appId][factorId];
      }

      // Send delete request to server
      await axios.delete(`${API_URL}/${appId}/scores/${factorId}`);
      
      if (sortBy.startsWith('score-')) {
        setNeedsRefresh(true);
      }

      toast.success('Rating removed');
    } catch (error) {
      console.error('Failed to remove score:', error);
      toast.error('Failed to remove rating');
      
      // Restore from cache on error
      setScores(prevScores => ({
        ...prevScores,
        [appId]: scoresCache.current[appId] || {}
      }));
    } finally {
      setIsSaving(false);
    }
  }, [sortBy]);

  // Cleanup
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  const calculateTotalScore = (appId: number) => {
    const appScores = scores[appId] || {};
    // Only count scores for factors that exist in DEFAULT_FACTORS
    const validScores = Object.entries(appScores)
      .filter(([factorId]) => DEFAULT_FACTORS.some(f => f.id === factorId));
    
    const ratedFactors = validScores.length;
    if (ratedFactors === 0) return { total: 0, percentage: 0, ratedFactors: 0 };
  
    const total = validScores.reduce((sum, [_, score]) => sum + score, 0);
    const maxPossible = ratedFactors * 10;
    return { 
      total, 
      percentage: (total / maxPossible) * 100,
      ratedFactors
    };
  };

  const sortApplications = useCallback((apps: JobApplication[]) => {
    return [...apps].sort((a, b) => {
      const [field, direction] = sortBy.split('-');
      const multiplier = direction === 'asc' ? 1 : -1;

      switch (field) {
        case 'employer':
          return multiplier * a.employer.localeCompare(b.employer);
        case 'jobTitle':
          return multiplier * a.jobTitle.localeCompare(b.jobTitle);
        case 'stage':
          return multiplier * a.lastCompletedStage.localeCompare(b.lastCompletedStage);
        case 'score':
          const scoreA = calculateTotalScore(a.id || 0);
          const scoreB = calculateTotalScore(b.id || 0);
          // If neither has been rated, maintain original order
          if (scoreA.ratedFactors === 0 && scoreB.ratedFactors === 0) return 0;
          // Put unrated applications at the end
          if (scoreA.ratedFactors === 0) return 1;
          if (scoreB.ratedFactors === 0) return -1;
          // Sort by percentage when both have ratings
          return multiplier * (scoreA.percentage - scoreB.percentage);
        default:
          return 0;
      }
    });
  }, [scores, sortBy]);

  // Update the sorting effect to handle score changes
  useEffect(() => {
    const sorted = sortApplications(interviewApps);
    setSortedApps(sorted);
  }, [sortBy, interviewApps, scores]); // Add scores as dependency

  // Update the refresh handler
  const handleRefresh = useCallback(() => {
    console.log('Manually refreshing sort order');
    const sorted = sortApplications(interviewApps);
    setCurrentSortedApps(sorted);
    setNeedsRefresh(false);
  }, [interviewApps, sortApplications]);

  // Add an effect to monitor score changes
  useEffect(() => {
    if (sortBy.startsWith('score-')) {
      setNeedsRefresh(true);
    }
  }, [scores, sortBy]);

  // Memoize sorted applications
  const sortedApplications = useMemo(() => 
    sortApplications(interviewApps),
    [interviewApps, scores, sortBy]
  );

  // Update initial load effect
  useEffect(() => {
    const initialSort = sortApplications(interviewApps);
    setCurrentSortedApps(initialSort);
  }, [interviewApps]); // Deliberately exclude scores and sortBy

  // Update sort change handler
  const handleSortChange = useCallback((newSortBy: string) => {
    setSortBy(newSortBy);
    if (newSortBy.startsWith('score-')) {
      // When switching to score-based sorting, force refresh
      setNeedsRefresh(true);
    } else {
      // For non-score sorts, update immediately
      const sorted = sortApplications(interviewApps);
      setCurrentSortedApps(sorted);
    }
  }, [interviewApps, sortApplications]);

  return (
    <Container fluid className={`scorecard-page ${darkMode ? "dark" : "light"}`}>
      <div className="d-flex justify-content-between align-items-center my-4">
        <h2>Interview Scorecard</h2>
        <div className="d-flex align-items-center gap-2">
          {needsRefresh && (
            <Button 
              variant="warning"
              size="sm"
              onClick={handleRefresh}
            >
              Refresh Score Sorting
            </Button>
          )}
          <Form.Select 
            style={{ width: 'auto' }}
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        </div>
      </div>
      
      <Row xs={1} sm={2} md={3} lg={4} xl={6} className="g-3">
        {currentSortedApps.map((app) => {
          const stageColor = statusColors[app.lastCompletedStage] || "#ddd";
          const { total, percentage, ratedFactors } = calculateTotalScore(app.id || 0);

          return (
            <Col key={app.id}>
              <Card style={{ borderColor: stageColor }} className="h-100 compact-card">
                <Card.Header
                  style={{
                    backgroundColor: stageColor,
                    display: "flex",
                    alignItems: "center",
                    padding: "0.5rem",
                    gap: "0.5rem",
                  }}
                >
                  <img
                    src={fetchFavicon({
                      name: app.employer,
                      companyWebsite: app.companyWebsite,
                    })}
                    alt={`${app.employer} favicon`}
                    style={{ width: "20px", height: "20px", borderRadius: "4px" }}
                  />
                  <div className="text-truncate flex-grow-1">
                    <strong className="small">{app.jobTitle}</strong>
                  </div>
                </Card.Header>

                <Card.Body className="p-2">
                  <div className="small mb-2">
                    <strong>{app.employer}</strong>
                    <div className="badge bg-secondary text-wrap" style={{ fontSize: '0.7rem' }}>
                      {app.lastCompletedStage}
                    </div>
                  </div>
                  
                  <div className="factors-grid">
                    {DEFAULT_FACTORS.map(factor => {
                      const hasScore = (scores[app.id || 0]?.[factor.id] !== undefined);
                      return (
                        <Form.Group 
                          key={factor.id} 
                          className="mb-1"
                          title={hasScore ? "Click × to remove this rating" : ""}
                        >
                          <Form.Label 
                            className="small mb-0 d-flex justify-content-between align-items-center"
                            style={{ cursor: hasScore ? 'pointer' : 'default' }}
                            onClick={(e) => {
                              if (hasScore && window.confirm(`Remove ${factor.name} rating?`)) {
                                handleRemoveScore(app.id || 0, factor.id);
                              }
                            }}
                          >
                            <span>{factor.name}</span>
                            <span className={`text-muted ${!hasScore ? 'fst-italic' : 'rating-value'}`}>
                              {hasScore ? 
                                `${scores[app.id || 0]?.[factor.id] || 0}/${factor.max}` : 
                                'Not rated'
                              }
                            </span>
                          </Form.Label>
                          <Form.Range
                            min={0}
                            max={factor.max}
                            value={scores[app.id || 0]?.[factor.id] || 0}
                            onChange={(e) => handleScoreChange(app.id || 0, factor.id, Number(e.target.value))}
                            onMouseUp={() => {
                              // Force immediate save on mouse up
                              if (saveTimer) {
                                clearTimeout(saveTimer);
                                setSaveTimer(null);
                              }
                            }}
                            className={`compact-range ${!hasScore ? 'unrated' : ''}`}
                          />
                        </Form.Group>
                      );
                    })}
                  </div>

                  <div className="mt-2">
                    <div className="progress" style={{ height: "0.5rem" }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{ width: `${percentage}%` }}
                        aria-valuenow={percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                    <div className="text-center small mt-1">
                      {ratedFactors > 0 ? (
                        <>
                          {total}/{ratedFactors * 10} ({Math.round(percentage)}%)
                          <span className="text-muted ms-2">
                            ({ratedFactors} of {DEFAULT_FACTORS.length} rated)
                          </span>
                        </>
                      ) : (
                        <span className="text-muted">No ratings yet</span>
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
      {isSaving && (
        <div>
        <div className="position-fixed bottom-0 end-0 p-3"></div>
          <div className="alert alert-info">Saving scores...</div>
        </div>
      )}
    </Container>
  );
};

export default React.memo(ScorecardPage);