# monitor/models.py
from mongoengine import Document, FloatField, DateTimeField
from datetime import datetime

class SensorData(Document):
    temperature = FloatField(required=True)
    humidity = FloatField(required=True)
    timestamp = DateTimeField(default=datetime.utcnow)
    


