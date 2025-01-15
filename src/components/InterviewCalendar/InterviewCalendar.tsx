import React, { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, View, Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { Modal, Button } from "react-bootstrap";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { JobApplication } from "../../types/jobApplication";
import { useApplicationContext } from "../../context/ApplicationContext";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const API_URL = "http://10.0.0.101:5000/applications";

interface InterviewCalendarProps {
  darkMode: boolean;
}

const InterviewCalendar: React.FC<InterviewCalendarProps> = ({ darkMode }) => {
  const { allApplications, loading } = useApplicationContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<JobApplication | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<View>("month");

  const events = allApplications
    .filter((app) => app.upcomingInterviewDate && 
      !["Ghosted", "Rejected", "Dropped Out", "Offer Declined"].includes(app.lastCompletedStage))
    .map((app) => {
      const interviewDate = new Date(app.upcomingInterviewDate!);
      
      // Parse time if available, otherwise default to 9 AM
      if (app.upcomingInterviewTime) {
        const [hours, minutes] = app.upcomingInterviewTime.split(':');
        interviewDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
      } else {
        interviewDate.setHours(9, 0, 0);
      }

      return {
        id: app.id,
        title: `${format(interviewDate, "HH:mm")} - ${app.employer}: ${app.jobTitle} (${app.lastCompletedStage})`,
        start: interviewDate,
        end: new Date(interviewDate.getTime() + 60 * 60 * 1000), // Default 1-hour duration
        resource: app,
      };
    });

  useEffect(() => {
    // Keep the calendar in sync with application updates
    setCurrentDate(new Date());
  }, [allApplications]);

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  const formatDate = (date: string | undefined): string => {
    if (!date) return "N/A";
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return "N/A";
    return parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`interview-calendar p-4 ${darkMode ? "dark" : "light"}`}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "calc(100vh - 120px)" }}
        date={currentDate}
        onNavigate={handleNavigate}
        view={view}
        onView={handleViewChange}
        views={["month", "week", "day", "agenda"]}
        popup
        onSelectEvent={(event: { resource: JobApplication }) => {
          if (event.resource) {
            setSelectedEvent(event.resource);
            setShowModal(true);
          }
        }}
        eventPropGetter={(event) => {
          const app = event.resource as JobApplication;
          let backgroundColor = "#007bff"; // default color

          switch (app.lastCompletedStage) {
            case "Interview Offered":
              backgroundColor = "#ffcc80";
              break;
            case "Interview 1":
              backgroundColor = "#fff176";
              break;
            case "Interview 2":
              backgroundColor = "#a5d6a7";
              break;
            case "Interview 3":
              backgroundColor = "#80cbc4";
              break;
            case "Offer":
              backgroundColor = "#81c784";
              break;
            case "Offer Accepted":
              backgroundColor = "#66bb6a";
              break;
          }

          return {
            style: {
              backgroundColor,
              color: "black",
              borderRadius: "4px",
              border: "none",
              padding: "2px 5px",
              fontSize: "90%",
            },
          };
        }}
      />

      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Interview Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEvent && (
            <div className="interview-details">
              <div className="mb-4">
                <h4 className="company-title">{selectedEvent.employer}</h4>
                <p className="text-muted">
                  {selectedEvent.upcomingInterviewDate &&
                    format(
                      new Date(selectedEvent.upcomingInterviewDate),
                      "EEEE, MMMM do yyyy 'at' HH:mm"
                    )}
                </p>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <h5>Job Details</h5>
                  <dl className="row">
                    <dt className="col-sm-4">Position</dt>
                    <dd className="col-sm-8">{selectedEvent.jobTitle}</dd>

                    <dt className="col-sm-4">Location</dt>
                    <dd className="col-sm-8">{selectedEvent.cityTown}</dd>

                    <dt className="col-sm-4">Level</dt>
                    <dd className="col-sm-8">{selectedEvent.jobLevel}</dd>

                    <dt className="col-sm-4">Role Type</dt>
                    <dd className="col-sm-8">{selectedEvent.generalRole}</dd>

                    <dt className="col-sm-4">Sector</dt>
                    <dd className="col-sm-8">
                      {selectedEvent.sector || "N/A"}
                    </dd>

                    <dt className="col-sm-4">Work Type</dt>
                    <dd className="col-sm-8">
                      {selectedEvent.workType || "N/A"}
                    </dd>

                    <dt className="col-sm-4">Contract</dt>
                    <dd className="col-sm-8">
                      {selectedEvent.contractType || "N/A"}
                    </dd>

                    {selectedEvent.salary && (
                      <>
                        <dt className="col-sm-4">Salary Range</dt>
                        <dd className="col-sm-8">
                          {selectedEvent.salary.currency || "£"}
                          {selectedEvent.salary.min || 0} -
                          {selectedEvent.salary.currency || "£"}
                          {selectedEvent.salary.max || 0}
                        </dd>
                      </>
                    )}
                  </dl>
                </div>

                <div className="col-md-6">
                  <h5>Application Status</h5>
                  <dl className="row">
                    <dt className="col-sm-4">Current Stage</dt>
                    <dd className="col-sm-8">
                      {selectedEvent.lastCompletedStage}
                    </dd>

                    <dt className="col-sm-4">Applied Date</dt>
                    <dd className="col-sm-8">
                      {formatDate(selectedEvent.dateAppNotif)}
                    </dd>

                    <dt className="col-sm-4">Last Update</dt>
                    <dd className="col-sm-8">
                      {formatDate(selectedEvent.lastUpdate)}
                    </dd>

                    <dt className="col-sm-4">Days Active</dt>
                    <dd className="col-sm-8">
                      {selectedEvent.dateAppNotif
                        ? Math.ceil(
                            (new Date().getTime() -
                              new Date(selectedEvent.dateAppNotif).getTime()) /
                              (1000 * 60 * 60 * 24)
                          )
                        : "N/A"}{" "}
                      days
                    </dd>
                  </dl>
                </div>
              </div>

              {(selectedEvent.notes || selectedEvent.jobDescription) && (
                <div className="mt-4">
                  <h5>Additional Information</h5>
                  {selectedEvent.notes && (
                    <div className="mb-3">
                      <strong>Notes:</strong>
                      <p className="text-muted mb-0">{selectedEvent.notes}</p>
                    </div>
                  )}
                  {selectedEvent.jobDescription && (
                    <div>
                      <strong>Job Description:</strong>
                      <p className="text-muted mb-0">
                        {selectedEvent.jobDescription}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedEvent.contacts && selectedEvent.contacts.length > 0 && (
                <div className="mt-4">
                  <h5>Contacts</h5>
                  {selectedEvent.contacts.map((contact, index) => (
                    <div key={index} className="mb-2">
                      <strong>{contact.name}</strong> - {contact.role}
                      {contact.email && <div>Email: {contact.email}</div>}
                      {contact.phone && <div>Phone: {contact.phone}</div>}
                    </div>
                  ))}
                </div>
              )}

              {selectedEvent.interviewHistory &&
                selectedEvent.interviewHistory.length > 0 && (
                  <div className="mt-4">
                    <h5>Interview History</h5>
                    {selectedEvent.interviewHistory.map((interview, index) => (
                      <div key={index} className="mb-2">
                        <strong>
                          {format(new Date(interview.date), "MMMM do yyyy")}
                        </strong>{" "}
                        - {interview.type}
                        {interview.notes && (
                          <p className="text-muted mb-0">{interview.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              <div className="mt-4">
                <h5>Links</h5>
                <div className="d-flex gap-3">
                  {selectedEvent.roleLink && (
                    <a
                      href={selectedEvent.roleLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-primary btn-sm"
                    >
                      View Job Posting
                    </a>
                  )}
                  {selectedEvent.companyWebsite && (
                    <a
                      href={selectedEvent.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-secondary btn-sm"
                    >
                      Company Website
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default InterviewCalendar;
