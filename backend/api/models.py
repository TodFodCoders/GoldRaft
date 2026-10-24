"""Pydantic models and response envelopes for GoldRaft API."""

from __future__ import annotations

import datetime
from enum import Enum
from typing import Any, Dict, Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field


class DataStatus(str, Enum):
    LIVE_SOURCE = "LIVE SOURCE"
    CACHED = "CACHED"
    MANUAL_IMPORT = "MANUAL IMPORT"
    FIXTURE_DEMO = "FIXTURE/DEMO"
    UNAVAILABLE = "UNAVAILABLE"
    VALIDATION_FAILED = "VALIDATION FAILED"
    REVIEW_REQUIRED = "REVIEW REQUIRED"


class ValueClass(str, Enum):
    OBSERVED = "OBSERVED"
    DERIVED = "DERIVED"
    ASSUMPTION = "ASSUMPTION"
    SIMULATED = "SIMULATED"


T = TypeVar("T")


class ResponseEnvelope(BaseModel, Generic[T]):
    data_status: DataStatus
    as_of: str
    source_mode: str
    freshness_seconds: Optional[int] = None
    validation_summary: Dict[str, Any] = Field(default_factory=dict)
    assumptions: List[str] = Field(default_factory=list)
    provenance_ids: List[str] = Field(default_factory=list)
    payload: T


class HealthPayload(BaseModel):
    status: str
    version: str
    database_records_count: int
    holidays_count: int
    contracts_count: int


class ContractItem(BaseModel):
    name: str
    symbol: str
    trading_unit_g: float
    quote_base_g: float
    purity_fineness: float
    quote_location: str
    tax_basis: str
    settlement_type: str
    delivery_locations: List[str]
    expiry_rule: str
    tender_rule: str
    ddr_rule: str
    location_basis_differs: bool
    verified: bool


class ContractsPayload(BaseModel):
    version: str
    effective_date: str
    master_status: str
    verified: bool
    notes: str
    contracts: Dict[str, ContractItem]


class PriceRecord(BaseModel):
    trade_date: str
    symbol: str
    expiry_date: str
    raw_expiry: str
    instrument_name: str
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    prev_close: Optional[float] = None
    volume_lots: int
    volume_grams: float
    value_lacs: float
    open_interest_lots: int
    trading_unit_g: float
    trading_status: str
    source_file: str
    source_sha256: str
    normalized_close_10g_999: Optional[float] = None
    normalization_tag: str
    normalization_basis: Optional[str] = None
    normalization_disclaimer: Optional[str] = None
    value_class: str


class PricesPayload(BaseModel):
    total_records: int
    records: List[PriceRecord]


class QuarantineRecord(BaseModel):
    timestamp: str
    filename: str
    requested_date: Optional[str]
    content_date: Optional[str]
    sha256: str
    quarantine_reason: str
    warnings: List[str] = Field(default_factory=list)


class DataQualityPayload(BaseModel):
    total_files_evaluated: int
    accepted_files_count: int
    already_imported_files_count: int = 0
    quarantined_files_count: int
    quarantine_log: List[QuarantineRecord]
    imported_files: List[Dict[str, Any]]


class HolidayItem(BaseModel):
    date: str
    description: str
    morning_open: bool
    evening_open: bool
    special_note: Optional[str] = None
    source_file: str
    verified: bool


class CalendarPayload(BaseModel):
    calendar_version: str
    coverage_start: str
    coverage_end: str
    verified: bool
    trading_day_policies: List[str]
    holidays_count: int
    holidays: List[HolidayItem]
    sample_tender_checks: Optional[Dict[str, Any]] = None


class CoveragePayload(BaseModel):
    range_from: str
    range_to: str
    total_trading_days_in_range: int
    trading_days_with_file_count: int
    missing_trading_days_count: int
    mismatched_date_trap_files_count: int
    duplicate_hash_files_count: int
    trading_days_with_file: List[str]
    missing_trading_days: List[str]
    mismatched_trap_files: List[Dict[str, Any]] = Field(default_factory=list)
    duplicate_hash_files: List[Dict[str, Any]] = Field(default_factory=list)
    first_accepted_date: Optional[str] = None
    last_accepted_date: Optional[str] = None
