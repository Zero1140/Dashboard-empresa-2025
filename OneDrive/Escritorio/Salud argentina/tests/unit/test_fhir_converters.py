"""Unit tests for FHIR R4 converter helpers."""

import pytest
from app.fhir.patient import FHIRPatient
from app.fhir.coverage import FHIRCoverage


def test_fhir_patient_from_dni_full():
    p = FHIRPatient.from_dni("12345678", nombre="María", apellido="García")
    assert p.resourceType == "Patient"
    assert p.id == "dni-12345678"
    assert len(p.identifier) == 1
    assert p.identifier[0].value == "12345678"
    assert p.identifier[0].system == "https://argentina.gob.ar/dni"
    assert len(p.name) == 1
    assert p.name[0].family == "García"
    assert p.name[0].given == ["María"]


def test_fhir_patient_from_dni_no_name():
    p = FHIRPatient.from_dni("99887766")
    assert p.id == "dni-99887766"
    assert p.name == []


def test_fhir_coverage_from_farmalink_active():
    data = {
        "coverage_id": "COV-001",
        "activa": True,
        "afiliado_id": "SWISS-001",
        "financiador_nombre": "Swiss Medical",
    }
    c = FHIRCoverage.from_farmalink_response(data)
    assert c.resourceType == "Coverage"
    assert c.status == "active"
    assert c.subscriber_id == "SWISS-001"
    assert c.payor[0]["display"] == "Swiss Medical"


def test_fhir_coverage_from_farmalink_inactive():
    data = {"activa": False, "afiliado_id": "MED-001", "financiador_nombre": "Medifé"}
    c = FHIRCoverage.from_farmalink_response(data)
    assert c.status == "cancelled"


def test_fhir_coverage_defaults():
    c = FHIRCoverage()
    assert c.resourceType == "Coverage"
    assert c.status == "active"
    assert c.identifier == []
    assert c.payor == []
