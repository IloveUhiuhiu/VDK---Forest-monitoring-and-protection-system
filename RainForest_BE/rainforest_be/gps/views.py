from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import DeviceLocation
from datetime import datetime


class UpdateLocationView(APIView):
    permission_classes = [AllowAny]

    def put(self, request):
        data = request.data
        print("Received data:", data)
        device_id = data.get('device_id')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        if not all([device_id, latitude, longitude]):
            return Response({'error': 'Missing fields'}, status=status.HTTP_400_BAD_REQUEST)
        obj = DeviceLocation.objects(device_id=device_id).first()
        if obj:
            obj.latitude = latitude
            obj.longitude = longitude
            obj.updated_at = datetime.utcnow()
            obj.save()
        else:
            DeviceLocation(
                device_id=device_id,
                latitude=latitude,
                longitude=longitude,
                updated_at=datetime.utcnow()
            ).save()
        return Response({'status': 'ok'})


class GetAllLocationsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        locations = DeviceLocation.objects.all()
        data = [
            {
                'device_id': loc.device_id,
                'latitude': loc.latitude,
                'longitude': loc.longitude,
                'updated_at': loc.updated_at
            } for loc in locations
        ]
        return Response(data)
