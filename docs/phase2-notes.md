# Phase 2 Engineering & Quantitative Notes: Relative-Value Analytics & Curve Engine

This document provides a plain-language, mathematically rigorous reference for the analytics models, endpoints, assumptions, and limitations implemented in Phase 2 of **GoldRaft**.

---

## 1. Price Normalization & Lot Matching

### 1.1 Normalized Metal-Content Price Basis
MCX lists four gold futures contracts with varying quote bases and purities:
* **GOLDM**: 100g contract, quoted per 10g, 995 fineness.
* **GOLDTEN**: 10g contract, quoted per 10g, 999 fineness.
* **GOLDGUINEA**: 8g contract, quoted per 8g, 999 fineness.
* **GOLDPETAL**: 1g contract, quoted per 1g, 999 fineness (ex-Mumbai basis).

To compare prices across contracts, we normalize all quotes to a standard **₹ per 10g at 999 purity basis**:

$$\text{Normalized Price} = \left(\frac{\text{Observed Price}}{\text{Quote Base (g)}}\right) \times 10 \times \left(\frac{999}{\text{Purity Fineness}}\right)$$

* **Sensitivity Toggle**: The engine supports `apply_purity_scaling: false`, which adjusts for quotation weight but omits the $(999 / \text{Purity})$ ratio.
* **Critical Distinction**: Normalized prices reflect a theoretical **metal-content comparison basis**. They are **NOT** executable parity prices. Physical delivery logistics, assay/refining fees, and location transport differentials are not priced into raw exchange closes.

### 1.2 Least Common Multiple (LCM) Gram-Neutral Basket
Because 8g (GOLDGUINEA) does not divide 100g (GOLDM) evenly, creating a pure gram-neutral hedge requires finding the Least Common Multiple across trading units:

$$\text{LCM}(100, 10, 8, 1) = \mathbf{200\text{ grams}}$$

$$\mathbf{200\text{ g}} = 2\text{ GOLDM} = 20\text{ GOLDTEN} = 25\text{ GOLDGUINEA} = 200\text{ GOLDPETAL}$$

* **Pair Matching**: For any arbitrary target grams $G$, the engine reports integer lot counts and the exact **residual grams** unhedged:
  $$\text{Residual Grams} = |\text{Lots}_A \times \text{Unit}_A - \text{Lots}_B \times \text{Unit}_B|$$

---

## 2. Relative-Value Pair Classification & Eligibility

Every pair is keyed uniquely on $(\text{Symbol}_A, \text{Symbol}_B, \text{Expiry}_A, \text{Expiry}_B, \text{Trade Date})$.

### 2.1 Classification
* **SAME-EXPIRY**: $\text{Expiry}_A = \text{Expiry}_B$ (e.g., GOLDTEN vs GOLDGUINEA on `30OCT2026`). Reflects pure intra-commodity basis without calendar carry.
* **CROSS-EXPIRY**: $\text{Expiry}_A \neq \text{Expiry}_B$. Any pair involving GOLDM (which expires on the 5th) or differing contract months embeds calendar carry.

### 2.2 Location Basis Differential
* Any pair involving **GOLDPETAL** carries the mandatory flag:
  `location basis differs (ex-Mumbai vs ex-Ahmedabad)`
* Includes a configurable uncertainty buffer (default ₹50.00 / 10g) reflecting interstate logistics and delivery variance.

### 2.3 Eligibility Gate
A pair is marked `ELIGIBLE` only if:
1. Both contract legs belong to the same accepted trade date.
2. Both contracts exist in `contracts.yaml`.
3. Neither contract is flagged `NO_TRADE` (zero-volume sessions where Close is merely a carried settlement price).

---

## 3. Point-in-Time Statistical Z-Score

To guard against look-ahead bias and spurious overfitting on small samples:

### 3.1 Strict Point-in-Time Calculation
$$Z_t = \frac{\text{Spread}_t - \mu_{t-1}}{\sigma_{t-1}}$$
Where $\mu_{t-1}$ and $\sigma_{t-1}$ are estimated strictly from observations preceding session $t$. Future data points never alter historical or current $Z$-scores.

