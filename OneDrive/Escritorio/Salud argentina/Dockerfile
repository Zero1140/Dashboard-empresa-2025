FROM python:3.12-slim

WORKDIR /app

# Instalar uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copiar dependencias primero (cache layer)
COPY pyproject.toml .
RUN uv sync --no-dev --no-install-project

# Copiar código
COPY app/ ./app/
COPY migrations/ ./migrations/
COPY scripts/ ./scripts/

EXPOSE 8000

CMD [".venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
