import React, { useCallback, useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";

interface DropdownProps {
  /** 드롭다운을 열고 닫는 트리거 버튼 */
  trigger: React.ReactNode;
  /** 드롭다운 아이템들을 렌더링하는 함수 */
  children: (closeDropdown: () => void) => React.ReactNode;
  /** 드롭다운이 열려있는지 제어 (controlled) */
  isOpen?: boolean;
  /** 드롭다운 열림/닫힘 상태 변경 핸들러 (controlled) */
  onOpenChange?: (isOpen: boolean) => void;
  /** 드롭다운과 트리거 사이의 간격 */
  triggerDropdownGap?: number;
  /** 드롭다운 너비 (기본값: 160px) */
  dropdownWidth?: string;
  /** 드롭다운 위치 조정 (top, left, right 등) */
  dropdownPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** 드롭다운 컨테이너의 추가 클래스명 */
  dropdownClassName?: string;
}

/**
 * 재사용 가능한 드롭다운 컴포넌트
 * NavBar 스타일을 기준으로 하되, 아이템은 커스터마이징 가능
 */
function Dropdown({
  trigger,
  children,
  isOpen: controlledIsOpen,
  onOpenChange,
  triggerDropdownGap = 4,
  dropdownWidth = "max-content",
  dropdownPosition = "bottom-left",
  dropdownClassName,
}: DropdownProps) {
  const [internalIsOpen, setIsInternalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const closeDropdown = useCallback(() => {
    if (onOpenChange) {
      onOpenChange(false);
    } else {
      setIsInternalOpen(false);
    }
  }, [onOpenChange]);

  const toggleDropdown = () => {
    const newState = !isOpen;
    if (onOpenChange) {
      onOpenChange(newState);
    } else {
      setIsInternalOpen(newState);
    }
  };

  // 외부 클릭 감지
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        dropdownRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  // 위치 스타일 계산
  const getPositionClasses = () => {
    switch (dropdownPosition) {
      case "top-left":
        return "bottom-full left-0";
      case "top-right":
        return "bottom-full right-0";
      case "bottom-right":
        return "top-full right-0";
      case "bottom-left":
      default:
        return "top-full left-0";
    }
  };

  const getGapStyle = (): React.CSSProperties => {
    switch (dropdownPosition) {
      case "top-left":
      case "top-right":
        return { marginBottom: `${triggerDropdownGap}px` };
      case "bottom-left":
      case "bottom-right":
      default:
        return { marginTop: `${triggerDropdownGap}px` };
    }
  };

  return (
    <div
      className="relative h-full flex flex-row items-center justify-center"
      ref={containerRef}
    >
      <div
        className="h-full flex flex-row items-center justify-center"
        onClick={toggleDropdown}
      >
        {trigger}
      </div>
      {isOpen && (
        <div
          ref={dropdownRef}
          className={twJoin(
            "absolute z-20",
            "h-fit",
            "flex flex-col py-[8px]",
            "bg-black2023 rounded-[4px]",
            "shadow-[0px_6px_36px_0px_rgba(0,0,0,0.2)]",
            getPositionClasses(),
            dropdownClassName
          )}
          style={{ ...getGapStyle(), width: dropdownWidth }}
        >
          {children(closeDropdown)}
        </div>
      )}
    </div>
  );
}

export default Dropdown;
