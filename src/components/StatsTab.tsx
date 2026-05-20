import { Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getProgressTone } from '../types';
import type { ProgressItem } from '../types';

interface StatsTabProps {
  progressItems: ProgressItem[];
  onAdd: () => void;
  onDelete: (id: number) => void;
  onUpdateTitle: (id: number, title: string) => void;
  onNormalizeTitle: (id: number, title: string) => void;
  onUpdateTotal: (id: number, totalStr: string) => void;
  onUpdateProgress: (id: number, delta: number) => void;
  onSound: (type: 'pop') => void;
}

export function StatsTab({
  progressItems,
  onAdd,
  onDelete,
  onUpdateTitle,
  onNormalizeTitle,
  onUpdateTotal,
  onUpdateProgress,
  onSound,
}: StatsTabProps) {
  return (
    <motion.div
      key="stats"
      className="stats-panel"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15, transition: { duration: 0.15 } }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="tab-header-flex">
        <div className="tab-header" style={{ marginBottom: 0 }}>进度条</div>
        <button
          type="button"
          onClick={() => { onSound('pop'); onAdd(); }}
          className="tab-icon-btn progress-add-btn"
          aria-label="新增进度条"
          title="新增进度条"
        >
          <Plus className="tab-header-icon" style={{ margin: 0 }} strokeWidth={2.5} />
        </button>
      </div>

      <div className="progress-list-scroll">
        <div className="progress-list">
          <AnimatePresence initial={false}>
            {progressItems.map((item, index) => {
              const percent = Math.min(100, Math.max(0, (item.current / item.total) * 100));
              const isComplete = percent >= 100;

              return (
                <motion.div
                  key={item.id}
                  layout
                  className="progress-item-group"
                  initial={{ opacity: 0, y: 14, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.22, ease: 'easeInOut' } }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                >
                  <div className="progress-header">
                    <input
                      value={item.title}
                      onChange={(e) => onUpdateTitle(item.id, e.target.value)}
                      onBlur={(e) => onNormalizeTitle(item.id, e.target.value)}
                      className="progress-title-input"
                      aria-label={`进度标题 ${index + 1}`}
                      maxLength={20}
                    />
                    <div className={`progress-meta ${getProgressTone(percent)}`}>
                      <span className="progress-current">{item.current}</span>
                      <span className="progress-slash">/</span>
                      <input
                        type="number"
                        title="自定义总数，点击进度条增加，右键减少"
                        value={item.total}
                        onChange={(e) => onUpdateTotal(item.id, e.target.value)}
                        className="progress-total-input no-spinners"
                        min={1}
                        aria-label={`${item.title} 总数`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => { onSound('pop'); onDelete(item.id); }}
                      className="progress-delete-btn"
                      aria-label={`删除 ${item.title}`}
                      title="删除进度条"
                    >
                      <X className="progress-delete-icon" strokeWidth={2.5} />
                    </button>
                  </div>

                  <button
                    type="button"
                    className={`progress-track ${getProgressTone(percent)}`}
                    onClick={() => { onSound('pop'); onUpdateProgress(item.id, 1); }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onSound('pop');
                      onUpdateProgress(item.id, -1);
                    }}
                    title={`${item.title}：左键 +1，右键 -1`}
                    aria-label={`${item.title} 进度，左键增加，右键减少`}
                  >
                    <span
                      className={`progress-fill ${isComplete ? 'progress-fill-complete' : ''}`}
                      style={{ width: `${percent}%` }}
                    />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {progressItems.length === 0 ? (
            <div className="empty-state-simple">还没有进度条</div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
