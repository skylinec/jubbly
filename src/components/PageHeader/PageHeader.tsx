import React from "react";
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";

import { useModalContext } from "../../context/ModalContext";

interface PageHeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  darkMode,
  onToggleDarkMode,
}) => {
  const { openAddApplicationModal } = useModalContext();

  return (
    <Navbar
      bg={darkMode ? "dark" : "secondary"}
      variant={darkMode ? "dark" : "light"}
    >
      <Container>
        <Navbar.Brand href="#home">Jubbly</Navbar.Brand>
        <Button variant="light" onClick={openAddApplicationModal}>
          Add New Application
        </Button>
        <Button variant="outline-light" onClick={onToggleDarkMode}>
          {darkMode ? "Light Mode" : "Dark Mode"}
        </Button>
      </Container>
    </Navbar>
  );
};

export default PageHeader;
