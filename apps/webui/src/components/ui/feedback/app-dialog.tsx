"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";

interface AppDialogProps {
  children: ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
  preventClose?: boolean;
  widthClassName?: string;
}

export function AppDialog({
  children,
  className,
  isOpen,
  onClose,
  preventClose = false,
  widthClassName = "max-w-md",
}: AppDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        if (!preventClose) {
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !preventClose) {
          onClose();
        }
      }}
      className={[
        "m-auto w-[calc(100%_-_2rem)] rounded-2xl border border-line bg-panel p-0 text-ink backdrop:bg-ink/30 backdrop:backdrop-blur-[2px]",
        widthClassName,
        className,
      ].filter(Boolean).join(" ")}
    >
      {children}
    </dialog>
  );
}
