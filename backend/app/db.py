import os
import sqlite3
from contextlib import contextmanager
from collections.abc import Iterator
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = REPO_ROOT / "backend" / "data" / "prelegal.db"

DB_ENV_VAR = "PRELEGAL_DB_PATH"


def get_db_path() -> Path:
    override = os.environ.get(DB_ENV_VAR)
    return Path(override) if override else DEFAULT_DB_PATH


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    get_db_path().parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                filename TEXT NOT NULL UNIQUE,
                sort_order INTEGER NOT NULL UNIQUE
            )
            """
        )


def sync_templates(entries: list[dict]) -> None:
    """Upsert catalog entries and drop rows no longer present in the catalog."""
    with connect() as conn:
        for sort_order, entry in enumerate(entries):
            conn.execute(
                """
                INSERT INTO templates (name, description, filename, sort_order)
                VALUES (:name, :description, :filename, :sort_order)
                ON CONFLICT(filename) DO UPDATE SET
                    name = excluded.name,
                    description = excluded.description,
                    sort_order = excluded.sort_order
                """,
                {**entry, "sort_order": sort_order},
            )
        conn.executemany(
            "DELETE FROM templates WHERE filename = ?",
            [
                (row["filename"],)
                for row in conn.execute("SELECT filename FROM templates").fetchall()
                if row["filename"] not in {entry["filename"] for entry in entries}
            ],
        )


def fetch_templates() -> list[dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT name, description, filename FROM templates ORDER BY sort_order"
        ).fetchall()
    return [dict(row) for row in rows]


def get_template_row(filename: str) -> dict | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT name, description, filename FROM templates WHERE filename = ?",
            (filename,),
        ).fetchone()
    return dict(row) if row else None


def check() -> bool:
    try:
        with connect() as conn:
            conn.execute("SELECT 1")
        return True
    except sqlite3.Error:
        return False
