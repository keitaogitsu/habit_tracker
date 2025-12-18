import { useEffect, useState, useMemo, FormEvent, ChangeEvent } from 'react';
import axios from 'axios';
import './App.css';
import { habitsAPI, habitLogsAPI, ping, Habit, HabitLog } from './api';
import { formatDateLocal } from './dateUtils';

const App = (): JSX.Element => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newHabitTitle, setNewHabitTitle] = useState(''); // 入力中の習慣名
  const [newHabitContent, setNewHabitContent] = useState(''); // 入力中の説明
  const [isCreateOpen, setIsCreateOpen] = useState(false); // 作成モーダルの開閉
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [expandedHabits, setExpandedHabits] = useState<Set<number>>(new Set());

  const todayStr = useMemo(() => formatDateLocal(new Date()), []);

  const getErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      const serverMessage = (err.response?.data as { title?: string[] } | undefined)?.title?.[0];
      return serverMessage || err.message || '不明なエラー';
    }
    if (err instanceof Error) return err.message;
    return '不明なエラー';
  };

  // 接続テスト
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await ping();
        console.log('API接続成功:', response.data);
      } catch (err) {
        console.error('API接続エラー:', err);
        setError('APIサーバーに接続できません。バックエンドが起動しているか確認してください。');
      }
    };
    testConnection();
  }, []);

  // 習慣一覧取得
  useEffect(() => {
    const fetchHabits = async () => {
      try {
        const response = await habitsAPI.getAll();
        setHabits(response.data);
        setLoading(false);
      } catch (err) {
        console.error('習慣取得エラー:', err);
        setError('習慣の取得に失敗しました。');
        setLoading(false);
      }
    };
    fetchHabits();
  }, []);

  // 習慣ログ取得
  useEffect(() => {
    const fetchHabitLogs = async () => {
      try {
        const response = await habitLogsAPI.getAll();
        setHabitLogs(response.data);
      } catch (err) {
        console.error('ログ取得エラー:', err);
      }
    };
    fetchHabitLogs();
  }, [habits.length]); // 習慣が追加されたときに再取得

  // 習慣作成
  const handleCreateHabit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;

    try {
      const response = await habitsAPI.create({
        title: newHabitTitle,
        content: newHabitContent,
        is_active: true,
      });
      setHabits([...habits, response.data]);
      setNewHabitTitle('');
      setNewHabitContent('');
      setError(null);
      setIsCreateOpen(false);
    } catch (err) {
      console.error('習慣作成エラー:', err);
      setError(`習慣の作成に失敗しました: ${getErrorMessage(err)}`);
    }
  };

  const openCreateModal = () => {
    setNewHabitTitle('');
    setNewHabitContent('');
    setIsCreateOpen(true);
  };

  // 習慣削除
  const handleDeleteHabit = async (id: number) => {
    try {
      await habitsAPI.update(id, { is_active: false });
      setHabits(habits.filter((habit: Habit) => habit.id !== id));
    } catch (err) {
      console.error('習慣削除(非表示)エラー:', err);
      setError('習慣の削除(非表示)に失敗しました。');
    }
  };

  // 習慣編集（習慣名＋説明を編集可能）
  const handleEditHabit = async (habit: Habit) => {
    setEditingHabit(habit);
    setEditTitle(habit.title);
    setEditContent(habit.content ?? '');
  };

  // 過去30日間の日付リストを生成
  const getDateRange = (): Date[] => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    return dates;
  };

  // 特定の習慣と日付のログを取得
  const getLogForHabitAndDate = (habitId: number, date: Date): HabitLog | undefined => {
    const dateStr = formatDateLocal(date);
    return habitLogs.find((log: HabitLog) => log.habit === habitId && log.date === dateStr);
  };

  // セルクリック時の処理（ログの追加/更新/削除）
  const handleCellClick = async (habitId: number, date: Date) => {
    const dateStr = formatDateLocal(date);
    const existingLog = getLogForHabitAndDate(habitId, date);

    try {
      if (existingLog) {
        if (existingLog.done) {
          await habitLogsAPI.update(existingLog.id, { done: false });
          setHabitLogs(
            habitLogs.map((log: HabitLog) =>
              log.id === existingLog.id ? { ...log, done: false } : log
            )
          );
        } else {
          await habitLogsAPI.update(existingLog.id, { done: true });
          setHabitLogs(
            habitLogs.map((log: HabitLog) =>
              log.id === existingLog.id ? { ...log, done: true } : log
            )
          );
        }
      } else {
        const response = await habitLogsAPI.create({
          habit: habitId,
          date: dateStr,
          done: true,
        });
        setHabitLogs([...habitLogs, response.data]);
      }
    } catch (err) {
      console.error('ログ更新エラー:', err);
      setError('ログの更新に失敗しました。');
    }
  };

  if (loading) {
    return <div className="App">読み込み中...</div>;
  }

  const dateRange = getDateRange();
  const DESCRIPTION_CHAR_LIMIT = 30;

  const getCompletionRate = (habitId: number): number => {
    if (dateRange.length === 0) return 0;
    const doneCount = dateRange.reduce((count, date) => {
      const log = getLogForHabitAndDate(habitId, date);
      return count + (log?.done ? 1 : 0);
    }, 0);
    return Math.round((doneCount / dateRange.length) * 100);
  };

  const getDateCompletionRate = (date: Date): number => {
    if (habits.length === 0) return 0;
    const dateStr = date.toISOString().split('T')[0];
    const doneCount = habits.reduce((count, habit) => {
      const log = habitLogs.find((item) => item.habit === habit.id && item.date === dateStr);
      return count + (log?.done ? 1 : 0);
    }, 0);
    return Math.round((doneCount / habits.length) * 100);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>習慣トラッカー</h1>
        {error && <div className="error">{error}</div>}

        {/* 習慣作成フォーム 
        <form onSubmit={handleCreateHabit} className="habit-form">
          <input
            type="text"
            placeholder="習慣名"
            value={newHabitTitle}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewHabitTitle(e.target.value)}
            className="habit-input"
          />
          <textarea
            placeholder="説明（任意）"
            value={newHabitContent}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewHabitContent(e.target.value)}
            className="habit-textarea"
          />
          <button type="submit" className="habit-button">
            習慣を追加
          </button>
        </form> */}

        {/* ガントチャート風の習慣一覧 */}
        <div className="habits-display">
          <div className="habit-actions-row">
            <button className="habit-button" onClick={openCreateModal}>
              習慣を追加
            </button>
            <button className="habit-button secondary-button" onClick={() => setIsStatsOpen(true)}>
              統計
            </button>
          </div>
          {habits.length === 0 ? (
            <p>習慣がありません。上のボタンから追加してください。</p>
          ) : (
            <div className="gantt-chart">
              <div className="gantt-header">
                <div className="gantt-habit-header">習慣名</div>
                <div className="gantt-dates">
                  <div className="gantt-month-row">
                    {dateRange.map((date, index) => {
                      const prevDate = index > 0 ? dateRange[index - 1] : null;
                      const isMonthHead = !prevDate || date.getMonth() !== prevDate.getMonth();
                      const label = isMonthHead ? `${date.getFullYear()}/${date.getMonth() + 1}` : '';
                      const monthParity = (date.getFullYear() * 12 + date.getMonth()) % 2 === 0;
                      return (
                        <div
                          key={`month-${index}`}
                          className={`gantt-month-cell ${monthParity ? 'month-even' : 'month-odd'} ${
                            isMonthHead ? 'month-head' : ''
                          }`}
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>
                  <div className="gantt-day-row">
                    {dateRange.map((date, index) => (
                      <div key={`day-${index}`} className="gantt-date-header">
                        {date.getDate()}
                      </div>
                    ))}
                  </div>
                  <div className="gantt-summary-row">
                    {dateRange.map((date, index) => {
                      const completionRate = getDateCompletionRate(date);
                      const dateStr = date.toISOString().split('T')[0];
                      const isToday = dateStr === new Date().toISOString().split('T')[0];
                      return (
                        <div
                          key={`summary-${index}`}
                          className={`gantt-summary-cell ${isToday ? 'today' : ''}`}
                          title={`${date.toLocaleDateString('ja-JP')} の達成率`}
                        >
                          <div
                            className="summary-chart"
                            style={{
                              background: `conic-gradient(#22c55e ${completionRate}%, #e5e7eb ${completionRate}% 100%)`,
                            }}
                          >
                            <div className="summary-center">{completionRate}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="habits-list">
                {habits.map((habit: Habit) => {
                  const completionRate = getCompletionRate(habit.id);
                  const content = habit.content ?? '';
                  const needsClamp = content.length > DESCRIPTION_CHAR_LIMIT;
                  const isExpanded = expandedHabits.has(habit.id);
                  return (
                    <div key={habit.id} className="gantt-row">
                      <div className="gantt-habit-name">
                        <div className="habit-title-row">
                          <div className="habit-title">{habit.title}</div>
                          <div className="habit-actions">
                            <button
                              onClick={() => handleEditHabit(habit)}
                              className="action-button-small edit-button-small"
                              aria-label="編集"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                              <span className="sr-only">編集</span>
                            </button>
                            <button
                              onClick={() => handleDeleteHabit(habit.id)}
                              className="action-button-small delete-button-small"
                              aria-label="削除"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                              <span className="sr-only">削除</span>
                            </button>
                          </div>
                        </div>
                        {content && (
                          <div className="habit-content-wrapper">
                            <div
                              className={`habit-content ${!isExpanded && needsClamp ? 'clamped' : ''} ${
                                isExpanded ? 'expanded' : ''
                              }`}
                            >
                              {content}
                              {isExpanded && (
                                <button
                                  type="button"
                                  className="close-expand"
                                  onClick={() =>
                                    setExpandedHabits((prev) => {
                                      const next = new Set(prev);
                                      next.delete(habit.id);
                                      return next;
                                    })
                                  }
                                >
                                  閉じる
                                </button>
                              )}
                            </div>
                            {needsClamp && (
                              <button
                                type="button"
                                className="more-button"
                                onClick={() =>
                                  setExpandedHabits((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(habit.id)) {
                                      next.delete(habit.id);
                                    } else {
                                      next.add(habit.id);
                                    }
                                    return next;
                                  })
                                }
                              >
                                <span className="more-text">{isExpanded ? '閉じる' : 'さらに表示'}</span>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <circle cx="5" cy="12" r="2" />
                                  <circle cx="12" cy="12" r="2" />
                                  <circle cx="19" cy="12" r="2" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="gantt-cells">
                        {dateRange.map((date, index) => {
                          const log = getLogForHabitAndDate(habit.id, date);
                          const isDone = Boolean(log?.done);
                          const dateStr = date.toISOString().split('T')[0];
                          const isToday = dateStr === new Date().toISOString().split('T')[0];

                          return (
                            <div
                              key={index}
                              className={`gantt-cell ${isDone ? 'done' : ''} ${isToday ? 'today' : ''}`}
                              onClick={() => handleCellClick(habit.id, date)}
                              title={`${date.toLocaleDateString('ja-JP')} - ${isDone ? '完了' : '未完了'}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>
      {isCreateOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>習慣を追加</h3>
            <form onSubmit={handleCreateHabit} className="habit-form">
              <input
                type="text"
                placeholder="習慣名"
                value={newHabitTitle}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewHabitTitle(e.target.value)}
                className="habit-input"
                autoFocus
              />
              <textarea
                placeholder="説明（任意）"
                value={newHabitContent}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewHabitContent(e.target.value)}
                className="habit-textarea"
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="secondary">
                  キャンセル
                </button>
                <button type="submit" className="habit-button">
                  習慣を追加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editingHabit && (
        <div className="modal-overlay" onClick={() => setEditingHabit(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>習慣を編集</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editingHabit) return;
                if (!editTitle.trim()) return;
                try {
                  setIsSaving(true);
                  const res = await habitsAPI.update(editingHabit.id, {
                    title: editTitle.trim(),
                    content: editContent.trim(),
                  });
                  setHabits(habits.map((h) => (h.id === editingHabit.id ? res.data : h)));
                  setEditingHabit(null);
                } catch (err) {
                  setError('習慣の編集に失敗しました。');
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              <input
                className="modal-input"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus
                placeholder="習慣名"
              />
              <textarea
                className="modal-textarea"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="説明（任意）"
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setEditingHabit(null)} className="secondary">
                  キャンセル
                </button>
                <button type="submit" disabled={isSaving}>
                  {isSaving ? '保存中…' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isStatsOpen && (
        <div className="modal-overlay" onClick={() => setIsStatsOpen(false)}>
          <div className="modal stats-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>30日間の達成度</h3>
              <button className="modal-close" onClick={() => setIsStatsOpen(false)} aria-label="閉じる">
                ×
              </button>
            </div>
            {habits.length === 0 ? (
              <p>習慣がありません。</p>
            ) : (
              <div className="stats-list">
                {habits.map((habit) => {
                  const completionRate = getCompletionRate(habit.id);
                  return (
                    <div key={`stats-${habit.id}`} className="stats-item">
                      <div className="stats-info">
                        <div className="stats-title">{habit.title}</div>
                        {habit.content && <div className="stats-desc">{habit.content}</div>}
                      </div>
                      <div className="stats-chart">
                        <div
                          className="summary-chart"
                          style={{
                            background: `conic-gradient(#22c55e ${completionRate}%, #e5e7eb ${completionRate}% 100%)`,
                          }}
                        >
                          <div className="summary-center">{completionRate}%</div>
                        </div>
                        <span className="stats-label">30日達成率</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
