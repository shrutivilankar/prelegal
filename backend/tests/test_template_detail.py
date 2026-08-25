import json
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG = json.loads((REPO_ROOT / "catalog.json").read_text(encoding="utf-8"))


def test_detail_returns_content(client):
    response = client.get("/api/templates/Mutual-NDA.md")

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"name", "description", "filename", "content"}
    assert body["filename"] == "Mutual-NDA.md"
    assert body["content"].startswith("#")


def test_detail_content_matches_file(client):
    response = client.get("/api/templates/Mutual-NDA.md")

    expected = (REPO_ROOT / "templates" / "Mutual-NDA.md").read_text(encoding="utf-8")
    assert response.json()["content"] == expected


def test_detail_unknown_filename_404(client):
    response = client.get("/api/templates/nope.md")

    assert response.status_code == 404
    assert "detail" in response.json()


def test_detail_rejects_path_traversal(client):
    for malicious in ["..%2F..%2Fcatalog.json", "../catalog.json", "..\\catalog.json"]:
        response = client.get(f"/api/templates/{malicious}")
        assert response.status_code == 404


def test_detail_rejects_unindexed_files(client):
    response = client.get("/api/templates/LICENSE.txt")

    assert response.status_code == 404


@pytest.mark.parametrize("entry", CATALOG, ids=lambda e: e["filename"])
def test_every_catalog_entry_resolves(client, entry):
    response = client.get(f"/api/templates/{entry['filename']}")

    assert response.status_code == 200
    assert response.json()["content"].strip() != ""
