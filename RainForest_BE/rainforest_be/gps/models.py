from django.db import models
from mongoengine import Document, FloatField, StringField, DateTimeField
from datetime import datetime

# Create your models here.

class DeviceLocation(Document):
    device_id = StringField(required=True, unique=True)
    latitude = FloatField(required=True)
    longitude = FloatField(required=True)
    updated_at = DateTimeField(default=datetime.utcnow)
