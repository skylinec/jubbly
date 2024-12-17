import React, { useState, useMemo } from "react";
import { Modal, Form, Button } from "react-bootstrap";
import { PieChart } from "react-minimal-pie-chart";

interface JobApplication {
  id?: number;
  employer: string;
  jobTitle: string;
  cityTown: string;
  generalRole: string;
  jobLevel: string;
  lastCompletedStage: string;
}

interface StatisticsModalProps {
  show: boolean;
  onHide: () => void;
  allJobApplications: JobApplication[];
}

const StatisticsModal: React.FC<StatisticsModalProps> = ({
  show,
  onHide,
  allJobApplications,
}) => {
  // Only include fields that make sense for statistics
  const meaningfulFields = [
    { value: "employer", label: "Employer" },
    { value: "generalRole", label: "General Role" },
    { value: "jobLevel", label: "Job Level" },
    { value: "lastCompletedStage", label: "Job Status" },
    { value: "cityTown", label: "City" },
  ];

  const [selectedStatistic, setSelectedStatistic] = useState(
    meaningfulFields[0].value
  );

  // Generate consistent colors for the pie chart
  const colorCache = useMemo(() => {
    const colors: Record<string, string> = {};
    let index = 0;

    allJobApplications.forEach((app) => {
      const key = app[selectedStatistic as keyof JobApplication];
      if (key && !colors[key]) {
        colors[key] = `hsl(${(index * 137.5) % 360}, 70%, 50%)`; // Golden angle for unique colors
        index++;
      }
    });

    return colors;
  }, [allJobApplications, selectedStatistic]);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};

    allJobApplications.forEach((app) => {
      const key = app[selectedStatistic as keyof JobApplication];
      if (key) {
        counts[key] = (counts[key] || 0) + 1;
      }
    });

    return Object.entries(counts).map(([label, value]) => ({
      title: label,
      value,
      color: colorCache[label],
    }));
  }, [allJobApplications, selectedStatistic, colorCache]);

  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Statistics</Modal.Title>
      </Modal.Header>
      <Modal.Body>
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
          <h5>Total Applications: {allJobApplications.length}</h5>
          <div style={{ position: "relative" }}>
            <PieChart
              data={chartData}
              label={({ dataEntry }) =>
                `${dataEntry.title} (${dataEntry.value})`
              }
              labelStyle={{
                fontSize: "5px",
                fill: "#fff",
                pointerEvents: "none",
              }}
              radius={42}
              labelPosition={112}
              onMouseOver={(_, dataIndex) =>
                setHoveredSegment(chartData[dataIndex]?.title || null)
              }
              onMouseOut={() => setHoveredSegment(null)}
              style={{ height: "200px" }}
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
