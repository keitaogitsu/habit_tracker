from django.shortcuts import render
from django.http import JsonResponse
from rest_framework import viewsets
from .models import Habit, HabitLog
from .serializers import HabitSerializer, HabitLogSerializer

def ping(request):
    return JsonResponse({"message": "ok", "app": "habits"})

class HabitViewSet(viewsets.ModelViewSet):
    queryset = Habit.objects.filter(is_active=True)
    serializer_class = HabitSerializer

class HabitLogViewSet(viewsets.ModelViewSet):
    queryset = HabitLog.objects.all()
    serializer_class = HabitLogSerializer



