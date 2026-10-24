"""FastAPI Application for GoldRaft Commodity Derivatives Intelligence."""

from __future__ import annotations

import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.analytics.coverage import compute_coverage
from backend.analytics.curve import compute_symbol_curve
from backend.analytics.liquidity import compute_contract_liquidity_series
from backend.analytics.offset_diagnostic import compute_offset_diagnostics
from backend.analytics.relative_value import compute_pair_spread, compute_point_in_time_zscore
from backend.normalization.price_normalizer import compute_four_contract_lcm, normalize_record
from backend.api.models import (
    CalendarPayload,
    ContractItem,
    ContractsPayload,
    CoveragePayload,
    CurvePayload,
    DataQualityPayload,
    DataStatus,
    HealthPayload,
    HolidayItem,
    LiquidityPayload,
    NormalizedPayload,
    OffsetDiagnosticPayload,
    PriceRecord,
    PricesPayload,
    QuarantineRecord,
    ResponseEnvelope,
    SpreadsPayload,
)
from backend.contract_calendar.calendar import (
    CALENDAR_COVERAGE_END,
    CALENDAR_COVERAGE_START,
    TradingDayPolicy,
    get_calendar,
)
from backend.ingestion.manual_importer import ManualImporter, load_contracts_config
from backend.storage.parquet_store import get_parquet_store

app = FastAPI(
    title="GoldRaft API",
    description="Expiry-Aware Commodity Derivatives Analytics for MCX Gold Futures",
    version="0.1.0",
)

# Enable CORS strictly for local frontend origins (never wildcard '*')
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health", response_model=ResponseEnvelope[HealthPayload])
def get_health() -> ResponseEnvelope[HealthPayload]:
    store = get_parquet_store()
    cal = get_calendar()
    contracts_cfg = load_contracts_config()
    df = store.read_all()

    payload = HealthPayload(
        status="HEALTHY",
        version="0.1.0",
        database_records_count=len(df),
        holidays_count=len(cal.holidays),
        contracts_count=len(contracts_cfg.get("contracts", {})),
    )

    data_status = DataStatus.MANUAL_IMPORT if len(df) > 0 else DataStatus.UNAVAILABLE

    return ResponseEnvelope[HealthPayload](
        data_status=data_status,
        as_of=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        source_mode="PARQUET_STORE",
        freshness_seconds=0,
        validation_summary={"database_active": True},
        assumptions=["Local DuckDB over Parquet storage"],
        provenance_ids=["health_check"],
        payload=payload,
    )


@app.get("/contracts", response_model=ResponseEnvelope[ContractsPayload])
def get_contracts() -> ResponseEnvelope[ContractsPayload]:
    cfg = load_contracts_config()
    contracts_dict = {}

    for sym, c in cfg.get("contracts", {}).items():
        contracts_dict[sym] = ContractItem(
            name=c.get("name", sym),
            symbol=c.get("symbol", sym),
            trading_unit_g=float(c.get("trading_unit_g", 1.0)),
            quote_base_g=float(c.get("quote_base_g", 1.0)),
            purity_fineness=float(c.get("purity_fineness", 999.0)),
            quote_location=c.get("quote_location", "Ahmedabad"),
            tax_basis=c.get("tax_basis", "Ex-Ahmedabad"),
            settlement_type=c.get("settlement_type", "COMPULSORY DELIVERY"),
            delivery_locations=c.get("delivery_locations", ["Ahmedabad"]),
            expiry_rule=c.get("expiry_rule", ""),
            tender_rule=c.get("tender_rule", "last_3_trading_days_including_expiry"),
            ddr_rule=c.get("ddr_rule", ""),
            location_basis_differs=bool(c.get("location_basis_differs", False)),
            verified=bool(c.get("verified", False)),
        )

    payload = ContractsPayload(
        version=cfg.get("version", "2025.1"),
        effective_date=cfg.get("effective_date", "2025-01-01"),
        master_status=cfg.get("master_status", "UNVERIFIED"),
        verified=bool(cfg.get("verified", False)),
        notes=cfg.get("notes", "Reference specification, unverified"),
        contracts=contracts_dict,
    )

    return ResponseEnvelope[ContractsPayload](
        data_status=DataStatus.REVIEW_REQUIRED if not payload.verified else DataStatus.LIVE_SOURCE,
        as_of=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        source_mode="CONFIG_CONTRACTS_YAML",
        assumptions=[
            "Compulsory physical delivery for all 4 contracts",
            "Tender window is last 3 trading days including expiry",
            "Purity adjustment 999/purity is linear metal-content comparison",
            "GOLDPETAL quoted basis Mumbai while others basis Ahmedabad",
        ],
        provenance_ids=["backend/config/contracts.yaml"],
        payload=payload,
    )


