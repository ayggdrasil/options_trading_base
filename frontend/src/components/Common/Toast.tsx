import { ReactNode, useEffect, useRef } from "react";
import { twJoin } from "tailwind-merge";

import IconToastSuccess from "../../assets/img/icon/success.svg";
import IconToastError from "../../assets/img/icon/error.svg";
import IconToastInfo from "../../assets/img/icon/info.svg";
import IconToastLoading from "../../assets/img/animation/loader.gif";

import IconToastClose from "../../assets/img/icon/close.png";

import { ToastType, removeToastMessage } from "@/utils/toast";

export type ToastProps = {
  id: string;
  type: ToastType;
  title: string;
  message: ReactNode;
  duration: number;
};

const typeIcons: { [key: string]: string } = {
  success: IconToastSuccess,
  error: IconToastError,
  info: IconToastInfo,
  loading: IconToastLoading,
};

const typeClasses: { [key: string]: string } = {
  success: "",
  error: "",
  info: "",
  loading: "",
};

export const Toast = (props: ToastProps) => {
  const { id, type = "info", title, message, duration = 3000 } = props;

  const typeIcon = typeIcons[type];
  const typeClass = typeClasses[type];

  const dismissRef = useRef<ReturnType<typeof setTimeout>>();

  const isMessageEmpty = message === "";

  useEffect(() => {
    if (duration) {
      dismissRef.current = setTimeout(() => {
        removeToastMessage(id);
      }, duration);
    }

    return () => {
      clearTimeout(dismissRef.current);
    };
  }, [id, duration]);

  const handleRemove = () => {
    removeToastMessage(id);
  };

  return (
    <div
      className={twJoin(
        "w-[480px] h-fit flex flex-col",
        "p-[14px] rounded-[4px] bg-black181a",
        "border-[1px] border-solid border-black2023 shadow-[0px_6px_36px_0px_rgba(0,0,0,0.2)]",
        "animate-toastIn",
        `${typeClass}`
      )}
    >
      <div className="flex flex-row items-start gap-[10px]">
        <img className="w-[24px] h-[24px]" src={typeIcon} />
        <div className="flex flex-col gap-[4px]">
          <div
            className={twJoin(
              "w-[384px] text-[15px] font-[700] leading-[24px] text-whitef5f5"
            )}
          >
            {title}
          </div>
          {!isMessageEmpty && (
            <div className="w-[384px] text-[14px] font-[500] leading-[20px] text-gray8c8c">
              {message}
            </div>
          )}
        </div>
        <img
          className="cursor-pointer w-[24px] h-[24px]"
          src={IconToastClose}
          onClick={handleRemove}
        />
      </div>
    </div>
  );
};
