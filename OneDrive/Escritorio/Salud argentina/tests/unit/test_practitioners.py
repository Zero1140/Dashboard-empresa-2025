import pytest
from app.models.practitioner_invitation import PractitionerInvitation, PractitionerProvince


def test_invitation_model_fields():
    assert hasattr(PractitionerInvitation, "email")
    assert hasattr(PractitionerInvitation, "token")
    assert hasattr(PractitionerInvitation, "estado")
    assert hasattr(PractitionerInvitation, "expires_at")
    assert hasattr(PractitionerInvitation, "tenant_id")
    assert hasattr(PractitionerInvitation, "invited_by_id")
    assert hasattr(PractitionerInvitation, "practitioner_id")


def test_province_model_fields():
    assert hasattr(PractitionerProvince, "provincia")
    assert hasattr(PractitionerProvince, "estado")
    assert hasattr(PractitionerProvince, "practitioner_id")
    assert hasattr(PractitionerProvince, "tenant_id")
    assert hasattr(PractitionerProvince, "updated_by_id")