@app.get("/prices", response_model=ResponseEnvelope[PricesPayload])
def get_prices(
    symbol: Optional[str] = Query(None, description="Contract symbol (GOLDM, GOLDTEN, GOLDGUINEA, GOLDPETAL)"),
    expiry: Optional[str] = Query(None, description="Expiry date in ISO format YYYY-MM-DD"),
    from_date: Optional[str] = Query(None, description="From trade date YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="To trade date YYYY-MM-DD"),
) -> ResponseEnvelope[PricesPayload]:
    store = get_parquet_store()
    records = store.query(symbol=symbol, expiry=expiry, from_date=from_date, to_date=to_date)

    items: List[PriceRecord] = []
    source_modes = set()

    for r in records:
        source_modes.add(r.get("source_mode", "MANUAL IMPORT"))
        items.append(
            PriceRecord(
                trade_date=r["trade_date"],
                symbol=r["symbol"],
                expiry_date=r["expiry_date"],
                raw_expiry=r.get("raw_expiry", ""),
                instrument_name=r.get("instrument_name", "FUTCOM"),
                open=r.get("open"),
                high=r.get("high"),
                low=r.get("low"),
                close=r.get("close"),
                prev_close=r.get("prev_close"),
                volume_lots=int(r.get("volume_lots", 0)),
                volume_grams=float(r.get("volume_grams", 0.0)),
                value_lacs=float(r.get("value_lacs", 0.0)),
                open_interest_lots=int(r.get("open_interest_lots", 0)),
                trading_unit_g=float(r.get("trading_unit_g", 1.0)),
                trading_status=r.get("trading_status", "TRADE"),
                source_file=r.get("source_file", ""),
                source_sha256=r.get("source_sha256", ""),
                normalized_close_10g_999=r.get("normalized_close_10g_999"),
                normalization_tag=r.get("normalization_tag", "DERIVED"),
                normalization_basis=r.get("normalization_basis"),
                normalization_disclaimer=r.get("normalization_disclaimer"),
                value_class=r.get("value_class", "OBSERVED"),
            )
        )

    # Determine status
    if not items:
        data_status = DataStatus.UNAVAILABLE
    elif any("FIXTURE" in m for m in source_modes):
        data_status = DataStatus.FIXTURE_DEMO
    else:
        data_status = DataStatus.MANUAL_IMPORT

    payload = PricesPayload(total_records=len(items), records=items)

    return ResponseEnvelope[PricesPayload](
        data_status=data_status,
        as_of=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        source_mode=",".join(source_modes) if source_modes else "PARQUET_STORE",
        assumptions=[
            "Official Bhavcopy Close is not an executable fill price",
            "Normalized price represents pure metal content comparison (Rs per 10g 999), not executable parity",
            "Zero volume rows flagged NO_TRADE and excluded from liquidity proxy",
        ],
        provenance_ids=list(set(r["source_sha256"] for r in records if "source_sha256" in r))[:10],
        payload=payload,
    )


@app.get("/data-quality", response_model=ResponseEnvelope[DataQualityPayload])
def get_data_quality() -> ResponseEnvelope[DataQualityPayload]:
    importer = ManualImporter()
    quarantine_raw = importer.load_quarantine_log()

    quarantine_records = [
        QuarantineRecord(
            timestamp=q.get("timestamp", ""),
            filename=q.get("filename", ""),
            requested_date=q.get("requested_date"),
            content_date=q.get("content_date"),
            sha256=q.get("sha256", ""),
            quarantine_reason=q.get("quarantine_reason", "UNKNOWN"),
            warnings=q.get("warnings", []),
        )
        for q in quarantine_raw
    ]

    # Re-scan manual drop directory to get current status table
    scan_res = importer.import_all()
    valid_files_total = scan_res["accepted_count"] + scan_res.get("already_imported_count", 0)

    payload = DataQualityPayload(
        total_files_evaluated=len(scan_res["results"]),
        accepted_files_count=valid_files_total,
        already_imported_files_count=scan_res.get("already_imported_count", 0),
        quarantined_files_count=len(quarantine_records),
        quarantine_log=quarantine_records,
        imported_files=scan_res["results"],
    )

    data_status = DataStatus.VALIDATION_FAILED if len(quarantine_records) > 0 else DataStatus.MANUAL_IMPORT

    return ResponseEnvelope[DataQualityPayload](
        data_status=data_status,
        as_of=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        source_mode="MANUAL_DROP_SCAN",
        validation_summary={
            "accepted_files": valid_files_total,
            "newly_accepted": scan_res["accepted_count"],
            "already_imported": scan_res.get("already_imported_count", 0),
            "quarantined_files": len(quarantine_records),
        },
        assumptions=[
            "Files where requested date in filename != content date are quarantined with REQUESTED_DATE_NOT_RETURNED_DATE",
            "Duplicate content sha256 hashes are deduplicated",
        ],
        provenance_ids=["backend/data/quarantine/quarantine_log.json"],
        payload=payload,
    )


@app.get("/data-quality/coverage", response_model=ResponseEnvelope[CoveragePayload])
def get_coverage_endpoint(
    from_date: Optional[str] = Query("2025-01-01", description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
) -> ResponseEnvelope[CoveragePayload]:
    cov = compute_coverage(from_date_str=from_date, to_date_str=to_date)
    payload = CoveragePayload(**cov)

    data_status = DataStatus.MANUAL_IMPORT if cov["trading_days_with_file_count"] > 0 else DataStatus.UNAVAILABLE

    return ResponseEnvelope[CoveragePayload](
        data_status=data_status,
        as_of=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        source_mode="CALENDAR_COVERAGE_CHECK",
        validation_summary={
            "total_trading_days": cov["total_trading_days_in_range"],
            "trading_days_with_file": cov["trading_days_with_file_count"],
            "missing_trading_days": cov["missing_trading_days_count"],
        },
        assumptions=[
            "Trading day defined as open under ANY_SESSION policy (Morning or Evening session)",
            "Weekends (Saturday, Sunday) and full trading holidays are non-trading days",
        ],
        provenance_ids=["backend/config/mcx_holidays.csv", "backend/data/parquet/gold_futures.parquet"],
        payload=payload,
    )


@app.get("/calendar", response_model=ResponseEnvelope[CalendarPayload])
def get_calendar_endpoint(
    sample_expiry: Optional[str] = Query("2026-06-30", description="Sample expiry date for tender window demonstration"),
) -> ResponseEnvelope[CalendarPayload]:
    cal = get_calendar()

    holiday_items = [
        HolidayItem(
            date=h.date.isoformat(),
            description=h.description,
            morning_open=h.morning_open,
            evening_open=h.evening_open,
            special_note=h.special_note,
            source_file=h.source_file,
            verified=h.verified,
        )
        for h in sorted(cal.holidays.values(), key=lambda x: x.date)
    ]

    sample_checks = {}
    if sample_expiry:
        try:
            exp_dt = datetime.date.fromisoformat(sample_expiry)
            sample_checks = cal.compute_conservative_tender_window(exp_dt)
        except Exception as e:
            sample_checks = {"error": str(e)}

    payload = CalendarPayload(
        calendar_version="2025-2026.1",
        coverage_start=CALENDAR_COVERAGE_START.isoformat(),
        coverage_end=CALENDAR_COVERAGE_END.isoformat(),
        verified=False,
        trading_day_policies=[p.value for p in TradingDayPolicy],
        holidays_count=len(holiday_items),
        holidays=holiday_items,
        sample_tender_checks=sample_checks,
    )

    return ResponseEnvelope[CalendarPayload](
        data_status=DataStatus.REVIEW_REQUIRED,
        as_of=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        source_mode="CONFIG_MCX_HOLIDAYS",
        assumptions=[
            "MCX holiday list unverified pending official confirmation",
            "Conservative tender window selects earliest start date across ANY_SESSION, MORNING_ONLY, BOTH_SESSIONS",
            "Dates outside 2025-2026 coverage window return TENDER_STATUS=UNKNOWN",
        ],
        provenance_ids=["backend/config/mcx_holidays.csv"],
        payload=payload,
    )


@app.get("/normalized", response_model=ResponseEnvelope[NormalizedPayload])
def get_normalized(
    apply_purity_scaling: bool = Query(True, description="Apply purity scaling (999 / purity)"),
    symbol: Optional[str] = Query(None, description="Filter by contract symbol"),
    trade_date: Optional[str] = Query(None, description="Filter by trade date (YYYY-MM-DD)"),
    expiry: Optional[str] = Query(None, description="Filter by expiry date (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=1000, description="Pagination limit"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> ResponseEnvelope[NormalizedPayload]:
    store = get_parquet_store()
    cfg = load_contracts_config()
    specs = cfg.get("contracts", {})

    records = store.query(symbol=symbol, expiry=expiry, from_date=trade_date, to_date=trade_date)
    # Re-normalize if sensitivity mode is requested
    normalized_records = [
        normalize_record(r, specs, apply_purity_scaling=apply_purity_scaling)
        for r in records
    ]

    paginated = normalized_records[offset: offset + limit]
    lcm_basket = compute_four_contract_lcm()

    payload = NormalizedPayload(
        total_records=len(normalized_records),
        purity_scaling_applied=apply_purity_scaling,
        lcm_basket=lcm_basket,
        records=paginated,
    )

    data_status = DataStatus.MANUAL_IMPORT if len(normalized_records) > 0 else DataStatus.UNAVAILABLE

    return ResponseEnvelope[NormalizedPayload](
        data_status=data_status,
        as_of=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        source_mode="PRICE_NORMALIZER",
        validation_summary={
            "total_records": len(normalized_records),
            "purity_scaling": apply_purity_scaling,
        },
        assumptions=[
            "Normalized price is metal-content basis: (price / quote_base_g) * 10 * (999 / purity)",
            "Metal-content basis is NOT an executable parity or spread",
        ],
        provenance_ids=["backend/normalization/price_normalizer.py"],
        payload=payload,
    )


@app.get("/spreads", response_model=ResponseEnvelope[SpreadsPayload])
def get_spreads(
    trade_date: Optional[str] = Query(None, description="Trade date (YYYY-MM-DD). Defaults to latest session."),
    expiry: Optional[str] = Query(None, description="Expiry date filter (YYYY-MM-DD)"),
    symbol_a: Optional[str] = Query(None, description="First leg symbol"),
    symbol_b: Optional[str] = Query(None, description="Second leg symbol"),
    min_samples: int = Query(30, ge=5, le=100, description="Minimum consecutive history for Z-score"),
) -> ResponseEnvelope[SpreadsPayload]:
    store = get_parquet_store()
    cfg = load_contracts_config()
    specs = cfg.get("contracts", {})

    stored_dates = store.get_stored_dates()
    effective_date = trade_date or (stored_dates[-1] if stored_dates else None)

    if not effective_date:
        payload = SpreadsPayload(
            total_pairs=0,
            summary_kpi_pair=None,
            zscore_status={"z_score": None, "status": "UNAVAILABLE", "reason": "No market observations loaded"},
            pairs=[],
        )
        return ResponseEnvelope[SpreadsPayload](
            data_status=DataStatus.UNAVAILABLE,
            as_of=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            source_mode="RELATIVE_VALUE_ENGINE",
            payload=payload,
        )

    records = store.query(from_date=effective_date, to_date=effective_date)
    by_key = {f"{r['symbol']}_{r['raw_expiry']}": r for r in records}

    all_pairs: List[Dict[str, Any]] = []
    # Build pairs across available records
    symbols = ["GOLDTEN", "GOLDGUINEA", "GOLDPETAL", "GOLDM"]
    for i in range(len(records)):
        for j in range(i + 1, len(records)):
            r_a = records[i]
            r_b = records[j]

            if symbol_a and r_a["symbol"] != symbol_a.upper():
                continue
            if symbol_b and r_b["symbol"] != symbol_b.upper():
                continue
            if expiry and (r_a["expiry_date"] != expiry and r_b["expiry_date"] != expiry):
                continue

            pair_res = compute_pair_spread(r_a, r_b, specs)
            all_pairs.append(pair_res)

    # Dedicated KPI summary pair: same-expiry GOLDTEN vs GOLDGUINEA on 30OCT2026
    summary_pair = None
    kpi_rec_ten = by_key.get("GOLDTEN_30OCT2026")
    kpi_rec_guinea = by_key.get("GOLDGUINEA_30OCT2026")
    if kpi_rec_ten and kpi_rec_guinea:
        summary_pair = compute_pair_spread(kpi_rec_ten, kpi_rec_guinea, specs)
    elif all_pairs:
        # fallback to first eligible same-expiry pair
        same_exp = [p for p in all_pairs if p["is_same_expiry"] and p["is_eligible"]]
        summary_pair = same_exp[0] if same_exp else all_pairs[0]

    # Z-Score check for the summary pair across history
    historical_spreads: List[float] = []
    if summary_pair:
        sym_1 = summary_pair["symbol_a"]
        sym_2 = summary_pair["symbol_b"]
        raw_exp_1 = summary_pair["raw_expiry_a"]
        raw_exp_2 = summary_pair["raw_expiry_b"]

        all_history = store.read_all()
        if not all_history.empty:
            dates = sorted(all_history["trade_date"].unique())
            for d in dates:
                sub = all_history[all_history["trade_date"] == d]
                m1 = sub[(sub["symbol"] == sym_1) & (sub["raw_expiry"] == raw_exp_1)]
                m2 = sub[(sub["symbol"] == sym_2) & (sub["raw_expiry"] == raw_exp_2)]
                if not m1.empty and not m2.empty:
                    p1 = m1["normalized_close_10g_999"].iloc[0]
                    p2 = m2["normalized_close_10g_999"].iloc[0]
                    st1 = m1["trading_status"].iloc[0]
                    st2 = m2["trading_status"].iloc[0]
                    if pd.notna(p1) and pd.notna(p2) and st1 != "NO_TRADE" and st2 != "NO_TRADE":
                        historical_spreads.append(round(float(p1 - p2), 2))

    z_res = compute_point_in_time_zscore(historical_spreads, min_samples=min_samples)

    payload = SpreadsPayload(
        total_pairs=len(all_pairs),
        summary_kpi_pair=summary_pair,
        zscore_status=z_res,
        pairs=all_pairs,
    )

    data_status = DataStatus.MANUAL_IMPORT if len(all_pairs) > 0 else DataStatus.UNAVAILABLE

    return ResponseEnvelope[SpreadsPayload](
        data_status=data_status,
        as_of=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        source_mode="RELATIVE_VALUE_ENGINE",
        validation_summary={
            "trade_date": effective_date,
            "total_pairs_evaluated": len(all_pairs),
            "zscore_status": z_res["status"],
        },
        assumptions=[
            "Point-in-time Z-score computed up to t-1; requires >=30 consecutive trading days",
            "Pairs involving GOLDPETAL embed location basis differential (ex-Mumbai vs ex-Ahmedabad)",
            "Observed gap is unverified metal-content difference, NOT an executable signal",
        ],
        provenance_ids=["backend/analytics/relative_value.py"],
        payload=payload,
    )


@app.get("/curve", response_model=ResponseEnvelope[CurvePayload])
def get_curve(
    trade_date: Optional[str] = Query(None, description="Trade date (YYYY-MM-DD). Defaults to latest session."),
    symbol: str = Query("GOLDM", description="Contract symbol (GOLDM, GOLDTEN, GOLDGUINEA, GOLDPETAL)"),
) -> ResponseEnvelope[CurvePayload]:
    store = get_parquet_store()
    stored_dates = store.get_stored_dates()
    effective_date = trade_date or (stored_dates[-1] if stored_dates else None)

    if not effective_date:
        payload = CurvePayload(
            trade_date="",
            symbol=symbol.upper(),
            expiries_count=0,
            points=[],
            rolls=[],
        )
        return ResponseEnvelope[CurvePayload](
            data_status=DataStatus.UNAVAILABLE,
            as_of=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            source_mode="CURVE_ENGINE",
            payload=payload,
        )

    curve_res = compute_symbol_curve(effective_date, symbol.upper())
    payload = CurvePayload(**curve_res)

    data_status = DataStatus.MANUAL_IMPORT if curve_res["expiries_count"] > 0 else DataStatus.UNAVAILABLE

    return ResponseEnvelope[CurvePayload](
        data_status=data_status,
        as_of=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        source_mode="CURVE_ENGINE",
        validation_summary={
            "symbol": symbol.upper(),
            "trade_date": effective_date,
            "listed_expiries_observed": curve_res["expiries_count"],
        },
        assumptions=[
            "Implied carry annualized as ((P_far / P_near) - 1) * (365 / calendar_days)",
            "Term structure reflects discrete listed expiries without curve smoothing",
        ],
        provenance_ids=["backend/analytics/curve.py"],
        payload=payload,
    )


@app.get("/liquidity", response_model=ResponseEnvelope[LiquidityPayload])
def get_liquidity(
    symbol: str = Query("GOLDTEN", description="Contract symbol"),
    expiry_date: str = Query("2026-10-30", description="Contract expiry date (YYYY-MM-DD)"),
) -> ResponseEnvelope[LiquidityPayload]:
    liq_res = compute_contract_liquidity_series(symbol.upper(), expiry_date)
    payload = LiquidityPayload(
        symbol=symbol.upper(),
        expiry_date=expiry_date,
        observations_count=liq_res.get("observations_count", 0),
        disclaimer=liq_res.get("disclaimer", "Corwin-Schultz daily OHLC liquidity proxy"),
        results=liq_res.get("results", []),
    )

    data_status = DataStatus.MANUAL_IMPORT if payload.observations_count > 0 else DataStatus.UNAVAILABLE

    return ResponseEnvelope[LiquidityPayload](
        data_status=data_status,
        as_of=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        source_mode="LIQUIDITY_PROXY_ENGINE",
        validation_summary={
            "symbol": symbol.upper(),
            "expiry_date": expiry_date,
            "observations_evaluated": payload.observations_count,
        },
        assumptions=[
            "Corwin-Schultz (2012) high-low spread estimator is a daily proxy, NOT an executable bid-ask spread",
            "Negative estimates indicate unestimable liquidity and trigger fallback cost hurdles",
            "Zero volume (NO_TRADE) sessions are strictly excluded from estimation",
        ],
        provenance_ids=["backend/analytics/liquidity.py"],
        payload=payload,
    )


@app.get("/diagnostics/offset", response_model=ResponseEnvelope[OffsetDiagnosticPayload])
def get_offset_diagnostic(
    target_expiry: Optional[str] = Query("2026-10-30", description="Target contract expiry date (YYYY-MM-DD)"),
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
) -> ResponseEnvelope[OffsetDiagnosticPayload]:
    diag_res = compute_offset_diagnostics(target_expiry=target_expiry, from_date=from_date, to_date=to_date)
    payload = OffsetDiagnosticPayload(**diag_res)

    data_status = DataStatus.MANUAL_IMPORT if payload.observations_count > 0 else DataStatus.UNAVAILABLE

    return ResponseEnvelope[OffsetDiagnosticPayload](
        data_status=data_status,
        as_of=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        source_mode="OFFSET_DIAGNOSTIC_ENGINE",
        validation_summary={
            "target_expiry": target_expiry,
            "observations_count": payload.observations_count,
        },
        assumptions=[
            "Diagnostic is strictly descriptive: 'observed gap, unverified, not a signal'",
            "Makes no prediction of statistical arbitrage, mean reversion, or convergence",
            "Days to tender start derived from conservative earliest tender policy",
        ],
        provenance_ids=["backend/analytics/offset_diagnostic.py"],
        payload=payload,
    )
