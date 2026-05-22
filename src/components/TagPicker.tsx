import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { ACTIVITY_TAG_OPTIONS } from '../types';
import type { CustomTag } from '../types';
import { DeleteConfirmPopover } from './DeleteConfirmPopover';

interface TagPickerProps {
  currentTag: string;
  onSelectTag: (tag: string) => void;
  accentColor: string;
  customTags: CustomTag[];
  visibleCustomTags: CustomTag[];
  allCustomTags: CustomTag[];
  hasMoreTags: boolean;
  isAtLimit: boolean;
  onCreateTag: (name: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteTag?: (tagId: number) => Promise<{ success: boolean; error?: string }>;
}

const MAX_TAG_NAME_LENGTH = 10;

/** 截断标签名：>6 字符显示前 6 字符 + "…" */
function truncateTagName(name: string): string {
  if (name.length > 6) return name.slice(0, 6) + '…';
  return name;
}

export const TagPicker: React.FC<TagPickerProps> = ({
  currentTag,
  onSelectTag,
  accentColor,
  visibleCustomTags,
  allCustomTags,
  hasMoreTags,
  isAtLimit,
  onCreateTag,
  onDeleteTag,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAllCustom, setShowAllCustom] = useState(false);
  const [isInputMode, setIsInputMode] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<CustomTag | null>(null);
  const [deleteAnchorEl, setDeleteAnchorEl] = useState<HTMLElement | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Long-press refs
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  // 点击外部关闭下拉
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Check if click is inside the container (trigger) or the dropdown
      if (containerRef.current?.contains(target)) return;
      // Also check if click is inside the fixed dropdown
      const dropdown = document.querySelector('.tag-picker-dropdown');
      if (dropdown?.contains(target)) return;
      
      setIsOpen(false);
      setIsInputMode(false);
      setShowAllCustom(false);
      setInputValue('');
      setError('');
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // 计算 dropdown 定位（fixed positioning 避免 overflow:hidden 裁剪）
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 6,
        left: rect.left + rect.width / 2,
      });
    }
  }, [isOpen]);

  // 输入框聚焦
  useEffect(() => {
    if (isInputMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputMode]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      setIsInputMode(false);
      setShowAllCustom(false);
      setInputValue('');
      setError('');
    } else {
      setIsOpen(true);
    }
  }, [isOpen]);

  const handleSelectPreset = useCallback((tag: string) => {
    onSelectTag(tag);
    setIsOpen(false);
    setIsInputMode(false);
    setShowAllCustom(false);
    setInputValue('');
    setError('');
  }, [onSelectTag]);

  const handleSelectCustom = useCallback((tag: CustomTag) => {
    onSelectTag(tag.name);
    setIsOpen(false);
    setIsInputMode(false);
    setShowAllCustom(false);
    setInputValue('');
    setError('');
  }, [onSelectTag]);

  const handleShowMore = useCallback(() => {
    setShowAllCustom(true);
  }, []);

  const handleStartCustomInput = useCallback(() => {
    if (isAtLimit) return;
    setIsInputMode(true);
    setError('');
  }, [isAtLimit]);

  const handleInputKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) {
        // 空输入，忽略
        setIsInputMode(false);
        setInputValue('');
        return;
      }

      const result = await onCreateTag(trimmed);
      if (result.success) {
        // 创建成功或已存在，选中该标签
        onSelectTag(trimmed.slice(0, MAX_TAG_NAME_LENGTH));
        setIsOpen(false);
        setIsInputMode(false);
        setShowAllCustom(false);
        setInputValue('');
        setError('');
      } else if (result.error === 'limit_reached') {
        setError('已达上限');
      } else {
        setError('保存失败，请重试');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsInputMode(false);
      setInputValue('');
      setError('');
    }
  }, [inputValue, onCreateTag, onSelectTag]);

  const handleInputBlur = useCallback(() => {
    setIsInputMode(false);
    setInputValue('');
    setError('');
  }, []);

  // --- Delete logic ---

  const handleCustomTagContextMenu = useCallback(
    (e: React.MouseEvent, tag: CustomTag) => {
      e.preventDefault();
      e.stopPropagation();
      setDeleteTarget(tag);
      setDeleteAnchorEl(e.currentTarget as HTMLElement);
    },
    [],
  );

  const handleTouchStart = useCallback(
    (tag: CustomTag, e: React.TouchEvent) => {
      longPressTimerRef.current = setTimeout(() => {
        setDeleteTarget(tag);
        setDeleteAnchorEl(e.currentTarget as unknown as HTMLElement);
      }, 500);
    },
    [],
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget || !onDeleteTag) return;
    const result = await onDeleteTag(deleteTarget.id);
    if (result.success) {
      setDeleteTarget(null);
      setDeleteAnchorEl(null);
      setDeleteError('');
    } else {
      setDeleteTarget(null);
      setDeleteAnchorEl(null);
      setDeleteError(result.error || '删除失败');
      // Auto-clear error after 2 seconds
      setTimeout(() => setDeleteError(''), 2000);
    }
  }, [deleteTarget, onDeleteTag]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null);
    setDeleteAnchorEl(null);
  }, []);

  const displayedCustomTags = showAllCustom ? allCustomTags : visibleCustomTags;

  return (
    <div className="tag-picker-container" ref={containerRef}>
      {/* 收起态触发按钮 */}
      <button
        ref={triggerRef}
        type="button"
        className="tag-picker-trigger"
        onClick={handleToggle}
        onMouseDown={(e) => e.stopPropagation()}
        aria-label="选择当前活动标签"
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

      {/* 展开态下拉列表 */}
      {isOpen && dropdownPos && (
        <div
          className="tag-picker-dropdown"
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            transform: 'translateX(-50%)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >          {/* Preset Tags */}
          <div className="tag-picker-section">
            {ACTIVITY_TAG_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`tag-picker-item ${currentTag === tag ? 'tag-picker-item-active' : ''}`}
                style={currentTag === tag ? { color: accentColor } : undefined}
                onClick={() => handleSelectPreset(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Custom Tags */}
          {displayedCustomTags.length > 0 && (
            <div className="tag-picker-section tag-picker-section-custom">
              {displayedCustomTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`tag-picker-item ${currentTag === tag.name ? 'tag-picker-item-active' : ''}`}
                  style={currentTag === tag.name ? { color: accentColor } : undefined}
                  onClick={() => handleSelectCustom(tag)}
                  onContextMenu={(e) => handleCustomTagContextMenu(e, tag)}
                  onTouchStart={(e) => handleTouchStart(tag, e)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          {/* "更多..." 按钮 */}
          {hasMoreTags && !showAllCustom && (
            <button
              type="button"
              className="tag-picker-item tag-picker-more"
              onClick={handleShowMore}
            >
              更多...
            </button>
          )}

          {/* "自定义..." 入口 */}
          {!isInputMode && (
            <button
              type="button"
              className={`tag-picker-item tag-picker-custom-btn ${isAtLimit ? 'tag-picker-item-disabled' : ''}`}
              onClick={handleStartCustomInput}
              disabled={isAtLimit}
            >
              {isAtLimit ? '已达上限' : '自定义...'}
            </button>
          )}

          {/* 内联输入框 */}
          {isInputMode && (
            <div className="tag-picker-input-wrap">
              <input
                ref={inputRef}
                type="text"
                className="tag-picker-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.slice(0, MAX_TAG_NAME_LENGTH))}
                onKeyDown={handleInputKeyDown}
                onBlur={handleInputBlur}
                maxLength={MAX_TAG_NAME_LENGTH}
                placeholder="输入标签名..."
                aria-label="输入自定义标签名称"
              />
              {error && <span className="tag-picker-error">{error}</span>}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirm Popover */}
      {deleteTarget && (
        <DeleteConfirmPopover
          tagName={deleteTarget.name}
          anchorEl={deleteAnchorEl}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {/* Delete error toast */}
      {deleteError && (
        <div className="tag-picker-delete-error" role="alert">
          {deleteError}
        </div>
      )}
    </div>
  );
};
