import React, { useEffect, useRef } from 'react';

interface DeleteConfirmPopoverProps {
  tagName: string;
  anchorEl: HTMLElement | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmPopover({
  tagName,
  anchorEl,
  onConfirm,
  onCancel,
}: DeleteConfirmPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!anchorEl) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onCancel();
      }
    };

    // Delay attaching listener to avoid immediately closing from the triggering click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorEl, onCancel]);

  if (!anchorEl) return null;

  // Position near the anchor element
  const rect = anchorEl.getBoundingClientRect();
  const style: React.CSSProperties = {
    position: 'fixed',
    top: rect.bottom + 4,
    left: rect.left,
    zIndex: 9999,
  };

  return (
    <div ref={popoverRef} className="delete-confirm-popover" style={style}>
      <p className="delete-confirm-text">删除 {tagName}？</p>
      <div className="delete-confirm-actions">
        <button
          className="delete-confirm-btn delete-confirm-btn-danger"
          onClick={onConfirm}
        >
          确认删除
        </button>
        <button
          className="delete-confirm-btn delete-confirm-btn-cancel"
          onClick={onCancel}
        >
          取消
        </button>
      </div>
    </div>
  );
}
