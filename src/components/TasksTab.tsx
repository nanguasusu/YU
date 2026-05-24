import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { TaskItem } from '../types';

interface TasksTabProps {
  key?: React.Key;
  tasks: TaskItem[];
  accentColor: string;
  onToggle: (id: number, onSound: (completed: boolean) => void) => void;
  onDelete: (id: number) => void;
  onAdd: (text: string, tag: string) => void;
  onClearCompleted: () => void;
  onSound: (type: 'click' | 'complete') => void;
}

export function TasksTab({
  tasks,
  accentColor,
  onToggle,
  onDelete,
  onAdd,
  onClearCompleted,
  onSound,
}: TasksTabProps) {
  const [newTaskText, setNewTaskText] = useState('');
  const completedCount = tasks.filter((t) => t.completed).length;

  const submitTask = () => {
    const trimmedText = newTaskText.trim();
    if (!trimmedText) return;
    const parts = trimmedText.split(/\s+/);
    const tag = parts.find((p) => p.startsWith('#')) || '';
    const text = trimmedText.replace(tag, '').trim() || trimmedText;
    onSound('click');
    onAdd(text, tag);
    setNewTaskText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submitTask();
  };

  return (
    <motion.div
      key="tasks"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15, transition: { duration: 0.15 } }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="tab-header-row">
        <div className="tab-header task-header-inline">
          任务列表 ({completedCount}/{tasks.length})
        </div>
        {completedCount > 0 ? (
          <button
            type="button"
            className="text-action-btn"
            style={{ color: accentColor }}
            onClick={() => { onSound('complete'); onClearCompleted(); }}
          >
            清空已完成
          </button>
        ) : null}
      </div>

      <div className="task-list">
        <AnimatePresence>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              className="task-item task-item-group"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                scale: 1.1,
                rotateZ: (Math.random() - 0.5) * 15,
                y: 10,
                filter: 'blur(8px)',
                transition: { duration: 0.4, ease: 'easeIn' },
              }}
            >
              <button
                type="button"
                onClick={() => onToggle(task.id, (wasCompleted) => onSound(wasCompleted ? 'click' : 'complete'))}
                className="task-checkbox-btn"
                aria-label={task.completed ? `取消完成 ${task.text}` : `完成 ${task.text}`}
              >
                {task.completed ? (
                  <CheckSquare
                    className="task-checkbox-icon task-checkbox-icon-checked"
                    strokeWidth={2}
                    style={{ color: accentColor }}
                  />
                ) : (
                  <div
                    className="task-checkbox-empty"
                    style={{ '--accent': accentColor } as React.CSSProperties}
                  />
                )}
              </button>

              <span className={`task-text ${task.completed ? 'task-text-completed' : 'task-text-pending'}`}>
                {task.text}
              </span>

              {task.tag ? <span className="task-tag">{task.tag}</span> : null}

              {task.completed ? (
                <button
                  type="button"
                  onClick={() => { onSound('complete'); onDelete(task.id); }}
                  className="task-delete-btn"
                  title="删除任务"
                  aria-label={`删除任务 ${task.text}`}
                >
                  <Trash2 className="task-delete-icon" strokeWidth={2} />
                </button>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>

        {tasks.length === 0 ? (
          <div className="empty-state-simple">还没有任务，添加一个吧</div>
        ) : null}
      </div>

      <div className="task-input-container">
        <div className="task-input-icon-wrap">
          <Plus className="task-input-icon" strokeWidth={2.5} />
        </div>
        <input
          type="text"
          placeholder="添加任务，回车保存，可带 #标签"
          className="task-input"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={60}
        />
      </div>
    </motion.div>
  );
}
