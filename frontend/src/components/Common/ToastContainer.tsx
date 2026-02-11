import React, { useEffect, useState } from "react";
import { twJoin } from "tailwind-merge";
import { ToastMessage, subscribeToToastUpdates } from "@/utils/toast";
import { Toast } from "./Toast";
import { useAppSelector } from "@/store/hooks";
import { ToastForMobile } from "./Mobile/ToastForMobile";

const ToastContainer: React.FC = () => {
  const { isMobile } = useAppSelector((state: any) => state.device);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToToastUpdates(setToasts);
    return unsubscribe;
  }, []);

  return (
    <div
      className={twJoin(
        "z-50 fixed ",
        "flex flex-col gap-[18px]",
        isMobile ? "top-[52px] right-[12px]" : "top-[104px] right-[24px]"
      )}
    >
      {toasts.map((toast) => (
        <React.Fragment key={toast.id}>
          {isMobile ? <ToastForMobile {...toast} /> : <Toast {...toast} />}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ToastContainer;
