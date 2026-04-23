import { X } from 'lucide-react';
import { ReactNode, useEffect, useRef } from 'react';
import { useT } from '@/i18n';

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function Modal({
  open,
  onClose,
  title,
  children,
  widthClass = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  widthClass?: string;
}) {
  const t = useT();
  const pointerStartedOnBackdrop = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const firstFocusable = dialog?.querySelector<HTMLElement>(FOCUSABLE);
    firstFocusable?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 overscroll-contain"
      onMouseDown={(e) => {
        pointerStartedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        const startedOnBackdrop = pointerStartedOnBackdrop.current;
        pointerStartedOnBackdrop.current = false;
        if (!startedOnBackdrop || e.target !== e.currentTarget) return;
        if (window.getSelection()?.toString()) return;
        onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`card w-full ${widthClass} max-h-[90vh] overflow-y-auto overscroll-contain rounded-b-none sm:rounded-xl`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 id="modal-title" className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="btn-ghost p-2" aria-label={t('common.close')}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
