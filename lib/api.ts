/**
 * GoldRaft Typed API Client & Contract Interfaces
 */

export interface ResponseEnvelope<T> {
  data_status:
    | "LIVE SOURCE"
    | "CACHED"
    | "MANUAL IMPORT"
    | "FIXTURE/DEMO"
    | "UNAVAILABLE"
    | "VALIDATION FAILED"
    | "REVIEW REQUIRED";
  as_of: string;
  source_mode: string;
  freshness_seconds?: number;
  validation_summary: Record<string, unknown>;
  assumptions: string[];
  provenance_ids: string[];
  payload: T;
}

export interface PriceRecord {
  trade_date: string;
  symbol: string;
  expiry_date: string;
  raw_expiry: string;
  instrument_name: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  prev_close: number | null;
  volume_lots: number;
  volume_grams: number;
  value_lacs: number;
  open_interest_lots: number;
  trading_unit_g: number;
  trading_status: string;
  source_file: string;
  source_sha256: string;
  normalized_close_10g_999: number | null;
  normalization_tag: string;
  normalization_basis?: string;
  normalization_disclaimer?: string;
  value_class: string;
}

export interface PricesPayload {
  total_records: number;
  records: PriceRecord[];
}

export interface ContractItem {
  name: string;
  symbol: string;
  trading_unit_g: number;
  quote_base_g: number;
  purity_fineness: number;
  quote_location: string;
  tax_basis: string;
  settlement_type: string;
  delivery_locations: string[];
  expiry_rule: string;
  tender_rule: string;
  ddr_rule: string;
  location_basis_differs: boolean;
  verified: boolean;
}

export interface ContractsPayload {
  version: string;
  effective_date: string;
  master_status: string;
  verified: boolean;
  notes: string;
  contracts: Record<string, ContractItem>;
}

export interface QuarantineRecord {
  timestamp: string;
  filename: string;
  requested_date: string | null;
  content_date: string | null;
  sha256: string;
  quarantine_reason: string;
  warnings: string[];
}

export interface DataQualityPayload {
  total_files_evaluated: number;
  accepted_files_count: number;
  already_imported_files_count?: number;
  quarantined_files_count: number;
  quarantine_log: QuarantineRecord[];
  imported_files: Array<{
    filename: string;
    requested_date: string | null;
    content_date: string | null;
    sha256_prefix: string;
    status: string;
    reason: string;
    rows_accepted: number;
    warnings_count: number;
  }>;
}

export interface HolidayItem {
  date: string;
  description: string;
  morning_open: boolean;
  evening_open: boolean;
  special_note?: string;
  source_file: string;
  verified: boolean;
}

export interface CalendarPayload {
  calendar_version: string;
  coverage_start: string;
  coverage_end: string;
  verified: boolean;
  trading_day_policies: string[];
  holidays_count: number;
  holidays: HolidayItem[];
  sample_tender_checks?: Record<string, unknown>;
}

export interface CoveragePayload {
  range_from: string;
  range_to: string;
  total_trading_days_in_range: number;
  trading_days_with_file_count: number;
  missing_trading_days_count: number;
  mismatched_date_trap_files_count: number;
  duplicate_hash_files_count: number;
  trading_days_with_file: string[];
  missing_trading_days: string[];
  mismatched_trap_files: Array<Record<string, unknown>>;
  duplicate_hash_files: Array<Record<string, unknown>>;
  first_accepted_date: string | null;
  last_accepted_date: string | null;
}

export interface PairSpreadResult {
  symbol_a: string;
  symbol_b: string;
  trade_date: string;
  expiry_a: string;
  expiry_b: string;
  raw_expiry_a: string;
  raw_expiry_b: string;
  pair_type: "SAME_EXPIRY" | "CROSS_EXPIRY";
  is_same_expiry: boolean;
  is_eligible: boolean;
  eligibility_status: string;
  ineligibility_reasons: string[];
  normalized_price_a: number | null;
  normalized_price_b: number | null;
  spread_value_rs: number | null;
  spread_percentage: number | null;
  location_basis_differs: boolean;
  location_basis_flag: string | null;
  uncertainty_buffer_rs: number;
  lot_matching: {
    symbol_a: string;
    symbol_b: string;
    unit_a_g: number;
    unit_b_g: number;
    target_grams: number;
    lots_a: number;
    lots_b: number;
    grams_a: number;
    grams_b: number;
    residual_grams: number;
    is_exact_match: boolean;
    lcm_grams: number;
  };
  label: string;
  value_class: string;
}

export interface SpreadsPayload {
  total_pairs: number;
  summary_kpi_pair: PairSpreadResult | null;
  zscore_status: {
    z_score: number | null;
    status: string;
    reason?: string;
    prior_mean?: number;
    prior_std?: number;
    samples_count?: number;
    min_samples_required?: number;
  };
  pairs: PairSpreadResult[];
}

