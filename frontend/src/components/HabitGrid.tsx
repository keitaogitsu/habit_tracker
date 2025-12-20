import type { Habit, HabitLog } from "../api";
import { formatDateLocal } from "../dateUtils";

type Props = {
  habits: Habit[];
  habitLogs: HabitLog[];
  dateRange: Date[];
  todayStr: string;
  descriptionCharLimit?: number;
  expandedHabits: Set<number>;
  getLogForHabitAndDate: (habitId: number, date: Date) => HabitLog | undefined;
  onCellClick: (habitId: number, date: Date) => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: number) => void;
  onToggleHabitExpanded: (habitId: number) => void;
  onCollapseHabitExpanded: (habitId: number) => void;
};

export function HabitGrid({
  habits,
  habitLogs,
  dateRange,
  todayStr,
  descriptionCharLimit,
  expandedHabits,
  getLogForHabitAndDate,
  onCellClick,
  onEditHabit,
  onDeleteHabit,
  onToggleHabitExpanded,
  onCollapseHabitExpanded,
}: Props) {
  const DESCRIPTION_CHAR_LIMIT = descriptionCharLimit ?? 30;

  const getDateCompletionRate = (date: Date): number => {
    if (habits.length === 0) return 0;
    const dateStr = formatDateLocal(date);
    const doneCount = habits.reduce((count, habit) => {
      const log = habitLogs.find(
        (item) => item.habit === habit.id && item.date === dateStr
      );
      return count + (log?.done ? 1 : 0);
    }, 0);
    return Math.round((doneCount / habits.length) * 100);
  };

  return (
    <div className="gantt-chart">
      <div className="gantt-header">
        <div className="gantt-habit-header">習慣名</div>
        <div className="gantt-dates">
          <div className="gantt-month-row">
            {dateRange.map((date, index) => {
              const prevDate = index > 0 ? dateRange[index - 1] : null;
              const isMonthHead =
                !prevDate || date.getMonth() !== prevDate.getMonth();
              const label = isMonthHead
                ? `${date.getFullYear()}/${date.getMonth() + 1}`
                : "";
              const monthParity =
                (date.getFullYear() * 12 + date.getMonth()) % 2 === 0;
              return (
                <div
                  key={`month-${index}`}
                  className={`gantt-month-cell ${
                    monthParity ? "month-even" : "month-odd"
                  } ${isMonthHead ? "month-head" : ""}`}
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
              const dateStr = formatDateLocal(date);
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={`summary-${index}`}
                  className={`gantt-summary-cell ${isToday ? "today" : ""}`}
                  title={`${date.toLocaleDateString("ja-JP")} の達成率`}
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
        {habits.map((habit) => {
          const content = habit.content ?? "";
          const needsClamp = content.length > DESCRIPTION_CHAR_LIMIT;
          const isExpanded = expandedHabits.has(habit.id);

          return (
            <div key={habit.id} className="gantt-row">
              <div className="gantt-habit-name">
                <div className="habit-title-row">
                  <div className="habit-title">{habit.title}</div>
                  <div className="habit-actions">
                    <button
                      onClick={() => onEditHabit(habit)}
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
                      onClick={() => onDeleteHabit(habit.id)}
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
                      className={`habit-content ${
                        !isExpanded && needsClamp ? "clamped" : ""
                      } ${isExpanded ? "expanded" : ""}`}
                    >
                      {content}
                      {isExpanded && (
                        <button
                          type="button"
                          className="close-expand"
                          onClick={() => onCollapseHabitExpanded(habit.id)}
                        >
                          閉じる
                        </button>
                      )}
                    </div>

                    {needsClamp && (
                      <button
                        type="button"
                        className="more-button"
                        onClick={() => onToggleHabitExpanded(habit.id)}
                      >
                        <span className="more-text">
                          {isExpanded ? "閉じる" : "さらに表示"}
                        </span>
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
                  const dateStr = formatDateLocal(date);
                  const isToday = dateStr === todayStr;

                  return (
                    <div
                      key={index}
                      className={`gantt-cell ${isDone ? "done" : ""} ${
                        isToday ? "today" : ""
                      }`}
                      onClick={() => onCellClick(habit.id, date)}
                      title={`${date.toLocaleDateString("ja-JP")} - ${
                        isDone ? "完了" : "未完了"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
