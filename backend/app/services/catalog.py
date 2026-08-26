import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
CATALOG_PATH = REPO_ROOT / "catalog.json"
TEMPLATES_DIR = REPO_ROOT / "templates"


def load_catalog() -> list[dict]:
    with open(CATALOG_PATH, encoding="utf-8") as f:
        return json.load(f)


def read_template(filename: str) -> str:
    path = (TEMPLATES_DIR / filename).resolve()
    if not path.is_relative_to(TEMPLATES_DIR.resolve()):
        raise KeyError(filename)
    return path.read_text(encoding="utf-8")
