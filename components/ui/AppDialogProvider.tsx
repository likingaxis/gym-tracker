"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type DialogTone = "default" | "danger" | "success";
type DialogRequest = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
  alertOnly?: boolean;
};

type DialogContextValue = {
  confirmDialog: (request: DialogRequest | string) => Promise<boolean>;
  showDialog: (request: Omit<DialogRequest, "alertOnly"> | string) => Promise<void>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

type ActiveDialog = DialogRequest & { resolve: (value: boolean) => void };

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const [mounted, setMounted] = useState(false);
  const primaryActionRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => setMounted(true), []);

  const confirmDialog = useCallback((request: DialogRequest | string) => {
    const normalized = typeof request === "string" ? { title: request } : request;
    return new Promise<boolean>((resolve) => setDialog({ ...normalized, resolve }));
  }, []);

  const showDialog = useCallback(
    async (request: Omit<DialogRequest, "alertOnly"> | string) => {
      const normalized = typeof request === "string" ? { title: request } : request;
      await confirmDialog({
        ...normalized,
        alertOnly: true,
        confirmLabel: normalized.confirmLabel ?? "Chiudi",
      });
    },
    [confirmDialog],
  );

  const value = useMemo(() => ({ confirmDialog, showDialog }), [confirmDialog, showDialog]);

  const close = useCallback((result: boolean) => {
    setDialog((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => primaryActionRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [close, dialog]);

  const dialogNode = mounted && dialog ? (
    <div
      className="app-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close(false);
      }}
    >
      <section
        className={`app-dialog app-dialog-${dialog.tone ?? "default"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        aria-describedby={dialog.message ? "app-dialog-message" : undefined}
      >
        <div className="app-dialog-icon" aria-hidden="true">
          {dialog.tone === "danger" ? (
            <AlertTriangle size={24} />
          ) : dialog.tone === "success" ? (
            <CheckCircle2 size={24} />
          ) : (
            <Info size={24} />
          )}
        </div>

        <button
          type="button"
          className="app-dialog-close"
          onClick={() => close(false)}
          aria-label="Chiudi"
        >
          <X size={20} />
        </button>

        <h2 id="app-dialog-title" className="app-dialog-title">
          {dialog.title}
        </h2>
        {dialog.message ? (
          <p id="app-dialog-message" className="app-dialog-message">
            {dialog.message}
          </p>
        ) : null}

        <div className={`app-dialog-actions ${dialog.alertOnly ? "app-dialog-actions-single" : ""}`}>
          {!dialog.alertOnly ? (
            <button type="button" className="secondary-button" onClick={() => close(false)}>
              {dialog.cancelLabel ?? "Annulla"}
            </button>
          ) : null}
          <button
            ref={primaryActionRef}
            type="button"
            className={dialog.tone === "danger" ? "danger-button" : "primary-link"}
            onClick={() => close(true)}
          >
            {dialog.confirmLabel ?? "Conferma"}
          </button>
        </div>
      </section>
    </div>
  ) : null;

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialogNode ? createPortal(dialogNode, document.body) : null}
    </DialogContext.Provider>
  );
}

export function useAppDialog() {
  const context = useContext(DialogContext);
  if (!context) throw new Error("useAppDialog deve essere usato dentro AppDialogProvider");
  return context;
}
