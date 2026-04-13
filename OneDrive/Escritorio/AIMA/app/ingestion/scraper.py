import logging
import re
import time
import requests
from typing import Any

logger = logging.getLogger(__name__)


class DREScraper:
    BASE_URL = "https://dre.pt/rest/api"
    SEARCH_URL = f"{BASE_URL}/dr/search"
    HEADERS = {
        "Accept": "application/json",
        "User-Agent": "AIMA-RAG/1.0 (legal research tool)",
    }
    IMMIGRATION_KEYWORDS = [
        "estrangeiros",
        "imigração",
        "autorização de residência",
        "AIMA",
        "SEF",
        "visto",
        "nacionalidade portuguesa",
        "manifestação de interesse",
        "reagrupamento familiar",
    ]
    MAX_RESULTS_PER_KEYWORD = 500  # safety cap to avoid unbounded pagination

    def search_diplomas(
        self,
        keyword: str,
        after_date: str | None = None,
        rows: int = 25,
    ) -> list[dict[str, Any]]:
        """
        Search dre.pt for diplomas matching keyword.
        after_date format: 'YYYY-MM-DD'
        Returns list of {id, title, type, date, url}.
        """
        params: dict[str, Any] = {
            "q": keyword,
            "rows": rows,
            "start": 0,
        }
        if after_date:
            params["fromDate"] = after_date

        all_results: list[dict] = []
        start = 0
        while True:
            params["start"] = start
            resp = requests.get(
                self.SEARCH_URL,
                params=params,
                headers=self.HEADERS,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])
            if not results:
                break
            all_results.extend(results)
            if len(all_results) >= min(data.get("total", 0), self.MAX_RESULTS_PER_KEYWORD):
                break
            start += rows
            time.sleep(0.5)

        return all_results

    def fetch_document_html(self, url: str) -> str:
        """Fetch full HTML of a diploma page."""
        resp = requests.get(url, headers=self.HEADERS, timeout=30)
        resp.raise_for_status()
        return resp.text

    def extract_lei_name(self, title: str) -> str:
        """
        Convert raw title to normalized lei name.
        'Lei n.º 23/2007, de 4 de Julho' → 'Lei 23/2007'
        'Decreto-Lei n.º 84/2007, ...' → 'Decreto-Lei 84/2007'
        """
        match = re.match(
            r"(Lei|Decreto-Lei|Portaria|Despacho|Resolução|Decreto|Aviso|Despacho Normativo)[^\d]*(\d+/\d+)",
            title,
            re.IGNORECASE,
        )
        if match:
            tipo = match.group(1).title()
            numero = match.group(2)
            return f"{tipo} {numero}"
        logger.warning("extract_lei_name: could not parse title '%s', using raw title", title[:80])
        return title[:60].strip()

    def get_all_immigration_diplomas(self, after_date: str | None = None) -> list[dict]:
        """Fetch diplomas for all immigration keywords, deduplicated by id."""
        seen: set[str] = set()
        all_diplomas: list[dict] = []
        for keyword in self.IMMIGRATION_KEYWORDS:
            try:
                results = self.search_diplomas(keyword=keyword, after_date=after_date)
                for r in results:
                    doc_id = str(r.get("id", ""))
                    if doc_id and doc_id not in seen:
                        seen.add(doc_id)
                        all_diplomas.append(r)
            except Exception as e:
                logger.warning("get_all_immigration_diplomas: keyword '%s' failed: %s", keyword, e)
            time.sleep(1)
        return all_diplomas
