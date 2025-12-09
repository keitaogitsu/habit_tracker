import React, { useState, useEffect } from 'react';
import './App.css';
import { habitsAPI, habitLogsAPI, ping } from './api';

function App() {
  // 状態の定義
  const [habits, setHabits] = useState([]);         // 習慣一覧
  const [habitLogs, setHabitLogs] = useState([]);   // ログ一覧
  const [loading, setLoading] = useState(true);     // 読み込み中
  const [error, setError] = useState(null);         // エラーメッセージ
  const [newHabitTitle, setNewHabitTitle] = useState('');  // 入力中の習慣名
  const [newHabitContent, setNewHabitContent] = useState('');  // 入力中の説明 

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
  },[]);

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
  },[]);

  // 習慣ログ取得
  useEffect(() => {
    const fetchHabitLogs = async () => {
      try {
        const response = await habitLogsAPI.getAll();
        setHabitLogs(response.data);
      } catch(err) {
        console.error('ログ取得エラー:', err);
      }
    };
    fetchHabitLogs();
  }, [habits.length]); // 習慣が追加されたときに再取得

  // 習慣作成
  const handleCreateHabit = async (e) => {
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
      setError(null); // エラーをクリア
    } catch(err) {
      console.log('習慣作成エラー:', err);
      console.error('エラー詳細:', err.response?.data); // 追加
    setError(`習慣の作成に失敗しました: ${err.response?.data?.title?.[0] || err.message || '不明なエラー'}`);
    }
  };

// 習慣削除
const handleDeleteHabit = async (id) => {
    try {
      // 削除ではなく、is_activeをfalseに更新
      await habitsAPI.update(id, {
        is_active: false
      });
      // 画面からも削除（is_activeがfalseになったので表示されなくなる）
      setHabits(habits.filter(habit => habit.id !== id));
    } catch(err) {
      console.log('習慣削除(非表示)エラー:', err);
      setError('習慣の削除(非表示)に失敗しました。');
    }
  };

// 習慣編集（習慣名＋説明を編集可能）
const handleEditHabit = async (habit) => {
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
    setHabits(habits.map(h => h.id === habit.id ? response.data : h));
  } catch(err) {
    console.error('習慣編集エラー:', err);
    setError('習慣の編集に失敗しました。');
  }
};

  // 過去30日間の日付リストを生成
  const getDateRange = () => {
    const dates = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    return dates;
  };

  // 特定の習慣と日付のログを取得
  const getLogForHabitAndDate = (habitId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    return habitLogs.find(log => 
      log.habit === habitId && log.date === dateStr
    );
  };

  // セルクリック時の処理（ログの追加/更新/削除）
  const handleCellClick = async (habitId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    const existingLog = getLogForHabitAndDate(habitId, date);
    
    try {
      if (existingLog) {
        // 既存のログがある場合、doneをトグル
        if (existingLog.done) {
          // doneがtrueなら削除（またはfalseに更新）
          await habitLogsAPI.update(existingLog.id, { done: false });
          setHabitLogs(habitLogs.map(log => 
            log.id === existingLog.id ? { ...log, done: false } : log
          ));
        } else {
          // doneがfalseならtrueに更新
          await habitLogsAPI.update(existingLog.id, { done: true });
          setHabitLogs(habitLogs.map(log => 
            log.id === existingLog.id ? { ...log, done: true } : log
          ));
        }
      } else {
        // ログがない場合、新規作成
        const response = await habitLogsAPI.create({
          habit: habitId,
          date: dateStr,
          done: true,
        });
        setHabitLogs([...habitLogs, response.data]);
      }
    } catch(err) {
      console.error('ログ更新エラー:', err);
      setError('ログの更新に失敗しました。');
    }
  };

  if (loading) {
    return <div className='App'>読み込み中...</div>
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
            onChange={(e) => setNewHabitTitle(e.target.value)}
            className="habit-input"
          />
          <textarea
            placeholder="説明（任意）"
            value={newHabitContent}
            onChange={(e) => setNewHabitContent(e.target.value)}
            className="habit-textarea"
          />
          <button type="submit" className="habit-button">習慣を追加</button>
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
              {habits.map(habit => (
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
                    {habit.content && (
                      <div className="habit-content">{habit.content}</div>
                    )}
                  </div>
                  <div className="gantt-cells">
                    {dateRange.map((date, index) => {
                      const log = getLogForHabitAndDate(habit.id, date);
                      const isDone = log && log.done;
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
}

export default App;
