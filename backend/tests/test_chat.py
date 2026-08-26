import json
from types import SimpleNamespace

import pytest

from app.schemas import NdaFieldsPatch
from app.services import chat


@pytest.fixture()
def api_key(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")


def _stub_call_model(monkeypatch, payload):
    monkeypatch.setattr(
        "app.services.chat.call_model",
        lambda system_prompt, turns: json.dumps(payload),
    )


class TestNormalizeFields:
    def test_strips_whitespace_and_drops_empty_values(self):
        patch = NdaFieldsPatch(party1Name="  Acme Corp  ", purpose="   ")
        result = chat.normalize_fields(patch)
        assert result.party1Name == "Acme Corp"
        assert result.purpose is None

    def test_keeps_valid_iso_date_and_drops_invalid(self):
        patch = NdaFieldsPatch(effectiveDate="2026-12-01")
        assert chat.normalize_fields(patch).effectiveDate == "2026-12-01"

        bad = NdaFieldsPatch(effectiveDate="2026-13-40")
        assert chat.normalize_fields(bad).effectiveDate is None

    def test_truncates_iso_datetime_to_the_date_part(self):
        patch = NdaFieldsPatch(effectiveDate="2026-12-01T00:00:00Z")
        assert chat.normalize_fields(patch).effectiveDate == "2026-12-01"

    def test_keeps_positive_integer_years_only(self):
        patch = NdaFieldsPatch(mndaTermYears=3)
        assert chat.normalize_fields(patch).mndaTermYears == "3"

        zero = NdaFieldsPatch(confidentialityYears="0")
        assert chat.normalize_fields(zero).confidentialityYears is None

    def test_drops_non_ascii_and_oversized_years_without_raising(self):
        superscript = NdaFieldsPatch(mndaTermYears="\u00b2")
        assert chat.normalize_fields(superscript).mndaTermYears is None

        arabic = NdaFieldsPatch(mndaTermYears="\u0663")
        assert chat.normalize_fields(arabic).mndaTermYears is None

        huge = NdaFieldsPatch(confidentialityYears="9" * 5000)
        assert chat.normalize_fields(huge).confidentialityYears is None


class TestParseFields:
    def test_drops_only_the_invalid_field(self):
        result = chat.parse_fields(
            {"party1Name": "Acme Corp", "mndaTerm": "until terminated"}
        )
        assert result.party1Name == "Acme Corp"
        assert result.mndaTerm is None

    def test_returns_empty_patch_for_non_object(self):
        assert chat.parse_fields("nope") == NdaFieldsPatch()


class TestCallModel:
    def test_wraps_a_degenerate_provider_response(self, api_key, monkeypatch):
        monkeypatch.setattr(
            "app.services.chat.completion",
            lambda **kwargs: SimpleNamespace(choices=[]),
        )

        with pytest.raises(chat.ProviderError):
            chat.call_model("system", [{"role": "user", "content": "hi"}])


class TestChatEndpoint:
    def test_returns_reply_and_confirmed_fields(self, client, api_key, monkeypatch):
        _stub_call_model(
            monkeypatch,
            {
                "reply": "Got it - Acme Corp and Globex LLC.",
                "nda_fields": {
                    "party1Name": "Acme Corp",
                    "party2Name": "Globex LLC",
                    "mndaTermYears": 2,
                    "governingLaw": " ",
                },
            },
        )

        response = client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "Hi"}]},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["reply"] == "Got it - Acme Corp and Globex LLC."
        assert body["nda_fields"] == {
            "party1Name": "Acme Corp",
            "party2Name": "Globex LLC",
            "mndaTermYears": "2",
        }

    def test_forwards_full_history_with_system_prompt(
        self, client, api_key, monkeypatch
    ):
        captured = {}

        def fake_call_model(system_prompt, turns):
            captured["system"] = system_prompt
            captured["turns"] = turns
            return json.dumps({"reply": "ok", "nda_fields": {}})

        monkeypatch.setattr("app.services.chat.call_model", fake_call_model)

        client.post(
            "/api/chat",
            json={
                "messages": [
                    {"role": "user", "content": "hello"},
                    {"role": "assistant", "content": "hi there"},
                    {"role": "user", "content": "Acme Corp"},
                ]
            },
        )

        assert captured["system"].startswith("You are the intake assistant")
        assert captured["turns"][-1]["content"] == "Acme Corp"

    def test_returns_503_when_api_key_missing(self, client, monkeypatch):
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

        response = client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "Hi"}]},
        )

        assert response.status_code == 503

    def test_returns_502_when_provider_fails(self, client, api_key, monkeypatch):
        def raise_provider_error(*args, **kwargs):
            raise chat.ProviderError("boom")

        monkeypatch.setattr("app.services.chat.call_model", raise_provider_error)

        response = client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "Hi"}]},
        )

        assert response.status_code == 502

    def test_returns_502_on_invalid_provider_json(self, client, api_key, monkeypatch):
        monkeypatch.setattr(
            "app.services.chat.call_model", lambda s, t: "not json at all"
        )

        response = client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "Hi"}]},
        )

        assert response.status_code == 502

    def test_returns_502_on_empty_reply(self, client, api_key, monkeypatch):
        _stub_call_model(monkeypatch, {"reply": "   ", "nda_fields": {}})

        response = client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "Hi"}]},
        )

        assert response.status_code == 502

    def test_keeps_reply_when_a_single_field_is_invalid(
        self, client, api_key, monkeypatch
    ):
        _stub_call_model(
            monkeypatch,
            {
                "reply": "Noted.",
                "nda_fields": {"party1Name": "Acme Corp", "mndaTerm": "perpetual"},
            },
        )

        response = client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "Hi"}]},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["reply"] == "Noted."
        assert body["nda_fields"] == {"party1Name": "Acme Corp"}

    def test_does_not_leak_provider_detail_to_the_client(
        self, client, api_key, monkeypatch
    ):
        def raise_provider_error(*args, **kwargs):
            raise chat.ProviderError("upstream said sk-secret-token")

        monkeypatch.setattr("app.services.chat.call_model", raise_provider_error)

        response = client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "Hi"}]},
        )

        assert response.status_code == 502
        assert "sk-secret-token" not in response.text

    def test_rejects_empty_message_list(self, client):
        response = client.post("/api/chat", json={"messages": []})
        assert response.status_code == 422

    def test_rejects_unknown_role(self, client):
        response = client.post(
            "/api/chat",
            json={"messages": [{"role": "system", "content": "nope"}]},
        )
        assert response.status_code == 422

    def test_rejects_blank_message_content(self, client):
        response = client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": ""}]},
        )
        assert response.status_code == 422
