import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import axios from 'axios';
import './App.css';
import { habitsAPI, habitLogsAPI, ping, Habit, HabitLog } from './api';

const App = (): JSX.Element => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newHabitTitle, setNewHabitTitle] = useState(''); // 入力中の習慣名
  const [newHabitContent, setNewHabitContent] = useState(''); // 入力中の説明

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
    } catch (err) {
      console.error('習慣作成エラー:', err);
      setError(`習慣の作成に失敗しました: ${getErrorMessage(err)}`);
    }
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
    const newTitle = window.prompt('習慣名を編集', habit.title);
    if (newTitle === null) return; // キャンセル
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return; // 空は無視

    const newContentInput = window.prompt('説明を編集（空欄可）', habit.content || '');
    if (newContentInput === null) return; // キャンセル
    const newContent = newContentInput.trim();

    try {
      const response = await habitsAPI.update(habit.id, {
        title: trimmedTitle,
        content: newContent,
      });
      setHabits(habits.map((h: Habit) => (h.id === habit.id ? response.data : h)));
    } catch (err) {
      console.error('習慣編集エラー:', err);
      setError('習慣の編集に失敗しました。');
    }
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
    const dateStr = date.toISOString().split('T')[0];
    return habitLogs.find((log: HabitLog) => log.habit === habitId && log.date === dateStr);
  };

  // セルクリック時の処理（ログの追加/更新/削除）
  const handleCellClick = async (habitId: number, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
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

  return (
    <div className="App">
      <header className="App-header">
        <h1>習慣トラッカー</h1>
        {error && <div className="error">{error}</div>}

        {/* 習慣作成フォーム */}
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
        </form>

        {/* ガントチャート風の習慣一覧 */}
        <div className="habits-list">
          <h2>習慣トラッカー（過去30日間）</h2>
          {habits.length === 0 ? (
            <p>習慣がありません。上記フォームから追加してください。</p>
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
                      return (
                        <div key={`month-${index}`} className="gantt-month-cell">
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
                </div>
              </div>
              {habits.map((habit) => (
                <div key={habit.id} className="gantt-row">
                  <div className="gantt-habit-name">
                    <div className="habit-title-row">
                      <div className="habit-title">{habit.title}</div>
                      <div className="habit-actions">
                        <button
                          onClick={() => handleEditHabit(habit)}
                          className="action-button-small edit-button-small"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteHabit(habit.id)}
                          className="action-button-small delete-button-small"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                    {habit.content && <div className="habit-content">{habit.content}</div>}
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
              ))}
            </div>
          )}
        </div>
      </header>
    </div>
  );
};

export default App;
