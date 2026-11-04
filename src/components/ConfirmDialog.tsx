import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open?: boolean;
  isOpen?: boolean;
  title: string;
  description?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  isOpen,
  title,
  description,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isProcessing = false,
  onConfirm,
  onCancel,
}) => {
  const isVisible = open ?? isOpen ?? false;
  const bodyText = description ?? message ?? '';
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                variant === 'danger'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="confirm-dialog-title"
                className="text-base font-bold text-stone-900"
              >
                {title}
              </h3>
              <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">
                {bodyText}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close confirmation dialog"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-stone-400 hover:text-stone-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`min-h-[44px] px-5 py-2 text-sm font-semibold text-white rounded-xl transition-colors whitespace-nowrap shrink-0 ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
                : 'bg-emerald-800 hover:bg-emerald-900 disabled:bg-emerald-400'
            }`}
          >
            {isProcessing ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
