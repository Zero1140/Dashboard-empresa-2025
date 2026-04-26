"""Tests for Celery config and FHIR practitioner converter."""


def test_celery_app_configured():
    from app.tasks import celery_app
    assert celery_app.main == "saludos"
    assert "verify-practitioners-weekly" in celery_app.conf.beat_schedule
    schedule = celery_app.conf.beat_schedule["verify-practitioners-weekly"]
    assert schedule["schedule"] == 604800


def test_fhir_practitioner_from_refeps_full():
    from app.fhir.practitioner import FHIRPractitioner
    data = {
        "cufp": "CUFP-00001234",
        "dni": "12345678",
        "matricula_nacional": "MN-98765",
        "nombre": "María",
        "apellido": "García",
        "estado_matricula": "vigente",
    }
    p = FHIRPractitioner.from_refeps_response(data)
    assert p.id == "CUFP-00001234"
    assert p.active is True
    cufp_id = next(i for i in p.identifier if "cufp" in i.system)
    assert cufp_id.value == "CUFP-00001234"
    assert p.name[0].family == "García"
    assert p.name[0].given == ["María"]


def test_fhir_practitioner_from_refeps_minimal():
    from app.fhir.practitioner import FHIRPractitioner
    p = FHIRPractitioner.from_refeps_response({"estado_matricula": "suspendida"})
    assert p.active is False
    assert p.identifier == []
    assert p.name == []
