# GoldRaft ⚡

> **Hack in Hills '26 — Track 03: Commodity Derivatives Intelligence**  
> Expiry-aware analytics, relative-value gap measurement, and walk-forward cost hurdle backtesting for MCX gold futures.

---

## 1. Product Overview

MCX lists gold in four distinct futures contracts with differing contract sizes, quotation bases, delivery centers, and purities:
* **GOLDM** (100 g trading unit, quoted per 10 g, 995 purity, Ahmedabad)
* **GOLDTEN** (10 g trading unit, quoted per 10 g, 999 purity, Ahmedabad)
* **GOLDGUINEA** (8 g trading unit, quoted per 8 g, 999 purity, Ahmedabad)
* **GOLDPETAL** (1 g trading unit, quoted per 1 g, 999 purity, Mumbai)

Because their raw quotations are not directly comparable, **GoldRaft**:
1. **Ingests & Validates** MCX Bhavcopy data with holiday trap detection and quarantine isolation.
2. **Normalizes** all contracts to a single metal-content basis (₹ per 10 g at 999 purity) without overwriting observed market quotes.
3. **Measures Relative Value** with point-in-time rolling z-scores, isolating calendar carry roll-down and highlighting location basis divergences (Ahmedabad vs. Mumbai).
4. **Applies Realistic Trading Friction** including statutory exchange/SEBI/CTT/stamp fees, broker charges, and a Corwin-Schultz (2012) bid-ask liquidity proxy.
5. **Simulates Walk-Forward Out-of-Sample Performance** with strict execution rules (t+1 Open fill), compulsory physical delivery tender window blackouts, and 3-way independent P&L attribution (Gold Delta, Carry, Alpha minus Costs).
6. **Enforces Quiet Mode Alerts**: Emits signals only when expected convergence exceeds the full cost hurdle.

### Core Philosophy
* **Analytical rigor over signal frequency.** *"No persistent edge survives costs"* is an entirely valid, honest, and expected outcome. The system will never tune parameters to manufacture an artificial edge.
* **Never fabricate data.** If data is missing or incomplete, the system raises an explicit `INSUFFICIENT DATA` state.
* **No silent fallbacks.** Any fixture-derived or demo data is boldly tagged as `FIXTURE/DEMO` in both API and UI.

---

## 2. Contract Specifications (Reference Specification, Unverified)

> *Note: All contract rules, settlement types, and delivery schedules below are reference specifications flagged `verified: false` pending final verification against MCX circulars.*

| Contract | Trading Unit | Quotation Base | Purity | Quote Location | Settlement Type | Expiry Rule | Tender Window |
|---|---|---|---|---|---|---|---|
| **GOLDM** | 100 g | 10 g | 995 | Ahmedabad | Compulsory Delivery | 5th of month (preceding working day) | Last 3 trading days incl. expiry |
| **GOLDTEN** | 10 g | 10 g | 999 | Ahmedabad | Compulsory Delivery | Last calendar day (holiday adjusted) | Last 3 trading days incl. expiry |
| **GOLDGUINEA** | 8 g | 8 g | 999 | Ahmedabad | Compulsory Delivery | Last calendar day (holiday adjusted) | Last 3 trading days incl. expiry |
| **GOLDPETAL** | 1 g | 1 g | 999 | Mumbai* | Compulsory Delivery | Last calendar day (holiday adjusted) | Last 3 trading days incl. expiry |

*\*Note: GOLDPETAL is basis Mumbai; all pairs involving GOLDPETAL are explicitly flagged with `location basis differs` (unverified basis differential).*

---

## 3. Technology Stack

* **Frontend**: Next.js 16.4.2 (App Router, Turbopack), React 19.3.0, TypeScript 5, Tailwind CSS v4, Base UI / shadcn, TanStack Table v9, Recharts 3.8.0, `@dnd-kit`, Sonner.
* **Backend**: Python 3.13, FastAPI, Uvicorn, Pandas, DuckDB, PyArrow, Pydantic, PyYAML, Pytest.
* **Theme**: Neo-brutalist styling with light/dark/system support and OKLCH color palettes.

---

## 4. Setup & Running the Application

### Frontend (Next.js)
```bash
# Install dependencies
npm install

# Run development server (Turbopack)
npm run dev

# Lint and Typecheck
npm run lint
npx tsc --noEmit
```
Open [http://localhost:3000](http://localhost:3000) (automatically redirects to `/dashboard`).

### Backend (FastAPI)
```bash
# Navigate to backend and create virtual environment
cd backend
python -m venv venv

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Install pinned dependencies
pip install -r requirements.txt

# Run automated tests
pytest -q

# Start FastAPI development server
uvicorn backend.api.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 5. Execution & Attribution Conventions

1. **Execution Fill**: Signals identified at Close $t$ are filled at Open $t+1$ (or optionally Settlement $t+1$ in sensitivity mode). Settlement prices are never treated as executable order-book fills.
2. **Tender Window Hard Gate**: Positions are closed prior to the 3-day tender window. Entries are allowed only if the remaining pre-tender trading days exceed the strategy's expected convergence horizon.
3. **Independent P&L Attribution**: Gold Delta, Carry, and Alpha are computed independently and reconciled against realized mark-to-market trade returns minus all statutory and liquidity costs.
