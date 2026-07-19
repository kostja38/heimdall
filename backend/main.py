"""Heimdall backend — FastAPI application entry point."""

from fastapi import FastAPI

app = FastAPI(
    title="Heimdall",
    description="Local usage & cost tracking for Claude accounts.",
    version="0.1.0",
)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe. Returns a static OK payload."""
    return {"status": "ok"}
