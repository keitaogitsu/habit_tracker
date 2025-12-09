from django.db import models

# 習慣そのものを管理するモデル
# 例：　英語、筋トレ、読書　など
class Habit(models.Model):
    title = models.CharField(max_length=100)
    content = models.TextField(blank=True) # 説明のためのフィールド
    is_active = models.BooleanField(default=True)  # pyright: ignore[reportArgumentType] # 非表示にするためのフラグ
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return str(self.title)


# 日付ごとの実績モデル（ある日付に対して、その習慣をやったかどうかを表すモデル）
# 例：日付と、その習慣をやったかどうかの情報　など
class HabitLog(models.Model):
    habit = models.ForeignKey(Habit, on_delete=models.PROTECT, related_name="logs")
    date = models.DateField()
    done = models.BooleanField(default=False)  # pyright: ignore[reportArgumentType]

    class Meta:
        unique_together = ('habit', 'date')
        ordering = ['-date']

    def __str__(self) -> str:
        habit: Habit = self.habit  # type: ignore[assignment]
        return f"{habit.title} - {self.date} - {'done' if self.done else 'not done'}"

