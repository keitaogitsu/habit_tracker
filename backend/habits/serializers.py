from rest_framework import serializers
from .models import Habit, HabitLog

class HabitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Habit
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

class HabitLogSerializer(serializers.ModelSerializer):
    habit_title = serializers.CharField(source='habit.title', read_only=True)
    
    class Meta:
        model = HabitLog
        fields = ['id', 'habit', 'habit_title', 'date', 'done']
        read_only_fields = ['id', 'habit_title']

