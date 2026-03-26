"use client";
import { Toast } from "@/lib/types";
import { CheckIcon, ExclamationIcon, XMarkIcon } from "./Icons";

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const TOAST_STYLES = {
  success: {
    bg: "bg-accent-50 border-accent-200",
    icon: "text-accent-600",
    title: "text-accent-900",
    msg: "text-accent-700",
  },
  error: {
    bg: "bg-danger-50 border-danger-200",
    icon: "text-danger-600",
    title: "text-danger-900",
    msg: "text-danger-700",
  },
  warning: {
    bg: "bg-warm-50 border-warm-200",
    icon: "text-warm-500",
    title: "text-warm-900",
    msg: "text-warm-700",
  },
  info: {
    bg: "bg-primary-50 border-primary-200",
    icon: "text-primary-600",
    title: "text-primary-900",
    msg: "text-primary-700",
  },
};

const TOAST_ICONS = {
  success: CheckIcon,
  error: ExclamationIcon,
  warning: ExclamationIcon,
  info: ExclamationIcon,
};

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-80 sm:w-96">
      {toasts.map((toast) => {
        const styles = TOAST_STYLES[toast.type];
        const Icon = TOAST_ICONS[toast.type];

        return (
          <div
            key={toast.id}
            className={`${styles.bg} border rounded-xl p-4 shadow-lg animate-toast-in flex items-start gap-3`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${styles.title}`}>{toast.title}</p>
              <p className={`text-xs mt-0.5 ${styles.msg}`}>{toast.message}</p>
            </div>
            <button
              onClick={() => onRemove(toast.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
