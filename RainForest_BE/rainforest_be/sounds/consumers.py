# from channels.generic.websocket import AsyncWebsocketConsumer
# from datetime import datetime
# import wave
# import os
# import aiohttp
# from urllib.parse import parse_qs

# os.makedirs('sounds/wav_audio', exist_ok=True)  # Tạo thư mục nếu chưa tồn tại

# class SoundsConsumer(AsyncWebsocketConsumer):
#     def __init__(self, *args, **kwargs):
#         super().__init__(*args, **kwargs)
#         self.audio_buffer = bytearray()
#         self.last_save_time = None
#         self.save_interval = 10  # giây
#         self.device_id = None
#         self.group_name = None

#     async def connect(self):
#         query_string = self.scope['query_string'].decode()
#         params = parse_qs(query_string)
#         self.device_id = params.get('deviceId', [None])[0]
#         print(f'ESP32 connected, deviceId={self.device_id}')
#         self.group_name = f"sounds_{self.device_id}" if self.device_id else "sounds"
#         await self.channel_layer.group_add(self.group_name, self.channel_name)
#         await self.accept()
#         self.last_save_time = datetime.now()

#     async def disconnect(self, close_code):
#         print(f'ESP32 disconnected, deviceId={self.device_id}')
#         await self.channel_layer.group_discard(self.group_name, self.channel_name)
#         if self.audio_buffer:
#             timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
#             filename = f"sounds/wav_audio/{self.device_id}_{timestamp}.wav" if self.device_id else f"sounds/wav_audio/{timestamp}.wav"
#             self.save_audio_file(self.audio_buffer, filename)
#             # # Gửi audio còn lại cho group
#             # await self.channel_layer.group_send(
#             #     self.group_name,
#             #     {
#             #         "type": "send_audio",
#             #         "audio": bytes(self.audio_buffer)
#             #     }
#             # )
            
#         await self.close()

#     def save_audio_file(self, data, filename):
#         sample_rate = 16000
#         sample_width = 4
#         channels = 1

#         with wave.open(filename, 'wb') as wf:
#             wf.setnchannels(channels)
#             wf.setsampwidth(sample_width)
#             wf.setframerate(sample_rate)
#             wf.writeframes(data)
#         print(f"Saved audio file: {filename} ({len(data)} bytes)")
#         return filename

#     async def send_file_to_server(self, filepath):
#         try:
#             url = "http://192.168.141.117:5000/ai/recognize-sounds"  # Đúng endpoint
#             async with aiohttp.ClientSession() as session:
#                 with open(filepath, 'rb') as f:
#                     form_data = aiohttp.FormData()
#                     form_data.add_field('audio',  # Phải trùng với request.files.get('audio')
#                                         f,
#                                         filename=os.path.basename(filepath),
#                                         content_type='audio/wav')
#                     async with session.post(url, data=form_data) as resp:
#                         response_data = await resp.json()
#                         if resp.status == 200:
#                             print(f"Prediction: {response_data.get('message')}")
#                             return 1 if response_data.get('message') == '1' else 0
#                         else:
#                             print(f"Failed to upload {filepath}: {resp.status}, {response_data}")
#                             return 0
#         except Exception as e:
#             print(f'Error in send_file_to_server: {e}')

#     async def receive(self, text_data=None, bytes_data=None):
#         try:
#             if bytes_data:
                
#                 self.audio_buffer.extend(bytes_data)
#                  # Gửi audio buffer cho group (frontend sẽ nhận được binary)
#                 await self.channel_layer.group_send(
#                     self.group_name,
#                     {
#                         "type": "send_audio",
#                         "audio": bytes(bytes_data),
#                         "predict": None
#                     }
#                 )
#                 now = datetime.now()
#                 elapsed = (now - self.last_save_time).total_seconds()
#                 if elapsed >= self.save_interval:
#                     timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
#                     filename = f"sounds/wav_audio/{self.device_id}_{timestamp}.wav" if self.device_id else f"sounds/wav_audio/{timestamp}.wav"
#                     self.save_audio_file(self.audio_buffer, filename)
#                     predict = await self.send_file_to_server(filename)
#                     await self.channel_layer.group_send(
#                         self.group_name,
#                         {
#                             "type": "send_audio",
#                             "audio": bytes(self.audio_buffer),
#                             "predict": predict
#                         }
#                     )
#                     self.audio_buffer.clear()
#                     self.last_save_time = now
#             else:
#                 print(f"Received text: {text_data}")
#         except Exception as e:
#             print(f'Error in receive: {e}')