export interface CurveRoll {
  near_expiry: string;
  raw_near_expiry?: string;
  far_expiry: string;
  raw_far_expiry?: string;
  calendar_days: number;
  price_near: number | null;
  price_far: number | null;
  spread_rs: number | null;
  annualized_carry_pct: number | null;
  formula: string;
  value_class: string;
}

export interface CurvePayload {
  trade_date: string;
  symbol: string;
  expiries_count: number;
  points: PriceRecord[];
  rolls: CurveRoll[];
}

export interface LiquidityRecord {
  trade_date: string;
  prev_trade_date: string;
  is_adjacent: boolean;
  cs_status: string;
  spread_estimate: number | null;
  spread_pct: number | null;
  reason?: string;
  volume_grams: number;
  value_lacs: number;
  open_interest_grams: number;
  trading_status: string;
}

export interface LiquidityPayload {
  symbol: string;
  expiry_date: string;
  observations_count: number;
  disclaimer: string;
  results: LiquidityRecord[];
}

export interface OffsetObservation {
  trade_date: string;
  expiry_date: string;
  raw_expiry: string;
  days_to_expiry: number;
  days_to_tender_start: number | null;
  tender_start_date: string | null;
  tender_status: string;
  goldten_close: number | null;
  goldten_norm_close: number | null;
  goldten_volume_grams: number;
  goldten_value_lacs: number;
  goldten_no_trade: boolean;
  guinea_close: number | null;
  guinea_norm_close: number | null;
  guinea_volume_grams: number;
  guinea_value_lacs: number;
  guinea_no_trade: boolean;
  petal_close: number | null;
  petal_norm_close: number | null;
  petal_volume_grams: number;
  petal_value_lacs: number;
  petal_no_trade: boolean;
  ten_minus_guinea_rs: number | null;
  ten_minus_guinea_pct: number | null;
  ten_minus_petal_rs: number | null;
  ten_minus_petal_pct: number | null;
  guinea_minus_petal_rs: number | null;
  guinea_minus_petal_pct: number | null;
}

export interface OffsetDiagnosticPayload {
  target_expiry: string | null;
  observations_count: number;
  disclaimer: string;
  sample_size_note: string;
  observations: OffsetObservation[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function fetchPrices(params?: {
  symbol?: string;
  expiry?: string;
  from_date?: string;
  to_date?: string;
}): Promise<ResponseEnvelope<PricesPayload>> {
  const query = new URLSearchParams();
  if (params?.symbol) query.set("symbol", params.symbol);
  if (params?.expiry) query.set("expiry", params.expiry);
  if (params?.from_date) query.set("from_date", params.from_date);
  if (params?.to_date) query.set("to_date", params.to_date);

  const url = `${API_BASE_URL}/prices${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchContracts(): Promise<ResponseEnvelope<ContractsPayload>> {
  const res = await fetch(`${API_BASE_URL}/contracts`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchCalendar(sampleExpiry?: string): Promise<ResponseEnvelope<CalendarPayload>> {
  const url = sampleExpiry
    ? `${API_BASE_URL}/calendar?sample_expiry=${sampleExpiry}`
    : `${API_BASE_URL}/calendar`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchDataQuality(): Promise<ResponseEnvelope<DataQualityPayload>> {
  const res = await fetch(`${API_BASE_URL}/data-quality`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchCoverage(
  fromDate: string = "2025-01-01",
  toDate?: string
): Promise<ResponseEnvelope<CoveragePayload>> {
  const query = new URLSearchParams();
  query.set("from_date", fromDate);
  if (toDate) query.set("to_date", toDate);

  const res = await fetch(`${API_BASE_URL}/data-quality/coverage?${query.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchSpreads(
  tradeDate?: string,
  expiry?: string
): Promise<ResponseEnvelope<SpreadsPayload>> {
  const query = new URLSearchParams();
  if (tradeDate) query.set("trade_date", tradeDate);
  if (expiry) query.set("expiry", expiry);

  const res = await fetch(`${API_BASE_URL}/spreads?${query.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchCurve(
  tradeDate?: string,
  symbol: string = "GOLDM"
): Promise<ResponseEnvelope<CurvePayload>> {
  const query = new URLSearchParams();
  if (tradeDate) query.set("trade_date", tradeDate);
  query.set("symbol", symbol);

  const res = await fetch(`${API_BASE_URL}/curve?${query.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchLiquidity(
  symbol: string = "GOLDTEN",
  expiryDate: string = "2026-10-30"
): Promise<ResponseEnvelope<LiquidityPayload>> {
  const query = new URLSearchParams();
  query.set("symbol", symbol);
  query.set("expiry_date", expiryDate);

  const res = await fetch(`${API_BASE_URL}/liquidity?${query.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchOffsetDiagnostic(
  targetExpiry: string = "2026-10-30"
): Promise<ResponseEnvelope<OffsetDiagnosticPayload>> {
  const query = new URLSearchParams();
  query.set("target_expiry", targetExpiry);

  const res = await fetch(`${API_BASE_URL}/diagnostics/offset?${query.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}
