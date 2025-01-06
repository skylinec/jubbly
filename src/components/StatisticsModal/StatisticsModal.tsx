import React, { useState, useMemo } from "react";
import { Modal, Form, Button } from "react-bootstrap";
import { PieChart } from "react-minimal-pie-chart";
import { useApplicationContext } from "../../context/ApplicationContext";
import { JobApplication } from "../../types/jobApplication"; // Add this import

interface StatisticsModalProps {
  show: boolean;
  onHide: () => void;
  filteredApplications: JobApplication[];
  useFilteredData: boolean;
  setUseFilteredData: (value: boolean) => void;
}

const StatisticsModal: React.FC<StatisticsModalProps> = ({ 
  show, 
  onHide,
  filteredApplications,
  useFilteredData,
  setUseFilteredData
}) => {
  const { allApplications } = useApplicationContext();
  
  // Remove internal state for useFilteredData
  const activeDataset = useFilteredData ? filteredApplications : allApplications;

  const meaningfulFields = [
    { value: "employer", label: "Employer" },
    { value: "generalRole", label: "General Role" },
    { value: "jobLevel", label: "Job Level" },
    { value: "lastCompletedStage", label: "Job Status" },
    { value: "cityTown", label: "City" },
    { value: "sector", label: "Sector" },
    { value: "workType", label: "Work Type" },
    { value: "contractType", label: "Contract Type" },
  ];

  const [selectedStatistic, setSelectedStatistic] = useState(
    meaningfulFields[0].value
  );

  // Generate consistent colors for the pie chart
  const colorCache = useMemo(() => {
    const colors: Record<string, string> = {};
    let index = 0;

    activeDataset.forEach((app) => {
      const key = String(app[selectedStatistic as keyof JobApplication]);
      if (key && !colors[key]) {
        colors[key] = `hsl(${(index * 137.5) % 360}, 70%, 50%)`; // Golden angle for unique colors
        index++;
      }
    });

    return colors;
  }, [activeDataset, selectedStatistic]);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};

    activeDataset.forEach((app) => {
      const key = String(app[selectedStatistic as keyof JobApplication]);
      if (key) {
        counts[key] = (counts[key] || 0) + 1;
      }
    });

    return Object.entries(counts).map(([label, value]) => ({
      title: label,
      value,
      color: colorCache[label],
    }));
  }, [activeDataset, selectedStatistic, colorCache]);

  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Statistics</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            id="data-source-switch"
            label={`Using ${useFilteredData ? 'filtered' : 'all'} applications`}
            checked={useFilteredData}
            onChange={(e) => setUseFilteredData(e.target.checked)}
          />
        </Form.Group>
        
        <Form.Group>
          <Form.Label>Choose Statistic</Form.Label>
          <Form.Select
            value={selectedStatistic}
            onChange={(e) => setSelectedStatistic(e.target.value)}
          >
            {meaningfulFields.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <div className="text-center mt-4">
          <h5>
            Total Applications: {activeDataset.length}
            {useFilteredData && allApplications.length !== activeDataset.length && (
              <small className="text-muted ms-2">
                (of {allApplications.length} total)
              </small>
            )}
          </h5>
          <div style={{ position: "relative" }}>
            <PieChart
              data={chartData}
              label={({ dataEntry }) => {
                const percentage = Math.round(
                  (dataEntry.value / allApplications.length) * 100
                );
                return `${dataEntry.title}: ${dataEntry.value} (${percentage}%)`;
              }}
              labelStyle={{
                fontSize: "4px",
                fontFamily: "sans-serif",
                fill: "#000",
              }}
              radius={40}
              labelPosition={112}
              paddingAngle={2}
              animate
              segmentsStyle={{ transition: "stroke .3s", cursor: "pointer" }}
              onMouseOver={(_, dataIndex) =>
                setHoveredSegment(chartData[dataIndex]?.title || null)
              }
              onMouseOut={() => setHoveredSegment(null)}
              style={{ height: "300px" }}
            />
            {hoveredSegment && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  background: "rgba(0, 0, 0, 0.75)",
                  color: "#fff",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  pointerEvents: "none",
                }}
              >
                {hoveredSegment}
              </div>
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default StatisticsModal;
