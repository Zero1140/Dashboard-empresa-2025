from unittest.mock import patch, MagicMock
from app.ingestion.scraper import DREScraper


MOCK_SEARCH_RESPONSE = {
    "results": [
        {
            "id": "12345",
            "title": "Lei n.º 23/2007, de 4 de Julho",
            "type": "lei",
            "date": "2007-07-04",
            "url": "https://dre.pt/dr/detalhe/lei/23-2007-12345",
        }
    ],
    "total": 1,
}

MOCK_HTML = "<html><body><div class='diploma-text'><p>Artigo 1.º\nObjeto</p></div></body></html>"


def test_search_diplomas_returns_list():
    scraper = DREScraper()
    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = MOCK_SEARCH_RESPONSE
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        results = scraper.search_diplomas(keyword="estrangeiros", after_date="2007-01-01")
        assert len(results) == 1
        assert results[0]["title"] == "Lei n.º 23/2007, de 4 de Julho"


def test_fetch_document_returns_html():
    scraper = DREScraper()
    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.text = MOCK_HTML
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        html = scraper.fetch_document_html("https://dre.pt/dr/detalhe/lei/23-2007-12345")
        assert "<html>" in html
        assert "Artigo 1" in html


def test_extract_lei_name_from_title():
    scraper = DREScraper()
    name = scraper.extract_lei_name("Lei n.º 23/2007, de 4 de Julho")
    assert name == "Lei 23/2007"


def test_extract_lei_name_decreto():
    scraper = DREScraper()
    name = scraper.extract_lei_name("Decreto-Lei n.º 84/2007, de 29 de março")
    assert name == "Decreto-Lei 84/2007"
