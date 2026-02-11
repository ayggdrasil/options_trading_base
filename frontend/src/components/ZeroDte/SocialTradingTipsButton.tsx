import React, { useState, useEffect, useRef } from "react";
import iconGuide from "@assets/icon-guide.svg";
import iconGuideMouseOver from "@assets/icon-guide-mouse-over.svg";
import iconGuideMouseDown from "@assets/icon-guide-mouse-down.svg";
import SocialTradingTips from "./SocialTradingTips";

type SocialTradingTipsButtonProps = {};

const SocialTradingTipsButton: React.FC<SocialTradingTipsButtonProps> = () => {
  const [isMouseOver, setIsMouseOver] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null); // Create a ref for the modal

  // Function to handle the escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        isModalOpen &&
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModalOpen]);

  const handleMouseEnter = () => {
    setIsMouseOver(true);
  };

  const handleMouseLeave = () => {
    setIsMouseOver(false);
    setIsMouseDown(false);
  };

  const handleMouseDown = () => {
    setIsMouseDown(true);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleIconClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  let iconSrc;

  if (isMouseDown) {
    iconSrc = iconGuideMouseDown;
  } else if (isMouseOver) {
    iconSrc = iconGuideMouseOver;
  } else {
    iconSrc = iconGuide;
  }

  return (
    <div>
      <img
        width={40}
        height={40}
        src={iconSrc}
        alt="Guide Icon"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleIconClick}
        style={{ cursor: "pointer" }}
      />

      {isModalOpen && (
        <div style={modalOverlayStyle}>
          <div ref={modalRef}>
            {" "}
            {/* Add ref here */}
            <SocialTradingTips setIsModalOpen={setIsModalOpen} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialTradingTipsButton;

// Modal overlay style
const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};
