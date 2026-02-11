import React, { useContext } from 'react';
import { Modal } from './Modal';
import { ModalContext } from './ModalContext';

export const ModalRoot: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  const { modalContent, modalProps, closeModal } = useContext(ModalContext);

  const { contentClassName, ...restProps } = modalProps;

  return (
    <Modal 
      isOpen={!!modalContent} 
      onClose={closeModal}
      modalClassName={modalProps?.modalClassName}
      contentClassName={contentClassName}
      isMobile={isMobile}
    >
      {modalContent && React.cloneElement(modalContent, restProps)}
    </Modal>
  );
};
