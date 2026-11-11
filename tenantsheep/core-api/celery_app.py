import os
from celery import Celery

celery_app = Celery(
    "tenantsheep_create",
    broker=os.getenv("CELERY_BROKER_URL", "redis://redis:6379/1"),
    backend=os.getenv("CELERY_BROKER_URL", "redis://redis:6379/1"),
)

# Silence Celery 5.x startup-retry deprecation
celery_app.conf.broker_connection_retry_on_startup = True

# Register task modules with the worker (Celery imports nothing by default)
celery_app.conf.imports = ('tasks',)