### 3.2 Minimum Sample Size Rule
* **Threshold**: Requires at least $N = 30$ consecutive trading-day observations.
* **Current Data Behavior**: With only 9 sparse historical sessions loaded, the API strictly returns:
  `z_score = null, status = "UNAVAILABLE", reason = "insufficient history (n=9, need >=30)"`
* Fabricating or estimating a $Z$-score on small samples without sufficient degrees of freedom is explicitly prohibited.

---

## 4. Persistent-Offset Diagnostic

### 4.1 Empirical Market Observation
In the accepted Bhavcopy sample, same-expiry GOLDTEN trades consistently **0.37% to 0.92% below** GOLDGUINEA and GOLDPETAL, while GOLDGUINEA and GOLDPETAL agree within ₹0–55 per 10g:
* **Golden Example (2026-10-22)**:
  * GOLDTEN 30OCT2026: ₹142,223.00
  * GOLDGUINEA 30OCT2026: ₹142,856.25
  * Spread (GOLDTEN - GUINEA): **-₹633.25 (-0.44%)**

### 4.2 Descriptive Status & Disclaimer
* This diagnostic is **strictly descriptive** and tagged: `"observed gap, unverified, not a signal"`.
* It makes no claim of mean-reversion, statistical edge, or guaranteed convergence. Whether the gap closes prior to tender window entry will be verified across future expiry cycles.

---

## 5. Futures Term Structure & Implied Carry

### 5.1 Annualized Implied Carry Roll
For adjacent expiries $P_{\text{near}}$ and $P_{\text{far}}$ on the same trading session:

$$\text{Annualized Carry (\%)} = \left(\frac{P_{\text{far}}}{P_{\text{near}}} - 1\right) \times \left(\frac{365}{\text{Calendar Days Between}}\right) \times 100$$

### 5.2 Linear Cross-Expiry Carry Decomposition
$$\text{Observed Gap} = P_{\text{far}} - P_{\text{near}} = \text{Expected Calendar Carry} + \text{Basis Residual}$$
* **Limitation**: Assumes linear term structure carry without convexity adjustments or financing jump risk.

---

## 6. Corwin-Schultz (2012) High-Low Liquidity Proxy

Estimates daily bid-ask spread proxy from high and low prices across two consecutive valid trading days:

$$\beta = \left[\ln\left(\frac{H_1}{L_1}\right)\right]^2 + \left[\ln\left(\frac{H_2}{L_2}\right)\right]^2$$

$$\gamma = \left[\ln\left(\frac{\max(H_1, H_2)}{\min(L_1, L_2)}\right)\right]^2$$

$$\alpha = \frac{\sqrt{2\beta} - \sqrt{\beta}}{3 - 2\sqrt{2}} - \sqrt{\frac{\gamma}{3 - 2\sqrt{2}}}$$

$$S = \frac{2\left(e^\alpha - 1\right)}{1 + e^\alpha}$$

### 6.1 Estimator Rules
1. **Adjacency Requirement**: Sessions must be consecutive trading days as defined by the trading calendar. Missing dates invalidate the calculation.
2. **Zero-Volume Exclusions**: If volume is zero (`NO_TRADE`), the session is excluded.
3. **Negative Alpha / Spread**: If $\alpha < 0$ or $S < 0$, the estimator is marked **`NOT_ESTIMABLE`** (never floored to 0), triggering the conservative fallback cost hurdle.
4. **Proxy Label**: Explicitly presented as an empirical proxy, never an executable bid-ask spread.

---

## 7. Endpoint Summary

| Endpoint | Method | Purpose | Key Query Parameters |
| :--- | :--- | :--- | :--- |
| `/normalized` | GET | Normalized prices & LCM basket | `apply_purity_scaling`, `trade_date`, `symbol` |
| `/spreads` | GET | Relative-value pairs & Z-score hurdle | `trade_date`, `expiry`, `min_samples` |
| `/curve` | GET | Term structure & annualized rolls | `trade_date`, `symbol` |
| `/liquidity` | GET | Corwin-Schultz proxy & volume metrics | `symbol`, `expiry_date` |
| `/diagnostics/offset` | GET | Same-expiry offset diagnostic | `target_expiry`, `from_date`, `to_date` |
| `/data-quality/coverage` | GET | Calendar trading days & missing dates | `from_date`, `to_date` |
