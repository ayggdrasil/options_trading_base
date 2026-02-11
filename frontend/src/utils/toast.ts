import { ReactNode } from "react";

export type ToastType = "success" | "info" | "loading" | "error";

export interface ToastMessage {
    id: string;
    type: ToastType;
    title: string;
    message: ReactNode;
    duration: number;
}

const MAX_VISIBLE_TOASTS = 8;

let toastQueue: ToastMessage[] = [];
let activeToasts: ToastMessage[] = [];

const listeners = new Set<(toasts: ToastMessage[]) => void>();

const emitUpdate = () => {
    listeners.forEach(listener => listener([...activeToasts]));
};

const processQueue = () => {
    while (activeToasts.length < MAX_VISIBLE_TOASTS && toastQueue.length > 0) {
        const nextToast = toastQueue.shift();
        if (nextToast) {
            activeToasts.push(nextToast);
            setTimeout(() => removeToastMessage(nextToast.id), nextToast.duration || 3 * 1000);
        }
    }
    emitUpdate();
};

export const addToastMessage = (toast: ToastMessage) => {
  toastQueue.push(toast);
  processQueue();
};

export const removeToastMessage = (toastId: string) => {
    activeToasts = activeToasts.filter(toast => toast.id !== toastId);
    processQueue();
};

export const subscribeToToastUpdates = (listener: (toasts: ToastMessage[]) => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};