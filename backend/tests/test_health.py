import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG = json.loads((REPO_ROOT / "catalog.json").read_text(encoding="utf-8"))


def test_health_ok(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok", "version": "0.1.0"}


def test_health_degraded_when_db_unavailable(client, monkeypatch):
    monkeypatch.setattr("app.db.check", lambda: False)

    response = client.get("/api/health")

    assert response.status_code == 503
    assert response.json() == {
        "status": "degraded",
        "database": "error",
        "version": "0.1.0",
    }
