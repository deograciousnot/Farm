import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import type { Paginated } from "./types";

export function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function errorMessage(error: unknown, fallback = "Something went wrong.") {
  return error instanceof Error && error.message ? error.message : fallback;
}

// --- Toasts -------------------------------------------------------------------

type Toast = { id: number; message: string; tone: "success" | "error" };
const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), tone === "error" ? 5000 : 3000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-host" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.tone}`}>
            {toast.tone === "success" ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// --- Confirm dialog -----------------------------------------------------------

export type ConfirmOptions = {
  title: string;
  body?: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  /** Ask for a reason; it is shown to the affected user and stored in the audit log. */
  reason?: "required" | "optional";
  reasonPlaceholder?: string;
  /** An extra opt-in, e.g. "Also remove everything they posted". */
  checkbox?: { label: string; defaultChecked?: boolean };
  onConfirm: (reason: string, checked: boolean) => Promise<unknown>;
};

const ConfirmContext = createContext<(options: ConfirmOptions) => void>(() => {});

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [reason, setReason] = useState("");
  const [checked, setChecked] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (options && !dialog.open) dialog.showModal();
    if (!options && dialog.open) dialog.close();
  }, [options]);

  const open = useCallback((next: ConfirmOptions) => {
    setReason("");
    setChecked(Boolean(next.checkbox?.defaultChecked));
    setError("");
    setOptions(next);
  }, []);

  async function confirm() {
    if (!options) return;
    if (options.reason === "required" && !reason.trim()) {
      setError("Add a reason — the person affected will see it.");
      return;
    }

    setIsBusy(true);
    try {
      await options.onConfirm(reason.trim(), checked);
      setOptions(null);
    } catch (confirmError) {
      setError(errorMessage(confirmError));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <ConfirmContext.Provider value={open}>
      {children}
      <dialog ref={dialogRef} className="dialog" onClose={() => setOptions(null)}>
        {options ? (
          <form
            method="dialog"
            onSubmit={(event) => {
              event.preventDefault();
              void confirm();
            }}>
            <h2>{options.title}</h2>
            {options.body ? <p className="muted">{options.body}</p> : null}
            {options.reason ? (
              <label className="field">
                <span>Reason {options.reason === "optional" ? "(optional)" : ""}</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={options.reasonPlaceholder ?? "e.g. Misleading pricing claims"}
                  rows={3}
                  autoFocus
                />
              </label>
            ) : null}
            {options.checkbox ? (
              <label className="check">
                <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
                {options.checkbox.label}
              </label>
            ) : null}
            {error ? <p className="form-error">{error}</p> : null}
            <div className="dialog-actions">
              <button type="button" className="ghost" onClick={() => setOptions(null)} disabled={isBusy}>
                Cancel
              </button>
              <button type="submit" className={options.tone === "primary" ? "primary-button" : "danger-button"} disabled={isBusy}>
                {isBusy ? <Loader2 className="spin" size={16} /> : null}
                {options.confirmLabel}
              </button>
            </div>
          </form>
        ) : null}
      </dialog>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

// --- Data loading -------------------------------------------------------------

/** Loads a paginated list, resets when `key` changes, and supports load-more and reload. */
export function usePaged<T>(load: (page: number) => Promise<Paginated<T>>, key: string) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const loadRef = useRef(load);
  loadRef.current = load;

  const fetchPage = useCallback(async (nextPage: number, append: boolean) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await loadRef.current(nextPage);
      setItems((current) => (append ? [...current, ...response.items] : response.items));
      setTotal(response.pagination.total);
      setPage(response.pagination.page);
      setHasMore(response.pagination.hasMore);
    } catch (loadError) {
      setError(errorMessage(loadError, "Couldn't load this list."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPage(1, false);
  }, [fetchPage, key]);

  return {
    items,
    total,
    hasMore,
    isLoading,
    error,
    reload: () => fetchPage(1, false),
    loadMore: () => fetchPage(page + 1, true),
  };
}

// --- Small display pieces -----------------------------------------------------

/** `capitalize` is for status words ("pending"); leave it off for user data like categories. */
export function Pill({ children, tone = "neutral", capitalize = false }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "red"; capitalize?: boolean }) {
  return <span className={`pill ${tone} ${capitalize ? "capitalize" : ""}`}>{children}</span>;
}

export function ListState({
  isLoading,
  error,
  isEmpty,
  emptyText,
  onRetry,
}: {
  isLoading: boolean;
  error: string;
  isEmpty: boolean;
  emptyText: string;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className="error-banner">
        {error}{" "}
        <button className="link-button" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }
  if (isLoading && isEmpty) {
    return (
      <div className="loading-state">
        <Loader2 className="spin" size={18} /> Loading…
      </div>
    );
  }
  if (isEmpty) {
    return <p className="empty">{emptyText}</p>;
  }
  return null;
}

export function LoadMore({ hasMore, isLoading, onClick }: { hasMore: boolean; isLoading: boolean; onClick: () => void }) {
  if (!hasMore) return null;
  return (
    <button className="load-more-button" onClick={onClick} disabled={isLoading}>
      {isLoading ? <Loader2 className="spin" size={16} /> : null}
      Load more
    </button>
  );
}

export function Avatar({ name, url, size = 36 }: { name: string; url?: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return url ? (
    <img className="avatar" src={url} alt="" width={size} height={size} />
  ) : (
    <span className="avatar" style={{ width: size, height: size }} aria-hidden>
      {initials}
    </span>
  );
}
