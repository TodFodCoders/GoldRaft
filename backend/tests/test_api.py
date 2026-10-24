"""Integration tests for FastAPI endpoints."""

from fastapi.testclient import TestClient
from backend.api.main import app

client = TestClient(app)


def test_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "data_status" in data
    assert "payload" in data
    assert data["payload"]["status"] == "HEALTHY"


def test_contracts_endpoint():
    resp = client.get("/contracts")
    assert resp.status_code == 200
    data = resp.json()
    assert "payload" in data
    contracts = data["payload"]["contracts"]
    assert "GOLDM" in contracts
    assert "GOLDTEN" in contracts
    assert "GOLDGUINEA" in contracts
    assert "GOLDPETAL" in contracts
    assert contracts["GOLDPETAL"]["location_basis_differs"] is True
    assert contracts["GOLDM"]["location_basis_differs"] is False


def test_prices_endpoint():
    resp = client.get("/prices")
    assert resp.status_code == 200
    data = resp.json()
    assert "payload" in data
    assert "records" in data["payload"]
    assert data["payload"]["total_records"] > 0


def test_data_quality_endpoint():
    resp = client.get("/data-quality")
    assert resp.status_code == 200
    data = resp.json()
    assert "payload" in data
    assert "imported_files" in data["payload"]
    assert data["payload"]["accepted_files_count"] == 9


def test_calendar_endpoint():
    resp = client.get("/calendar?sample_expiry=2026-06-30")
    assert resp.status_code == 200
    data = resp.json()
    assert "payload" in data
    assert data["payload"]["holidays_count"] == 31
    assert data["payload"]["sample_tender_checks"]["conservative_start"] == "2026-06-25"
