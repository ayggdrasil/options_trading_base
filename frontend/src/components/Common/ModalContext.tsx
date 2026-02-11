// contexts/ModalContext.tsx
import React, { ReactElement, createContext, useEffect, useState } from "react";

interface ModalContextType {
  modalContent: ReactElement<any, any> | null;
  modalProps: any;
  isModalOpen: boolean;
  isShowPreviousModal: boolean;
  modalName: string;
  setPreviousModal: (modal: string) => void;
  openModal: (content: ReactElement<any, any>, props: any) => void;
  closeModal: () => void;
  setShowPreviousModal: (value: boolean) => void;
}

interface ModalProviderProps {
  children: React.ReactNode;
}

export const ModalContext = createContext<ModalContextType>({
  modalContent: null,
  modalProps: {},
  isModalOpen: false,
  isShowPreviousModal: false,
  modalName: "",
  setPreviousModal: () => {},
  openModal: () => {},
  closeModal: () => {},
  setShowPreviousModal: () => {},
});

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [modalContent, setModalContent] = useState<ReactElement<
    any,
    any
  > | null>(null);
  const [modalProps, setModalProps] = useState<any>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShowPreviousModal, setIsShowPreviousModal] = useState(false);
  const [modalName, setModalName] = useState("");

  useEffect(() => {
    const close = (e: any) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const openModal = (content: ReactElement<any, any>, props: any) => {
    setModalContent(content);
    setModalProps(props);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (modalName) {
      setIsShowPreviousModal(true);
    } else {
      setModalContent(null);
      setModalProps({});
      setIsModalOpen(false);
    }
  };

  const setPreviousModal = (modal: string) => {
    setModalName(modal);
  };

  const setShowPreviousModal = (value: boolean) => {
    setIsShowPreviousModal(value);
  };

  return (
    <ModalContext.Provider
      value={{
        modalContent,
        modalProps,
        isModalOpen,
        isShowPreviousModal,
        modalName,
        openModal,
        closeModal,
        setPreviousModal,
        setShowPreviousModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};
