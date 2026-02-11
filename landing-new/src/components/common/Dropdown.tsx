import React, { useEffect, useRef, useState, ReactNode } from "react";
import { twJoin } from "tailwind-merge";

export interface DropdownItem {
  id?: string | number;
  label: string;
  icon?: ReactNode | string; // ReactNode 또는 이미지 경로
  url?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  [key: string]: any; // 추가 속성 허용
}

export interface DropdownProps {
  trigger: ReactNode | ((isOpen: boolean) => ReactNode); // 트리거 요소 또는 함수
  items: DropdownItem[];
  position?: "top" | "bottom" | "left" | "right";
  alignment?: "left" | "right" | "center";
  onItemClick?: (item: DropdownItem, index: number) => void;
  onOpenChange?: (isOpen: boolean) => void;
  className?: string;
  dropdownClassName?: string;
  itemClassName?: string;
  renderItem?: (item: DropdownItem, index: number, isOpen: boolean) => ReactNode;
  closeOnItemClick?: boolean;
  containerClassName?: string;
  offset?: { x?: number; y?: number }; // 드롭다운 위치 오프셋
  openOnHover?: boolean;
  disabled?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  position = "bottom",
  alignment = "left",
  onItemClick,
  onOpenChange,
  className = "",
  dropdownClassName = "",
  itemClassName = "",
  renderItem,
  closeOnItemClick = true,
  containerClassName = "",
  offset = { x: 0, y: 4 },
  openOnHover = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    if (disabled) return;
    const newState = !isOpen;
    setIsOpen(newState);
    onOpenChange?.(newState);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  const handleItemClick = (item: DropdownItem, index: number) => {
    if (item.disabled) return;

    if (item.onClick) {
      item.onClick();
    } else if (item.url) {
      window.open(item.url, "_blank");
    }

    onItemClick?.(item, index);

    if (closeOnItemClick) {
      closeDropdown();
    }
  };

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // 위치 계산
  const getPositionClasses = () => {
    const positionClasses = {
      top: "bottom-full mb-[4px]",
      bottom: "top-full mt-[4px]",
      left: "right-full mr-[4px] top-0",
      right: "left-full ml-[4px] top-0",
    };

    const alignmentClasses = {
      left: position === "top" || position === "bottom" ? "left-0" : "top-0",
      right: position === "top" || position === "bottom" ? "right-0" : "bottom-0",
      center: position === "top" || position === "bottom" ? "left-1/2 -translate-x-1/2" : "top-1/2 -translate-y-1/2",
    };

    return twJoin(positionClasses[position], alignmentClasses[alignment]);
  };

  // 아이템 렌더링
  const renderDropdownItem = (item: DropdownItem, index: number) => {
    if (renderItem) {
      return renderItem(item, index, isOpen);
    }

    const iconElement =
      typeof item.icon === "string" ? (
        <img src={item.icon} alt={item.label} className="w-[20px] h-[20px]" />
      ) : (
        item.icon
      );

    return (
      <div
        key={item.id || index}
        className={twJoin(
          "cursor-pointer h-[36px] flex flex-row items-center justify-between px-[20px] py-[6px]",
          "hover:bg-[#f2f2f2]",
          // "first:rounded-t-[8px] last:rounded-b-[8px]",
          "transition-transform duration-150 ease-in-out",
          "active:scale-95",
          item.disabled && "opacity-50 cursor-not-allowed",
          itemClassName,
          item.className
        )}
        onClick={() => handleItemClick(item, index)}
      >
        <p className="h-[24px] text-[14px] text-[#202329] font-[500] leading-[24px]">{item.label}</p>
        {iconElement && <div className="flex-shrink-0">{iconElement}</div>}
      </div>
    );
  };

  const triggerElement = typeof trigger === "function" ? trigger(isOpen) : trigger;

  return (
    <div className={twJoin("relative", containerClassName)} ref={containerRef}>
      <div
        onClick={toggleDropdown}
        onMouseEnter={openOnHover ? () => !disabled && setIsOpen(true) : undefined}
        onMouseLeave={openOnHover ? () => setIsOpen(false) : undefined}
        className={twJoin("cursor-pointer", disabled && "opacity-50 cursor-not-allowed", className)}
      >
        {triggerElement}
      </div>
      {isOpen && (
        <div
          ref={dropdownRef}
          className={twJoin(
            "absolute z-[100]",
            getPositionClasses(),
            "bg-white rounded-[8px] py-[6px]",
            "shadow-[0px_4px_16px_0px_rgba(0,0,0,0.15)]",
            "border-[1px] border-[#d9d9d9]",
            "min-w-[160px]",
            "overflow-hidden",
            dropdownClassName
          )}
          style={{
            marginTop: position === "bottom" ? `${offset.y}px` : undefined,
            marginBottom: position === "top" ? `${offset.y}px` : undefined,
            marginLeft: position === "right" ? `${offset.x}px` : undefined,
            marginRight: position === "left" ? `${offset.x}px` : undefined,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, index) => renderDropdownItem(item, index))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;

