# habits/urls.py
from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from .views import HabitViewSet, HabitLogViewSet

router = DefaultRouter()
router.register(r'habits', HabitViewSet)
router.register(r'habit-logs', HabitLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('ping/', views.ping, name='ping'),
]
