import React, { ReactNode } from "react";
import { twJoin } from "tailwind-merge";

type ImagePosition = "left" | "right";

interface ButtonProps {
  label: string; // 버튼 이름 (필수값)
  width?: string; // 버튼 가로 길이
  height?: string; // 버튼 세로 길이
  image?: ReactNode; // 이미지 (ReactNode로 SVG나 img 태그 모두 수용)
  imagePosition?: ImagePosition; // 이미지 위치 (왼쪽 또는 오른쪽)
  onClick?: () => void; // 클릭 이벤트 핸들러
  className?: string; // 추가 스타일링을 위한 클래스
  disabled?: boolean; // 버튼 비활성화 여부
}

const Button: React.FC<ButtonProps> = ({
  label,
  width = "auto",
  height = "40px",
  image,
  imagePosition = "left",
  onClick,
  className = "",
  disabled = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={twJoin(
        "flex flex-shrink-0 items-center justify-center transition-transform duration-150 ease-in-out",
        "px-[16px] py-[8px] rounded-[6px]",
        "text-whited9d9 text-[16px] font-[600] leading-[24px]",
        disabled ? "cursor-not-allowed bg-graybfbf" : "cursor-pointer bg-blue1f53 active:scale-95",
        className
      )}
      style={{
        width,
        height,
      }}
    >
      {image && imagePosition === "left" && <span className="mr-2">{image}</span>}

      <span>{label}</span>

      {image && imagePosition === "right" && <span className="ml-2">{image}</span>}
    </button>
  );
};

export default Button;
