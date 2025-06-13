"""
URL configuration for rainforest_be project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from monitor.views import sensor_history
from monitor.views import chart_view
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/sensor-history', sensor_history, name='sensor_history'),
    path('chart/', chart_view),  # Định nghĩa URL /chart/
    path('sounds/', include('sounds.urls')),  # Include the sounds app URLs
    path('gps/', include('gps.urls')),  # Include the gps app URLs
]
