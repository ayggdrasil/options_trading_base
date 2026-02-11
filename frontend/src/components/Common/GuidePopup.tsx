import { useContext, useState } from "react";
import { twJoin } from "tailwind-merge";
import Button from "./Button";
import { ModalContext } from "./ModalContext";

import IconClose from "@assets/img/icon/close.png";

type Props = {};

const steps = [
  {
    id: 1,
    title: "Trade Options",
    src: "",
    content:
      "Content page 1 is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.",
  },
  {
    id: 2,
    title: "0DTE Options",
    src: "",
    content:
      "Content page 2 is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. This content is a bit longer.",
  },
  {
    id: 3,
    title: "Provide Liquidity",
    src: "",
    content:
      "Content page 3 is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. This is the last page.",
  },
];

const GuidePopup = ({}: Props) => {
  const { closeModal } = useContext(ModalContext);

  const [stepIdx, setStepIdx] = useState(0);
  const isFirstPage = stepIdx === 0;
  const isLastPage = stepIdx === steps.length - 1;

  return (
    <div
      className={twJoin(
        "relative",
        "w-[368px] h-fit p-[24px] bg-black181a rounded-[10px]",
        "flex flex-col items-start gap-[24px]",
        "border-[1px] border-solid border-black2023",
        "shadow-[0px_6px_36px_0px_rgba(0,0,0,0.2)]"
      )}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Header with title and close button */}
      <div className="w-full h-[32px] flex flex-row items-center justify-between">
        <p className="h-full text-blue278e text-[20px] font-[700] leading-[32px]">
          CallPut Quick Guides
        </p>
        <img
          className="cursor-pointer w-[32px] h-[32px]"
          src={IconClose}
          onClick={closeModal}
          alt="Close"
        />
      </div>

      {/* Image area */}
      <div className="flex flex-col items-start gap-[12px]">
        <img
          className="w-[320px] h-[200px] object-contain"
          src={steps[stepIdx].src}
          alt={steps[stepIdx].title}
        />
        {/* Content text */}
        <p className="min-h-[72px] text-graybfbf text-[14px] font-[400] leading-[18px]">
          {steps[stepIdx].content}
        </p>
      </div>

      {/* Navigation buttons */}
      <div className="w-full flex items-center justify-between">
        {/* Left button - Back button on second and last pages */}
        {!isFirstPage ? (
          <Button
            className="h-[40px] w-fit"
            name="Back"
            color="default"
            arrow="left"
            onClick={() => {
              setStepIdx(stepIdx - 1);
            }}
          />
        ) : (
          <div></div>
        )}

        {/* Right button - Next or Start Trading */}
        <Button
          className="h-[40px] w-fit"
          name={isLastPage ? "Start Trading" : "Next"}
          color="default"
          arrow="right"
          onClick={() => {
            if (isLastPage) {
              closeModal();
              return;
            }
            setStepIdx(stepIdx + 1);
          }}
        />
      </div>
    </div>
  );
};

export default GuidePopup;
