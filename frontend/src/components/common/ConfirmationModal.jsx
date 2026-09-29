import React from 'react';
import { X } from 'lucide-react';

export default function ConfirmationModal({ open, title, message, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section className="w-full max-w-sm rounded-xl border border-white/[0.12] bg-[#101012] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
        <div className="flex items-start justify-between gap-4">
          <h2 id="confirmation-title" className="text-base font-semibold text-white">{title}</h2>
          <button type="button" onClick={onCancel} className="rounded-md p-1 text-zinc-400 hover:bg-white/[0.06] hover:text-white" aria-label="Close confirmation">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-sm text-zinc-400">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="button" onClick={onConfirm} className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-500">Logout</button>
        </div>
      </section>
    </div>
  );
}
