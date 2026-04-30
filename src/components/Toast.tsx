import { useEffect } from 'react';

export interface ToastState {
  id: number;
  message: string;
  variant?: 'success' | 'error';
}

interface ToastProps {
  toast: ToastState | null;
  onDismiss: () => void;
}

const Toast = ({ toast, onDismiss }: ToastProps) => {
  useEffect(() => {
    if (!toast) return undefined;

    const timeout = globalThis.setTimeout(onDismiss, 2500);
    return () => globalThis.clearTimeout(timeout);
  }, [onDismiss, toast]);

  if (!toast) return null;

  const bgColor = toast.variant === 'error' ? 'bg-red-600' : 'bg-emerald-600';

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-[100] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md px-4 py-3 text-sm text-white shadow-xl ${bgColor}`}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>
  );
};

export default Toast;
