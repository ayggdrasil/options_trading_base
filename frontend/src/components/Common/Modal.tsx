import React, { ReactNode, useEffect, useState } from 'react';
import { twJoin, twMerge } from 'tailwind-merge';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  modalClassName?: string;
  isMobile?: boolean;
  contentClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  modalClassName,
  children,
  isMobile,
  contentClassName = "min-h-[80px]"
}) => {
  const [touchStartY, setTouchStartY] = useState<number>();

  const closeModal = () => {
    onClose();
    setTouchStartY(undefined);
  };

  const resetBodyStyle = () => {
    document.body.classList.remove("fixed-body");
    document.body.style.top = "";
  };

  useEffect(() => {
    if (isMobile) {
      if (isOpen) {
        document.body.style.top = `-${window.scrollY}px`;
        document.body.classList.add("fixed-body");
        window.scrollBy({ top: 2 });

        return;
      }

      const scrollY = Math.abs(parseInt(document.body.style.top || "0", 10));
      resetBodyStyle();
      window.scrollTo(0, scrollY);

      return;
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isMobile]);

  useEffect(() => {
    return () => {
      resetBodyStyle();
    };
  }, []);

  // When Mobile
  if (isMobile) {
    return (
      <div
        className={twMerge(
          twJoin(
            "fixed top-0 bottom-0 left-0 w-full",
            "flex items-end",
            "transition-all duration-[300ms] ease-linear",
            "bg-[rgba(18,20,23,0.8)]",
            isOpen
              ? "opacity-100 z-[40]"
              : "opacity-0 -z-[1] pointer-events-none"
          ),
          modalClassName
        )}
        onClick={closeModal}
      >
        <div
          className={twJoin(
            "relative w-full py-[34px] max-h-[calc(90%)]",
            "border-t-[1px] border-[#2c332f]",
            "rounded-t-lg bg-black03",
            "transition-all duration-[300ms] ease-linear",
            isOpen ? "translate-y-0 delay-[50ms]" : "translate-y-full",
            contentClassName
          )}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            if (
              typeof touchStartY === "number" &&
              e.changedTouches?.[0]?.clientY > touchStartY
            ) {
              closeModal();
            }
          }}
        >
          <div
            className={twJoin(
              "absolute z-[2] top-[-10px] left-0 w-full h-[44px] pt-[16px]"
            )}
            onTouchStart={(e) => {
              setTouchStartY(e.touches?.[0]?.clientY);
            }}
          >
            <div
              className={twJoin(
                "w-[80px] h-[5px] mx-auto rounded-[2.5px]",
                "bg-[rgba(60,60,67,0.7)]"
              )}
            />
          </div>
          {children}
        </div>
      </div>
    );
  }

  // When Desktop
  if (!isOpen) {
    return null;
  }

  return (
    <div className={twMerge(
      twJoin(
        "fixed top-0 left-0 w-full h-full z-40",
        "flex items-center justify-center",
        "bg-[rgba(18,20,23,0.8)]"
      ),
      modalClassName,
    )} onClick={closeModal}>
      {children}
    </div>
  );
};