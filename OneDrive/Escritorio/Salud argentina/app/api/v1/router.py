from fastapi import APIRouter

from app.api.v1.endpoints.admin import router as admin_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.consultations import router as consultations_router
from app.api.v1.endpoints.credentials import router as credentials_router
from app.api.v1.endpoints.eligibility import router as eligibility_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.practitioners import router as practitioners_router
from app.api.v1.endpoints.prescriptions import router as prescriptions_router

router = APIRouter()

router.include_router(health_router)
router.include_router(auth_router)
router.include_router(admin_router)
router.include_router(credentials_router)
router.include_router(eligibility_router)
router.include_router(consultations_router)
router.include_router(prescriptions_router)
router.include_router(practitioners_router)
