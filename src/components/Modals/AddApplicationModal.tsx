import React, { createContext, useContext, useState } from "react";

interface ModalContextProps {
  showAddApplicationModal: boolean;
  openAddApplicationModal: () => void;
  closeAddApplicationModal: () => void;
}

const ModalContext = createContext<ModalContextProps | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [showAddApplicationModal, setShowAddApplicationModal] = useState(false);

  const openAddApplicationModal = () => setShowAddApplicationModal(true);
  const closeAddApplicationModal = () => setShowAddApplicationModal(false);

  return (
    <ModalContext.Provider
      value={{ showAddApplicationModal, openAddApplicationModal, closeAddApplicationModal }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export const useModalContext = (): ModalContextProps => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModalContext must be used within a ModalProvider");
  }
  return context;
};
