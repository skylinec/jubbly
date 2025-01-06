import React from "react";
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import { useApplicationContext } from "../../context/ApplicationContext";
import { Link, useLocation } from "react-router-dom";

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

  return (
    <Navbar
      bg={darkMode ? "dark" : "secondary"}
      variant={darkMode ? "dark" : "light"}
    >
      <Container>
        <Navbar.Brand as={Link} to="/">Jubbly</Navbar.Brand>
        <div className="d-flex gap-2">
          <Link to={location.pathname === "/calendar" ? "/" : "/calendar"}>
            <Button variant="light">
              {location.pathname === "/calendar" ? "View Applications" : "View Calendar"}
            </Button>
          </Link>
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
