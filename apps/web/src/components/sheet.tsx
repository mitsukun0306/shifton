"use client";

import { type ReactNode, useEffect, useRef } from "react";

/**
 * 画面の上に重ねて表示するポップアップ。スマホ幅では画面の下からせり出し、
 * PC 幅では画面中央に出る。背景のタップ・Esc キー・✕ ボタンで閉じる。
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: キーボードでは dialog 標準の Esc キーで閉じられる
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // 背景（dialog 要素そのもの）をタップしたら閉じる
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-2xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-black/40 sm:m-auto sm:max-w-lg sm:rounded-2xl dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="rounded-full px-2 text-xl leading-none text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-4">{open && children}</div>
      </div>
    </dialog>
  );
}
