"""
Abstract base classes para todos los conectores externos.
Connector pattern: agregar un nuevo financiador = agregar una clase que implementa
estas interfaces, sin tocar el core del sistema.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class PractitionerVerification:
    """Resultado de verificar la matrícula de un profesional en REFEPS."""

    found: bool
    cufp: str | None = None
    dni: str | None = None
    matricula_nacional: str | None = None
    nombre: str | None = None
    apellido: str | None = None
    estado_matricula: str = "desconocido"  # vigente | suspendida | inhabilitada | desconocido
    profesion: str | None = None
    especialidad: str | None = None
    provincias_habilitadas: list[str] = field(default_factory=list)
    fuente: str = "desconocida"  # refeps_ws | refeps_rest | mock | manual
    error: str | None = None


@dataclass
class CoverageResult:
    """Resultado de verificar la cobertura de un afiliado."""

    found: bool
    activa: bool = False
    afiliado_id: str | None = None
    financiador_id: str | None = None
    financiador_nombre: str | None = None
    plan: str | None = None
    estado: str = "desconocida"  # activa | inactiva | suspendida | desconocida
    fuente: str = "desconocida"  # osde_fhir | farmalink | mock
    error: str | None = None


@dataclass
class PrescriptionRouteResult:
    """Resultado de enviar una receta a Farmalink para dispensa en farmacia."""

    success: bool
    cuir: str | None = None
    tracking_id: str | None = None
    fuente: str = "desconocida"
    error: str | None = None


class CredentialConnector(ABC):
    """
    Interface para verificación de matrículas de profesionales de la salud.
    Implementaciones: REFEPSConnector (real), MockREFEPSConnector (mock).
    """

    @abstractmethod
    async def verify_matricula(
        self,
        dni: str | None = None,
        matricula: str | None = None,
        cufp: str | None = None,
    ) -> PractitionerVerification:
        """
        Verifica la matrícula de un profesional.
        Al menos uno de dni, matricula o cufp debe estar presente.
        """
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Verifica que el servicio externo esté disponible."""
        ...

    async def close(self) -> None:
        """Libera recursos (HTTP client, conexiones). No-op por defecto."""


class EligibilityConnector(ABC):
    """
    Interface para verificación de cobertura de afiliados.
    Implementaciones: OSDEConnector, FarmalinkConnector, MockEligibilityConnector.
    """

    @abstractmethod
    async def check_coverage(
        self,
        afiliado_id: str,
        financiador_id: str,
        prestacion_code: str | None = None,
    ) -> CoverageResult:
        """
        Verifica si un afiliado tiene cobertura activa para una prestación dada.
        Si prestacion_code es None, verifica cobertura general.
        """
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Verifica que el servicio externo esté disponible."""
        ...

    async def close(self) -> None:
        """Libera recursos (HTTP client, conexiones). No-op por defecto."""


class PrescriptionConnector(ABC):
    """
    Interface para envío y tracking de recetas electrónicas.
    Implementaciones: FarmalinkPrescriptionConnector, MockPrescriptionConnector.
    """

    @abstractmethod
    async def route_prescription(
        self,
        cuir: str,
        prescriber_cufp: str,
        patient_dni: str,
        medicamento_snomed: str,
        financiador_id: str | None = None,
    ) -> PrescriptionRouteResult:
        """Envía la receta a Farmalink para dispensa en farmacias."""
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        ...

    async def close(self) -> None:
        """Libera recursos (HTTP client, conexiones). No-op por defecto."""
