# # fake_device.py
# import requests
# import random
# import time

# URL = 'http://127.0.0.1:8000/api/sensor/'

# while True:
#     data = {
#         "temperature": round(random.uniform(20, 35), 2),
#         "humidity": round(random.uniform(60, 90), 2)
#     }
#     requests.post(URL, json=data)
#     print("Sent:", data)
#     time.sleep(2)  # Gửi mỗi 2 giây


# fake_device.py
import websocket
import json
import random
import time

URL = "ws://localhost:8000/ws/sensor/?deviceId=acc2570b65f4"  # Thay đổi URL nếu cần

def send_fake_data():
    ws = websocket.WebSocket()
    ws.connect(URL)
    print("Connected to WebSocket server")

    try:
        while True:
            data = {
                "device_id": "acc2570b65f4",  # ID thiết bị giả
                "temperature": round(random.uniform(25, 35), 1),
                "humidity": round(random.uniform(50, 70), 1),
            }
            ws.send(json.dumps(data))
            print("Sent:", data)
            time.sleep(2)  # Gửi mỗi 2 giây
    except KeyboardInterrupt:
        print("Closing connection")
        ws.close()

if __name__ == "__main__":
    send_fake_data()