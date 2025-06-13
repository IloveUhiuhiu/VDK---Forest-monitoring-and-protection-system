from django.urls import path
from .views import sensor_history

urlpatterns = [
    path('api/sensor-history', sensor_history, name='sensor_history'),
]