import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TagPickerProps {
  currentTag: string;
  onSelectTag: (tag: string) => void;
  accentColor: string;
  labels: string[];
}

/** Truncate tag name: >6 chars → first 6 + "…" */
function truncateTagName(name: string): string {
  if (name.length > 6) return name.slice(0, 6) + '…';
  return name;
}

export const TagPicker: React.FC<TagPickerProps> = ({
  currentTag,
  onSelectTag,
  accentColor,
  labels,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const dropdown = document.querySelector('.tag-picker-dropdown');
      if (dropdown?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Position dropdown using fixed coords to escape overflow:hidden
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 6,
        left: rect.left + rect.width / 2,
      });
    }
  }, [isOpen]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback((tag: string) => {
    onSelectTag(tag);
    setIsOpen(false);
  }, [onSelectTag]);

  return (
    <div className="tag-picker-container" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="tag-picker-trigger"
        onClick={handleToggle}
        onMouseDown={(e) => e.stopPropagation()}
        aria-label="选择标签"
        aria-expanded={isOpen}
      >
        <span className="tag-picker-value">
          {currentTag ? truncateTagName(currentTag) : '请选择标签'}
        </span>
        <ChevronDown
          className={`tag-picker-chevron ${isOpen ? 'tag-picker-chevron-open' : ''}`}
          strokeWidth={2}
        />
      </button>

      <AnimatePresence>
        {isOpen && dropdownPos && (
          <motion.div
            className="tag-picker-dropdown"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              transform: 'translateX(-50%)',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {labels.length === 0 ? (
              <span className="tag-picker-item tag-picker-item-disabled">
                暂无标签，请在设置中添加
              </span>
            ) : (
              labels.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-picker-item ${currentTag === tag ? 'tag-picker-item-active' : ''}`}
                  style={currentTag === tag ? { color: accentColor } : undefined}
                  onClick={() => handleSelect(tag)}
                >
                  {tag}
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
