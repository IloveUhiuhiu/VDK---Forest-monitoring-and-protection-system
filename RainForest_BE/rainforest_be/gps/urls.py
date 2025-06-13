from django.urls import path
from .views import UpdateLocationView, GetAllLocationsView

urlpatterns = [
    path('update-location/', UpdateLocationView.as_view(), name='update_location'),
    path('all-locations/', GetAllLocationsView.as_view(), name='get_all_locations'),
]
