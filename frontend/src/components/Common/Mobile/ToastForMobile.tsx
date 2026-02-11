import { ReactNode, useEffect, useRef } from "react";
import { twJoin } from "tailwind-merge";
import { ToastType, removeToastMessage } from "@/utils/toast";

import IconToastSuccess from "@/assets/img/icon/success.svg";
import IconToastError from "@/assets/img/icon/error.svg";
import IconToastInfo from "@/assets/img/icon/info.svg";
import IconToastLoading from "@/assets/img/icon/success.svg";
import IconToastClose from "@/assets/img/icon/close.png";

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
  success: "border-green64",
  error: "border-redE0",
  info: "border-primaryc1",
  loading: "border-primaryc1",
};

const titleTypeClasses: {[key: string]: string} = {
  success: "!text-green63",
  error: "",
  info: "",
  loading: ""
}

export const ToastForMobile = (props: ToastProps) => {
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
        "flex flex-col",
        "px-3 md:px-6 py-2 rounded-[4px] bg-[#111613]",
        "border-[#333] border-[1px] shadow-[0px_0px_36px_0_rgba(10,10,10,0.72)]",
        "animate-toastIn",
        `${typeClass}`
      )}
      style={{ maxWidth: "calc(100vw - 24px)" }}
    >
      <div className="flex flex-row items-center justify-between">
        <div className="flex">
          <img className="w-[24px] h-[24px]" src={typeIcon} />
          <div
            className={twJoin(
              "px-[16px] text-[14px] text-contentBright font-[700]",
              titleTypeClasses[type],
            )}
          >
            {title}
          </div>
        </div>
        {!isMessageEmpty && (
          <img
            className="w-[32px] h-[32px]"
            src={IconToastClose}
            onClick={handleRemove}
          />
        )}
      </div>
      <div className="flex flex-row items-center">
        <div className="w-[24px]" />
        {!isMessageEmpty && (
          <div className="w-full text-[14px] text-gray9D font-[600] break-words">
            {message}
          </div>
        )}
        <div className="w-[32px]" />
      </div>
    </div>
  );
};
