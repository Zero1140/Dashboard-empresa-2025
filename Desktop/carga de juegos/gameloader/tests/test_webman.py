import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from webman import WebManClient


def _mock_response(status_code: int, text: str = "") -> MagicMock:
    r = MagicMock()
    r.status_code = status_code
    r.text = text
    return r


class TestIsAvailable:
    def test_true_when_http_responds(self):
        with patch("webman.requests.get", return_value=_mock_response(200)):
            assert WebManClient("1.2.3.4").is_available() is True

    def test_false_on_connection_error(self):
        import requests as req
        with patch("webman.requests.get", side_effect=req.RequestException):
            assert WebManClient("1.2.3.4").is_available() is False

    def test_false_on_server_error(self):
        with patch("webman.requests.get", return_value=_mock_response(500)):
            assert WebManClient("1.2.3.4").is_available() is False


class TestGetFwType:
    def test_returns_hen(self):
        with patch("webman.requests.get", return_value=_mock_response(200, "HEN")):
            assert WebManClient("1.2.3.4").get_fw_type() == "HEN"

    def test_returns_cfw(self):
        with patch("webman.requests.get", return_value=_mock_response(200, "CFW")):
            assert WebManClient("1.2.3.4").get_fw_type() == "CFW"

    def test_returns_none_on_error(self):
        import requests as req
        with patch("webman.requests.get", side_effect=req.RequestException):
            assert WebManClient("1.2.3.4").get_fw_type() is None

    def test_hen_case_insensitive(self):
        with patch("webman.requests.get", return_value=_mock_response(200, "hen")):
            assert WebManClient("1.2.3.4").get_fw_type() == "HEN"


class TestIsHenActive:
    def test_true_when_fw_type_is_hen(self):
        with patch("webman.requests.get", return_value=_mock_response(200, "HEN")):
            assert WebManClient("1.2.3.4").is_hen_active() is True

    def test_false_when_fw_type_is_cfw(self):
        with patch("webman.requests.get", return_value=_mock_response(200, "CFW")):
            assert WebManClient("1.2.3.4").is_hen_active() is False


class TestRefreshXmb:
    def test_true_on_200(self):
        with patch("webman.requests.get", return_value=_mock_response(200)):
            assert WebManClient("1.2.3.4").refresh_xmb() is True

    def test_false_on_error(self):
        import requests as req
        with patch("webman.requests.get", side_effect=req.RequestException):
            assert WebManClient("1.2.3.4").refresh_xmb() is False


class TestNotify:
    def test_url_encodes_message(self):
        with patch("webman.requests.get", return_value=_mock_response(200)) as mock_get:
            WebManClient("1.2.3.4").notify("Hola mundo!")
            url = mock_get.call_args[0][0]
            assert "Hola%20mundo%21" in url

    def test_false_on_error(self):
        import requests as req
        with patch("webman.requests.get", side_effect=req.RequestException):
            assert WebManClient("1.2.3.4").notify("msg") is False
