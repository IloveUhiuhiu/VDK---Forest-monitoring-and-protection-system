import os
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from channels.auth import AuthMiddlewareStack
import sounds.routing  # <--- thay bằng app chứa websocket_urlpatterns của bạn
import monitor.routing  # <--- thay bằng app chứa websocket_urlpatterns của bạn
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rainforest_be.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            sounds.routing.websocket_urlpatterns +
            monitor.routing.websocket_urlpatterns  # <--- thay bằng app chứa websocket_urlpatterns của bạn
        )
    ),
})
