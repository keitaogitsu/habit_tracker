import { useState, FormEvent, ChangeEvent } from "react";

type Props = {
  setIsCreateOpen: (value: boolean) => void,
  handleCreateHabit: (
    title: string,
    content: string,
    e: FormEvent<HTMLFormElement>,
  ) => void,
};

export function AddHabitModal({
  setIsCreateOpen,
  handleCreateHabit,
}: Props) {
  const [newHabitTitle, setNewHabitTitle] = useState(""); // 入力中の習慣名
  const [newHabitContent, setNewHabitContent] = useState(""); // 入力中の説明

  return (
      <div className="modal-overlay" onClick={() => setIsCreateOpen(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>習慣を追加</h3>
          <form onSubmit={(e) => 
            handleCreateHabit(newHabitTitle, newHabitContent, e)
            } className="habit-form">
            <input
              type="text"
              placeholder="習慣名"
              value={newHabitTitle}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setNewHabitTitle(e.target.value)
              }
              className="habit-input"
              autoFocus
            />
            <textarea
              placeholder="説明（任意）"
              value={newHabitContent}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setNewHabitContent(e.target.value)
              }
              className="habit-textarea"
            />
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="cancel-button"
              >
                キャンセル
              </button>
              <button type="submit" className="habit-button">
                追加
              </button>
            </div>
          </form>
        </div>
      </div>
  )
}