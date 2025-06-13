# monitor/routing.py
from django.urls import path
from .consumers import SensorConsumer

websocket_urlpatterns = [
    path('ws/sensor/', SensorConsumer.as_asgi()),
]
