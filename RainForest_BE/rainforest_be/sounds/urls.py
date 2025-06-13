from django.urls import path
from .views import TestingAPI, SoundAPI

urlpatterns = [
    path('/', TestingAPI.as_view(), name='testing_api'),
    path('/sounds', SoundAPI.as_view(), name='sound_api'),
]