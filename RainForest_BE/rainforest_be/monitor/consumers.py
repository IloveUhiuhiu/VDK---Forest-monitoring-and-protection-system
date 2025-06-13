# monitor/consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
import json
from .models import SensorData
from datetime import datetime, timezone
from mongoengine.context_managers import switch_collection

class SensorConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Lấy sensorId từ query string
        self.sensor_id = self.scope['query_string'].decode().split('deviceId=')[-1] if 'deviceId=' in self.scope['query_string'].decode() else None
        group_name = f"sensor_{self.sensor_id}" if self.sensor_id else "sensors"
        await self.channel_layer.group_add(group_name, self.channel_name)
        print(f"✅ WebSocket connected, sensor_id={self.sensor_id}")
        await self.accept()

    async def disconnect(self, close_code):
        group_name = f"sensor_{self.sensor_id}" if self.sensor_id else "sensors"
        await self.channel_layer.group_discard(group_name, self.channel_name)

    async def receive(self, text_data):
        # Nhận dữ liệu từ WebSocket client
        try:
            print("Received text data from WebSocket client:", text_data)
            data = json.loads(text_data)
            data["timestamp"] = datetime.now(timezone.utc).isoformat()
            print("Received JSON data from WebSocket client:", data)
            is_json = True
        except Exception:
            data = text_data
            is_json = False
        if is_json and isinstance(data, dict):
            print("Received data from WebSocket client:", data)
            device_id = data.get("device_id", "unknown_device")
            # Lưu dữ liệu vào cơ sở dữ liệu
            with switch_collection(SensorData, device_id):
                 SensorData(
                    temperature=float(data["temperature"]),
                    humidity=float(data["humidity"]),
                    timestamp=datetime.fromisoformat(data["timestamp"].replace("Z", "")) if "timestamp" in data else datetime.utcnow()
                ).save()
            # Gửi dữ liệu đến các client khác qua WebSocket
            group_name = f"sensor_{device_id}" if device_id else "sensors"
            await self.channel_layer.group_send(
                group_name,
                {
                    "type": "send_sensor",
                    "data": data
                }
            )
        elif data == "open":
            # Nhận lệnh bật bơm nước từ web, gửi lại cho cảm biến
            group_name = f"sensor_{self.sensor_id}" if self.sensor_id else "sensors"
            await self.channel_layer.group_send(
                group_name,
                {
                    "type": "pump_command",
                    "command": "open"
                }
            )
        elif data == "close":
            # Nhận lệnh tắt bơm nước từ web, gửi lại cho cảm biến
            group_name = f"sensor_{self.sensor_id}" if self.sensor_id else "sensors"
            await self.channel_layer.group_send(
                group_name,
                {
                    "type": "pump_command",
                    "command": "close"
                }
            )

    async def send_sensor(self, event):
        print("Data sent to client via WebSocket:", event['data'])
        await self.send(text_data=json.dumps(event['data']))

    async def pump_command(self, event):
        # Gửi lệnh bật bơm nước tới client cảm biến (chỉ gửi chuỗi 'open')
        await self.send(text_data=event["command"])
