from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    app_env: str = "development"
    app_secret_key: str = "change-me"
    app_allowed_origins: list[str] = ["http://localhost:3000"]

    # Database
    database_url: str = "postgresql+asyncpg://saludos:saludos_dev@db:5432/saludos_db"

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # JWT
    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60
    jwt_refresh_expire_days: int = 7

    # Conectores — modo mock
    refeps_mock_mode: bool = True
    refeps_ws_url: str = "https://sisa.msal.gov.ar/sisa/services/profesionalService"
    refeps_rest_url: str = "https://sisa.msal.gov.ar/sisa/services/rest/profesional/buscar"
    refeps_username: str = ""
    refeps_password: str = ""

    osde_mock_mode: bool = True
    osde_fhir_base_url: str = "https://sandbox.farmalink.com.ar/apis-docs/FARMALINK_RE/farmalink/v3"
    osde_client_id: str = ""
    osde_client_secret: str = ""
    osde_token_url: str = "https://sandbox.farmalink.com.ar/oauth2/token"

    farmalink_mock_mode: bool = True
    farmalink_base_url: str = "https://sandbox.farmalink.com.ar"
    farmalink_api_key: str = ""

    # Celery
    celery_broker_url: str = "redis://redis:6379/1"
    celery_result_backend: str = "redis://redis:6379/2"

    # Email (Resend — free tier 3000/mes)
    resend_api_key: str = ""
    invitation_secret: str = "change-me-invitation"
    frontend_base_url: str = "http://localhost:3000"
    password_reset_expire_minutes: int = 60

    # Encriptación en reposo (Ley 25.326)
    encryption_key: str = ""   # Fernet key — 32 bytes base64. Obligatoria en producción.
    hmac_secret: str = ""      # HMAC secret — 32 bytes. Obligatoria en producción.

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def any_mock_active(self) -> bool:
        return self.refeps_mock_mode or self.osde_mock_mode or self.farmalink_mock_mode

    @property
    def mock_connectors_list(self) -> list[str]:
        mocks = []
        if self.refeps_mock_mode:
            mocks.append("REFEPS")
        if self.osde_mock_mode:
            mocks.append("OSDE FHIR")
        if self.farmalink_mock_mode:
            mocks.append("Farmalink Hub")
        return mocks


settings = Settings()
