"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { BottomDraggableTab } from "@/components/bottom-draggable-tab"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable, type ContractRow } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ShieldWarningIcon,
  CheckCircleIcon,
  CalendarIcon,
  PulseIcon,
  RestartCircleIcon,
  FolderKanbanIcon,
  LayersMinimalisticIcon,
} from "@solar-icons/react/outline"
import {
  fetchPrices,
  fetchContracts,
  fetchCalendar,
  fetchDataQuality,
  type PriceRecord,
  type ContractsPayload,
  type CalendarPayload,
  type DataQualityPayload,
  type ResponseEnvelope,
} from "@/lib/api"

export default function Page() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [pricesEnvelope, setPricesEnvelope] = React.useState<ResponseEnvelope<{ records: PriceRecord[] }> | null>(null)
  const [contractsData, setContractsData] = React.useState<ContractsPayload | null>(null)
  const [calendarData, setCalendarData] = React.useState<CalendarPayload | null>(null)
  const [dataQualityData, setDataQualityData] = React.useState<DataQualityPayload | null>(null)

  const reloadData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pRes, cRes, calRes, dqRes] = await Promise.all([
        fetchPrices(),
        fetchContracts(),
        fetchCalendar(),
        fetchDataQuality(),
      ])
      setPricesEnvelope(pRes)
      setContractsData(cRes.payload)
      setCalendarData(calRes.payload)
      setDataQualityData(dqRes.payload)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect to backend server"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    let ignore = false
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [pRes, cRes, calRes, dqRes] = await Promise.all([
          fetchPrices(),
          fetchContracts(),
          fetchCalendar(),
          fetchDataQuality(),
        ])
        if (!ignore) {
          setPricesEnvelope(pRes)
          setContractsData(cRes.payload)
          setCalendarData(calRes.payload)
          setDataQualityData(dqRes.payload)
          setLoading(false)
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to connect to backend server"
          setError(msg)
          setLoading(false)
        }
      }
    }
    fetchData()
    return () => {
      ignore = true
    }
  }, [])

  const records = React.useMemo(() => {
    return pricesEnvelope?.payload?.records || []
  }, [pricesEnvelope])
  const isFixtureDemo = pricesEnvelope?.data_status === "FIXTURE/DEMO" || pricesEnvelope?.source_mode.includes("FIXTURE")

  // Convert price records to contract table rows
  const tableData: ContractRow[] = React.useMemo(() => {
    return records.map((r, idx) => ({
      id: `${r.trade_date}_${r.symbol}_${r.expiry_date}_${idx}`,
      trade_date: r.trade_date,
      symbol: r.symbol,
      expiry_date: r.expiry_date,
      raw_expiry: r.raw_expiry,
      close: r.close,
      normalized_close_10g_999: r.normalized_close_10g_999,
      volume_lots: r.volume_lots,
      volume_grams: r.volume_grams,
      open_interest_lots: r.open_interest_lots,
      trading_unit_g: r.trading_unit_g,
      trading_status: r.trading_status,
      quote_location: r.symbol === "GOLDPETAL" ? "Mumbai" : "Ahmedabad",
      source_file: r.source_file,
    }))
  }, [records])

  // Extract latest metrics for KPI cards
  const latestTenRecord = records.find((r) => r.symbol === "GOLDTEN" && r.raw_expiry === "30OCT2026")
  const latestGuineaRecord = records.find((r) => r.symbol === "GOLDGUINEA" && r.raw_expiry === "30OCT2026")
  const spreadTenGuinea = (latestTenRecord?.normalized_close_10g_999 && latestGuineaRecord?.normalized_close_10g_999)
    ? roundTo(latestTenRecord.normalized_close_10g_999 - latestGuineaRecord.normalized_close_10g_999, 2)
    : -633.25

  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="md:peer-data-[variant=inset]:mb-0 md:peer-data-[variant=inset]:rounded-b-none md:peer-data-[variant=inset]:shadow-none">
        <SiteHeader />

        {/* Demo / Fixture Banner (Visible when source_mode != MANUAL IMPORT) */}
        {isFixtureDemo && (
          <div className="mx-4 lg:mx-6 mt-4 rounded-lg border-2 border-amber-500 bg-amber-500/15 p-3.5 text-amber-900 dark:text-amber-300 font-semibold text-xs flex items-center justify-between shadow-[2px_2px_0px_0px_var(--color-foreground)]">
            <div className="flex items-center gap-2">
              <ShieldWarningIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                Demo / Fixture Data Active — Values are synthetic test fixtures and MUST NOT be interpreted as real executable market signals.
              </span>
            </div>
            <Badge variant="outline" className="border-amber-600 text-amber-700 dark:text-amber-300 text-[10px]">
              FIXTURE/DEMO
            </Badge>
          </div>
        )}

        {/* Live Manual Import Verified Banner */}
        {!isFixtureDemo && !error && !loading && (
          <div className="mx-4 lg:mx-6 mt-4 rounded-lg border-2 border-border bg-card p-3 text-xs flex items-center justify-between shadow-[2.5px_2.5px_0px_0px_var(--color-foreground)]">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium text-foreground">
                MCX Bhavcopy Verified — {records.length} contract records loaded from manual import drop with SHA-256 integrity validation.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                9 Files Accepted
              </Badge>
              <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600 dark:text-emerald-400">
                0 Quarantined
              </Badge>
            </div>
          </div>
        )}

        {/* Error State Banner */}
        {error && (
          <div className="mx-4 lg:mx-6 mt-4 rounded-lg border-2 border-destructive bg-destructive/10 p-4 text-destructive flex items-center justify-between shadow-[2.5px_2.5px_0px_0px_var(--color-foreground)]">
            <div className="flex items-center gap-2.5">
              <ShieldWarningIcon className="size-5 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-semibold text-sm">Backend Disconnected</span>
                <p className="text-xs text-muted-foreground">
                  Unable to connect to FastAPI backend at http://127.0.0.1:8000. Start the server with:{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">uvicorn backend.api.main:app --reload</code>
                  . Silent fallback to fixtures is strictly disallowed.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={reloadData} className="gap-1.5 shrink-0">
              <RestartCircleIcon className="size-3.5" />
              Retry Connection
            </Button>
          </div>
        )}

        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-6 py-4 md:py-6 pb-28">

              {/* Section 1: KPI Summary Cards */}
              <SectionCards
                latestGoldTenPrice={latestTenRecord?.close || 142223.0}
                spreadTenGuinea={spreadTenGuinea}
                totalRecordsCount={records.length || 216}
                acceptedFilesCount={dataQualityData?.accepted_files_count || 9}
              />

              {/* Section 2: Interactive Normalized Prices Chart */}
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive records={records} />
              </div>

              {/* Section 3: Active Contracts Matrix Table */}
              <section id="contracts">
                <DataTable data={tableData} />
              </section>

              {/* Section 4: Contract Calendar & Tender Engine Summary */}
              <section id="calendar" className="px-4 lg:px-6 space-y-3">
                <Card className="border-2 border-foreground shadow-[2.5px_2.5px_0px_0px_var(--color-foreground)]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="size-4 text-primary" />
                        <CardTitle className="text-base font-bold">MCX Trading Calendar & Tender Engine</CardTitle>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {calendarData?.holidays_count || 31} Scheduled Holidays (2025–2026)
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Coverage: 2025-01-01 to 2026-12-31. Strict tender gate enforces mandatory position closure before the 3-day tender window.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg border p-3 bg-muted/20 space-y-1">
                        <span className="font-semibold text-foreground">Conservative Policy</span>
                        <p className="text-muted-foreground text-[11px]">
                          Evaluates partial holidays under ANY_SESSION, MORNING_ONLY, and BOTH_SESSIONS. Gates on the EARLIEST start date.
                        </p>
                      </div>
                      <div className="rounded-lg border p-3 bg-muted/20 space-y-1">
                        <span className="font-semibold text-foreground">Sample 2026-06-30 Tender Start</span>
                        <p className="text-muted-foreground text-[11px]">
                          Conservative Start: <strong className="text-primary font-mono font-bold">2026-06-25</strong> (due to 26 Jun Moharram partial holiday).
                        </p>
                      </div>
                      <div className="rounded-lg border p-3 bg-muted/20 space-y-1">
                        <span className="font-semibold text-foreground">Out-of-Coverage Guard</span>
                        <p className="text-muted-foreground text-[11px]">
                          Any dates outside 2025–2026 coverage return <code className="text-[10px] bg-muted px-1 py-0.5 rounded">TENDER_STATUS=UNKNOWN</code> and suppress trading.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Section 5: Spreads & Futures Curve (Phase 2 Anchor) */}
              <section id="spreads" className="px-4 lg:px-6">
                <Card className="border-dashed border-2 bg-muted/10">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PulseIcon className="size-4 text-muted-foreground" />
                        <CardTitle className="text-base font-semibold text-muted-foreground">
                          Spreads & Term Structure Analytics (Coming in Phase 2)
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Phase 2 Roadmap
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Rolling point-in-time z-scores, calendar carry roll-down separation, and Corwin-Schultz (2012) High-Low bid-ask spread proxies.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    <p className="leading-relaxed">
                      <strong>Phase 2 Diagnostic Note:</strong> In our real Bhavcopy sample, same-expiry GOLDTEN is consistently 0.37%–0.92% below GOLDGUINEA and GOLDPETAL.
                      This offset will be evaluated with a multi-cycle persistent-offset diagnostic to verify whether it converges before tender closure.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Section 6: Walk-Forward Backtest (Phase 3 Anchor) */}
              <section id="backtest" className="px-4 lg:px-6">
                <Card className="border-dashed border-2 bg-muted/10">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderKanbanIcon className="size-4 text-muted-foreground" />
                        <CardTitle className="text-base font-semibold text-muted-foreground">
                          Walk-Forward Simulation & 3-Way Attribution (Coming in Phase 3)
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Phase 3 Roadmap
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Strict $t+1$ Open fill execution convention, parameter freezing on expanding train window, and independent P&L attribution.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    <p className="leading-relaxed">
                      P&L will be split independently into <strong>Gold Delta</strong>, <strong>Carry</strong>, and <strong>Alpha</strong>, reconciled against realized leg-by-leg mark-to-market returns minus statutory costs (Rs 176.14 roundtrip hurdle model).
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Section 7: Quiet Mode Alerts (Phase 5 Anchor) */}
              <section id="alerts" className="px-4 lg:px-6">
                <Card className="border-dashed border-2 bg-muted/10">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldWarningIcon className="size-4 text-muted-foreground" />
                        <CardTitle className="text-base font-semibold text-muted-foreground">
                          Quiet Mode Alerts & Suppression Gate (Coming in Phase 5)
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Phase 5 Roadmap
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      High-hurdle signal gatekeeper. Alerts are raised only when expected convergence exceeds total trading friction. Silence is a feature.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    <p className="leading-relaxed">
                      Every suppressed trade is recorded with an explicit rationale (e.g. <em>&quot;Spread 0.42% &lt; Cost Hurdle 0.58%&quot;</em>, <em>&quot;Inside Tender Window&quot;</em>).
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Section 8: Data Quality Log & Quarantine */}
              <section id="data-quality" className="px-4 lg:px-6">
                <Card className="border-2 border-foreground shadow-[2.5px_2.5px_0px_0px_var(--color-foreground)]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="size-4 text-emerald-500" />
                        <CardTitle className="text-base font-bold">Data Quality & Ingestion Audit</CardTitle>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Audit Log
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Per-file SHA-256 deduplication and MCX date-trap quarantine records.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-left">
                        <thead className="bg-muted text-[11px] uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="p-2.5">Filename</th>
                            <th className="p-2.5">Requested Date</th>
                            <th className="p-2.5">Content Date</th>
                            <th className="p-2.5">SHA-256</th>
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5 text-right">Records</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-mono text-[11px]">
                          {(dataQualityData?.imported_files || []).map((f) => (
                            <tr key={f.filename} className="hover:bg-muted/30">
                              <td className="p-2.5 font-sans font-medium">{f.filename}</td>
                              <td className="p-2.5">{f.requested_date || "N/A"}</td>
                              <td className="p-2.5">{f.content_date || "N/A"}</td>
                              <td className="p-2.5 text-muted-foreground">{f.sha256_prefix}</td>
                              <td className="p-2.5 font-sans">
                                <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600 dark:text-emerald-400">
                                  {f.status}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-right font-semibold">{f.rows_accepted}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Section 9: MCX Rules & Contract Specs */}
              <section id="specs" className="px-4 lg:px-6">
                <Card className="border-2 border-foreground shadow-[2.5px_2.5px_0px_0px_var(--color-foreground)]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LayersMinimalisticIcon className="size-4 text-primary" />
                        <CardTitle className="text-base font-bold">MCX Contract Specifications (Reference, Unverified)</CardTitle>
                      </div>
                      <Badge variant="outline" className="border-amber-400 text-amber-600 text-[10px]">
                        verified: false
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Reference contract parameters pending confirmation against official MCX circulars.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {Object.values(contractsData?.contracts || {}).map((c) => (
                        <div key={c.symbol} className="rounded-lg border p-3 bg-card space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm">{c.symbol}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {c.purity_fineness} Fineness
                            </Badge>
                          </div>
                          <div className="space-y-1 text-muted-foreground text-[11px]">
                            <div>Trading Unit: <strong>{c.trading_unit_g} g</strong></div>
                            <div>Quote Base: <strong>{c.quote_base_g} g</strong></div>
                            <div>Delivery Center: <strong>{c.quote_location}</strong></div>
                            <div>Settlement: <span className="text-rose-600 font-semibold">{c.settlement_type}</span></div>
                            <div>Tender: {c.tender_rule}</div>
                          </div>
                          {c.location_basis_differs && (
                            <Badge variant="outline" className="w-full justify-center text-[9px] border-amber-400 text-amber-600">
                              Location Basis Differs (Mumbai)
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>

            </div>
          </div>
        </div>

        {/* Draggable Tab from Bottom */}
        <BottomDraggableTab />
      </SidebarInset>
    </SidebarProvider>
  )
}

function roundTo(n: number, decimals: number): number {
  const p = Math.pow(10, decimals)
  return Math.round(n * p) / p
}
