# monitor/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from .models import SensorData
from datetime import datetime, timedelta
from mongoengine.context_managers import switch_collection

# @api_view(['POST'])
# def receive_sensor_data(request):
#     serializer = SensorDataSerializer(data=request.data)
#     if serializer.is_valid():
#         instance = serializer.save()

#         # Push lên WebSocket
#         channel_layer = get_channel_layer()
#         async_to_sync(channel_layer.group_send)(
#             'sensors',
#             {
#                 'type': 'send_sensor',
#                 'data': SensorDataSerializer(instance).data
#             }
#         )

#         return Response({"status": "ok"}, status=201)
#     return Response(serializer.errors, status=400)

def chart_view(request):
    return render(request, 'chart.html')

@require_GET
def sensor_history(request):
    device_id = request.GET.get('deviceId')
    date_str = request.GET.get('date')
    if not device_id or not date_str:
        return JsonResponse({'error': 'Missing deviceId or date'}, status=400)
    try:
        date = datetime.strptime(date_str, '%Y-%m-%d')
    except Exception:
        return JsonResponse({'error': 'Invalid date format'}, status=400)
    start = date
    end = date + timedelta(days=1)
    with switch_collection(SensorData, device_id):
        data = SensorData.objects(timestamp__gte=start, timestamp__lt=end).order_by('timestamp')
        result = [
            {
                'temperature': d.temperature,
                'humidity': d.humidity,
                'timestamp': d.timestamp.isoformat(),
                'device_id': device_id
            } for d in data
        ]
    return JsonResponse(result, safe=False)
