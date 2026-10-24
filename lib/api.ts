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

export async function fetchCalendar(): Promise<ResponseEnvelope<CalendarPayload>> {
  const res = await fetch(`${API_BASE_URL}/calendar`, { cache: "no-store" });
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
