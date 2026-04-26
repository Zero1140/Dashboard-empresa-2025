# app/tasks/__init__.py
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "saludos",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.verify_practitioners"],
)

celery_app.conf.beat_schedule = {
    "verify-practitioners-weekly": {
        "task": "app.tasks.verify_practitioners.verify_all_active",
        "schedule": 604800,  # 7 días en segundos
    }
}
celery_app.conf.timezone = "America/Argentina/Buenos_Aires"
