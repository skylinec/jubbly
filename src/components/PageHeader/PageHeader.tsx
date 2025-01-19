import React from "react";
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import { useApplicationContext } from "../../context/ApplicationContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Nav } from "react-bootstrap";

interface PageHeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  darkMode,
  onToggleDarkMode,
}) => {
  const { handleAddApplication } = useApplicationContext();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Navbar bg={darkMode ? "dark" : "secondary"} variant={darkMode ? "dark" : "light"}>
      <Container>
        <div className="d-flex align-items-center gap-3">
          <Navbar.Brand as={Link} to="/">Jubbly</Navbar.Brand>
          
          {/* Navigation buttons on the left */}
          <Button 
            variant={location.pathname === "/" ? "light" : "outline-light"}
            onClick={() => navigate("/")}
          >
            Applications
          </Button>

          <Button 
            variant={location.pathname === "/scorecard" ? "light" : "outline-light"}
            onClick={() => navigate("/scorecard")}
          >
            Scorecard
          </Button>

          <Button 
            variant={location.pathname === "/calendar" ? "light" : "outline-light"}
            onClick={() => navigate("/calendar")}
          >
            Calendar
          </Button>
        </div>

        {/* Action buttons on the right */}
        <div className="d-flex gap-2">
          <Button variant="light" onClick={handleAddApplication}>
            Add New Application
          </Button>
          <Button variant="outline-light" onClick={onToggleDarkMode}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>
      </Container>
    </Navbar>
  );
};

export default PageHeader;
