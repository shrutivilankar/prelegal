import json
from pathlib import Path

from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG = json.loads((REPO_ROOT / "catalog.json").read_text(encoding="utf-8"))


def test_list_returns_all_catalog_entries(client):
    response = client.get("/api/templates")

    assert response.status_code == 200
    templates = response.json()["templates"]
    assert len(templates) == len(CATALOG)
    assert {t["filename"] for t in templates} == {c["filename"] for c in CATALOG}


def test_list_preserves_catalog_order(client):
    response = client.get("/api/templates")

    templates = response.json()["templates"]
    expected_order = [c["filename"] for c in CATALOG]
    assert [t["filename"] for t in templates] == expected_order


def test_list_entries_have_exact_shape(client):
    response = client.get("/api/templates")

    for template in response.json()["templates"]:
        assert set(template.keys()) == {"name", "description", "filename"}


def test_list_matches_catalog_metadata(client):
    response = client.get("/api/templates")

    by_filename = {t["filename"]: t for t in response.json()["templates"]}
    for entry in CATALOG:
        assert by_filename[entry["filename"]] == {
            "name": entry["name"],
            "description": entry["description"],
            "filename": entry["filename"],
        }
