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


def test_coverage_endpoint():
    resp = client.get("/data-quality/coverage?from_date=2025-01-01&to_date=2026-10-23")
    assert resp.status_code == 200
    data = resp.json()
    assert "payload" in data
    p = data["payload"]
    assert p["total_trading_days_in_range"] == 465
    assert p["trading_days_with_file_count"] == 9
    assert p["missing_trading_days_count"] == 456


def test_spreads_endpoint_2026_10_22():
    resp = client.get("/spreads?trade_date=2026-10-22")
    assert resp.status_code == 200
    data = resp.json()
    assert "payload" in data
    p = data["payload"]
    assert p["total_pairs"] > 0
    kpi = p["summary_kpi_pair"]
    assert kpi is not None
    assert kpi["symbol_a"] == "GOLDTEN"
    assert kpi["symbol_b"] == "GOLDGUINEA"
    assert kpi["raw_expiry_a"] == "30OCT2026"
    assert kpi["spread_value_rs"] == -633.25
    assert round(kpi["spread_percentage"], 2) == -0.44
    assert kpi["label"] == "Observed gap (not a signal)"

    # Verify Z-score is UNAVAILABLE on current short history
    assert p["zscore_status"]["status"] == "UNAVAILABLE"
    assert p["zscore_status"]["z_score"] is None
    assert "insufficient history" in p["zscore_status"]["reason"]


def test_curve_endpoint():
    resp = client.get("/curve?trade_date=2026-10-22&symbol=GOLDM")
    assert resp.status_code == 200
    data = resp.json()
    assert "payload" in data
    assert data["payload"]["symbol"] == "GOLDM"
    assert data["payload"]["expiries_count"] > 0


def test_liquidity_endpoint():
    resp = client.get("/liquidity?symbol=GOLDTEN&expiry_date=2026-10-30")
    assert resp.status_code == 200
    data = resp.json()
    assert "payload" in data
    assert data["payload"]["symbol"] == "GOLDTEN"
    assert "Corwin-Schultz" in data["payload"]["disclaimer"]


def test_diagnostics_offset_endpoint():
    resp = client.get("/diagnostics/offset?target_expiry=2026-10-30")
    assert resp.status_code == 200
    data = resp.json()
    assert "payload" in data
    assert data["payload"]["observations_count"] > 0
    assert data["payload"]["disclaimer"] == "observed gap, unverified, not a signal"
