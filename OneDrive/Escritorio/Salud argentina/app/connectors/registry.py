# app/connectors/registry.py
"""
Registry de conectores. Devuelve la implementacion correcta segun la config.
Cambiar REFEPS_MOCK_MODE / FARMALINK_MOCK_MODE en .env.
"""

from functools import lru_cache

from app.connectors.base import CredentialConnector, EligibilityConnector, PrescriptionConnector
from app.core.config import settings


@lru_cache
def get_credential_connector() -> CredentialConnector:
    if settings.refeps_mock_mode:
        from app.connectors.refeps.mock import MockREFEPSConnector
        return MockREFEPSConnector()
    from app.connectors.refeps.client import REFEPSConnector
    from app.services.credential_cache import CredentialCache
    real = REFEPSConnector(
        ws_url=settings.refeps_ws_url,
        rest_url=settings.refeps_rest_url,
        username=settings.refeps_username,
        password=settings.refeps_password,
    )
    return CredentialCache(inner=real, redis_url=settings.redis_url)


@lru_cache
def _get_farmalink_connector():
    """Single shared FarmalinkConnector instance — one HTTP connection pool for both uses."""
    from app.connectors.farmalink.client import FarmalinkConnector
    return FarmalinkConnector(
        base_url=settings.farmalink_base_url,
        api_key=settings.farmalink_api_key,
    )


@lru_cache
def get_eligibility_connector() -> EligibilityConnector:
    """
    Farmalink es el hub principal: OSDE + Swiss Medical + Medife + IOMA + 20 mas.
    Cuando llegue homologacion, cambiar FARMALINK_MOCK_MODE=false.
    """
    if settings.farmalink_mock_mode:
        from app.connectors.farmalink.mock import MockFarmalinkConnector
        return MockFarmalinkConnector()
    return _get_farmalink_connector()


@lru_cache
def get_prescription_connector() -> PrescriptionConnector:
    """Returns the prescription connector. Farmalink routes prescriptions to pharmacies."""
    if settings.farmalink_mock_mode:
        from app.connectors.farmalink.mock import MockFarmalinkConnector
        return MockFarmalinkConnector()
    return _get_farmalink_connector()
