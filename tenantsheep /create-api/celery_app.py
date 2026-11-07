import os
from celery import Celery

celery_app = Celery(
    "tenantsheep_create",
    broker=os.getenv("CELERY_BROKER_URL", "redis://redis:6379/1"),
    backend=os.getenv("CELERY_BROKER_URL", "redis://redis:6379/1"),
)