#     async def send_audio(self, event):
#         # Nếu có predict (không phải None), chỉ gửi predict về client
#         if event.get("predict") == 1:
#             await self.send(text_data=str(event["predict"]))
#         elif event.get("predict") is None:
#             await self.send(bytes_data=event["audio"])


from channels.generic.websocket import AsyncWebsocketConsumer
from datetime import datetime
import wave
import os
import aiohttp
import numpy as np
from urllib.parse import parse_qs

os.makedirs('sounds/wav_audio', exist_ok=True)  # Tạo thư mục nếu chưa tồn tại

class SoundsConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.audio_buffer = bytearray()
        self.last_save_time = None
        self.save_interval = 10  # giây
        self.device_id = None
        self.group_name = None
        self.chunk_count = 0

    async def connect(self):
        query_string = self.scope['query_string'].decode()
        params = parse_qs(query_string)
        self.device_id = params.get('deviceId', [None])[0]
        print(f'ESP32 connected, deviceId={self.device_id}')
        self.group_name = f"sounds_{self.device_id}" if self.device_id else "sounds"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        self.last_save_time = datetime.now()

    async def disconnect(self, close_code):
        print(f'ESP32 disconnected, deviceId={self.device_id}')
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        if self.audio_buffer:
            await self.save_and_send_predict()
        await self.close()

    def convert_int32_to_int16(self, raw_bytes):
        int32_data = np.frombuffer(raw_bytes, dtype=np.int32)
        int16_data = (int32_data >> 16).astype(np.int16)
        return int16_data.tobytes()

    def save_audio_file(self, data, filename):
        sample_rate = 16000
        sample_width = 4
        channels = 1

        with wave.open(filename, 'wb') as wf:
            wf.setnchannels(channels)
            wf.setsampwidth(sample_width)
            wf.setframerate(sample_rate)
            wf.writeframes(data)
        print(f"✅ Saved audio file: {filename} ({len(data)} bytes)")
        return filename

    async def send_file_to_server(self, filepath):
        try:
            url = "http://localhost:5000/ai/recognize-sounds"
            async with aiohttp.ClientSession() as session:
                with open(filepath, 'rb') as f:
                    form_data = aiohttp.FormData()
                    form_data.add_field(
                        'audio',
                        f,
                        filename=os.path.basename(filepath),
                        content_type='audio/wav'
                    )
                    async with session.post(url, data=form_data) as resp:
                        if resp.status == 200:
                            response_data = await resp.json()
                            print(f"✅ Prediction response: {response_data}")
                            return 1 if response_data.get('message') == '1' else 0
                        else:
                            print(f"❌ Upload failed ({resp.status}): {await resp.text()}")
                            return 0
        except Exception as e:
            print(f'❌ Error in send_file_to_server: {e}')
            return 0

    async def save_and_send_predict(self):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"sounds/wav_audio/{self.device_id}_{timestamp}.wav" if self.device_id else f"sounds/wav_audio/{timestamp}.wav"
        #converted_data = self.convert_int32_to_int16(self.audio_buffer)
        self.save_audio_file(self.audio_buffer, filename)
        predict = await self.send_file_to_server(filename)
        # predict = 0
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "send_audio",
                "audio": bytes(self.audio_buffer),
                "predict": predict
            }
        )
        self.audio_buffer.clear()
        self.last_save_time = datetime.now()

    async def receive(self, text_data=None, bytes_data=None):
        try:
            if bytes_data:
                self.audio_buffer.extend(bytes_data)
                self.chunk_count += 1
                # Gửi raw audio cho group (frontend)
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "send_audio",
                        "audio": bytes(bytes_data),
                        "predict": None
                    }
                )

                # elapsed = (datetime.now() - self.last_save_time).total_seconds()
                # if elapsed >= self.save_interval:
                #     await self.save_and_send_predict()
                if self.chunk_count >= 650:
                    await self.save_and_send_predict()
                    self.chunk_count = 0
            else:
                print(f"Received text: {text_data}")

        except Exception as e:
            print(f'❌ Error in receive: {e}')

    async def send_audio(self, event):
        if event.get("predict") is not None:
            await self.send(text_data=str(event["predict"]))
        else:
            await self.send(bytes_data=event["audio"])
