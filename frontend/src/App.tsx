import { useEffect, useState, useMemo, FormEvent, ChangeEvent } from "react";
import axios from "axios";
import "./App.css";
import { habitsAPI, habitLogsAPI, ping, Habit, HabitLog } from "./api";
import { formatDateLocal } from "./dateUtils";
import { HabitGrid } from "./components/HabitGrid";
import { AppHeader } from "./components/AppHeader";
import { AddHabitModal } from "./components/AddHabitModal";

const App = (): JSX.Element => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false); // 作成モーダルの開閉
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [expandedHabits, setExpandedHabits] = useState<Set<number>>(new Set());

  const todayStr = useMemo(() => formatDateLocal(new Date()), []);

  const toggleHabitExpanded = (habitId: number) => {
    setExpandedHabits((prev) => {
      const next = new Set(prev);
      if (next.has(habitId)) {
        next.delete(habitId);
      } else {
        next.add(habitId);
      }
      return next;
    });
  };

  const collapseHabitExpanded = (habitId: number) => {
    setExpandedHabits((prev) => {
      if (!prev.has(habitId)) return prev;
      const next = new Set(prev);
      next.delete(habitId);
      return next;
    });
  };

  const getErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      const serverMessage = (
        err.response?.data as { title?: string[] } | undefined
      )?.title?.[0];
      return serverMessage || err.message || "不明なエラー";
    }
    if (err instanceof Error) return err.message;
    return "不明なエラー";
  };

  // 接続テスト
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await ping();
        console.log("API接続成功:", response.data);
      } catch (err) {
        console.error("API接続エラー:", err);
        setError(
          "APIサーバーに接続できません。バックエンドが起動しているか確認してください。"
        );
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
        console.error("習慣取得エラー:", err);
        setError("習慣の取得に失敗しました。");
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
        console.error("ログ取得エラー:", err);
      }
    };
    fetchHabitLogs();
  }, [habits.length]); // 習慣が追加されたときに再取得

  // 習慣作成
  const handleCreateHabit = async (
    newTitle: string,
    newContent: string,
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const response = await habitsAPI.create({
        title: newTitle,
        content: newContent,
        is_active: true,
      });
      setHabits([...habits, response.data]);
      setError(null);
      setIsCreateOpen(false);
    } catch (err) {
      console.error("習慣作成エラー:", err);
      setError(`習慣の作成に失敗しました: ${getErrorMessage(err)}`);
    }
  };

  // 習慣削除
  const handleDeleteHabit = async (id: number) => {
    try {
      await habitsAPI.update(id, { is_active: false });
      setHabits(habits.filter((habit: Habit) => habit.id !== id));
    } catch (err) {
      console.error("習慣削除(非表示)エラー:", err);
      setError("習慣の削除(非表示)に失敗しました。");
    }
  };

  // 習慣編集（習慣名＋説明を編集可能）
  const handleEditHabit = async (habit: Habit) => {
    setEditingHabit(habit);
    setEditTitle(habit.title);
    setEditContent(habit.content ?? "");
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
  const getLogForHabitAndDate = (
    habitId: number,
    date: Date
  ): HabitLog | undefined => {
    const dateStr = formatDateLocal(date);
    return habitLogs.find(
      (log: HabitLog) => log.habit === habitId && log.date === dateStr
    );
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
      console.error("ログ更新エラー:", err);
      setError("ログの更新に失敗しました。");
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

  return (
    <div className="App">
      <AppHeader error={error} />
      <main className="App-content">
        {/* ガントチャート風の習慣一覧 */}
        <div className="habits-display">
          <div className="habit-actions-row">
            <button className="habit-button" onClick={() => setIsCreateOpen(true)}>
              習慣を追加
            </button>
            <button
              className="habit-button secondary-button"
              onClick={() => setIsStatsOpen(true)}
            >
              統計
            </button>
          </div>
          {habits.length === 0 ? (
            <p>習慣がありません。上のボタンから追加してください。</p>
          ) : (
            <HabitGrid
              habits={habits}
              habitLogs={habitLogs}
              dateRange={dateRange}
              todayStr={todayStr}
              descriptionCharLimit={DESCRIPTION_CHAR_LIMIT}
              expandedHabits={expandedHabits}
              getLogForHabitAndDate={getLogForHabitAndDate}
              onCellClick={handleCellClick}
              onEditHabit={handleEditHabit}
              onDeleteHabit={handleDeleteHabit}
              onToggleHabitExpanded={toggleHabitExpanded}
              onCollapseHabitExpanded={collapseHabitExpanded}
            />
          )}
        </div>
      </main>
      {isCreateOpen && (
        <AddHabitModal 
          setIsCreateOpen={setIsCreateOpen}
          handleCreateHabit={handleCreateHabit}
        />
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
                  setHabits(
                    habits.map((h) => (h.id === editingHabit.id ? res.data : h))
                  );
                  setEditingHabit(null);
                } catch (err) {
                  setError("習慣の編集に失敗しました。");
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
                <button
                  type="button"
                  onClick={() => setEditingHabit(null)}
                  className="secondary"
                >
                  キャンセル
                </button>
                <button type="submit" disabled={isSaving}>
                  {isSaving ? "保存中…" : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isStatsOpen && (
        <div className="modal-overlay" onClick={() => setIsStatsOpen(false)}>
          <div
            className="modal stats-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>30日間の達成度</h3>
              <button
                className="modal-close"
                onClick={() => setIsStatsOpen(false)}
                aria-label="閉じる"
              >
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
                        {habit.content && (
                          <div className="stats-desc">{habit.content}</div>
                        )}
                      </div>
                      <div className="stats-chart">
                        <div
                          className="summary-chart"
                          style={{
                            background: `conic-gradient(#22c55e ${completionRate}%, #e5e7eb ${completionRate}% 100%)`,
                          }}
                        >
                          <div className="summary-center">
                            {completionRate}%
                          </div>
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
