# Workforce Metrics — **Calculation Formulas** (ISPN One-Pager)

> **Scope:** Voice, inbound (filter `Media Type="voice"`, `Initial Direction="inbound"`).
> **Time parsing:** Convert all `HH:MM:SS(.fff)` fields to **seconds** before aggregating.
> **Answered calls:** `Training Interactions.csv` → `Abandoned="NO"`.
> **Weighted agent totals:** Multiply agent averages by `Answered` before summing.

---

## 1) Active Agents

**Purpose:** Count agents who actually worked.

* **Formula:** `Active Agents = countDistinct(Agent) where Logged In > 0`
* **Fields:** `training Agent Status Summary.csv` → `Agent`, `Logged In`

## 2) Total Calls

**Purpose:** Total handled volume.

* **Formula:** `Total Calls = Σ Answered`
* **Fields:** `Training Agent Performance Summary.csv` → `Answered`

## 3) Transfer Rate

**Purpose:** % of handled calls that were transferred.

* **Formula:** `Transfer Rate = (Σ Transfers ÷ Σ Answered) × 100%`
* **Fields:** `Training Agent Performance Summary.csv` → `Transfers` (or `Transferred`), `Answered`

## 4) Productive Utilization

**Purpose:** Real work time vs. login.

* **Formula:**
  `Prod Util = ( Σ(Avg Handle_sec × Answered) ÷ Σ Logged In_sec ) × 100%`
  where `Avg Handle_sec = Avg Talk_sec + Avg Hold_sec + Avg ACW_sec`
* **Fields:** `Training Agent Performance Summary.csv` → `Avg Talk`, `Avg Hold`, `Avg ACW`, `Avg Handle`, `Answered`
  `training Agent Status Summary.csv` → `Logged In`

## 5) On-Queue Utilization (traditional)

**Purpose:** Time on-queue vs. login.

* **Formula:** `On-Queue Util = (Σ On Queue_sec ÷ Σ Logged In_sec) × 100%`
* **Fields:** `training Agent Status Summary.csv` → `On Queue`, `Logged In`

## 6) Average Speed of Answer (ASA)

**Purpose:** Mean customer wait before answer (answered only).

* **Formula:** `ASA_sec = ( Σ queue_sec for answered ÷ count(answered) )`
* **Fields:** `Training Interactions.csv` → `Total Queue`, `Abandoned`

## 7) Abandonment Rate

**Purpose:** % of all contacts that abandoned.

* **Formula:** `Abandon % = ( count(Abandoned="YES") ÷ total rows ) × 100%`
* **Fields:** `Training Interactions.csv` → `Abandoned`

## 8) Average Handle Time (AHT)

**Purpose:** Average handling time (talk+hold+ACW), weighted by volume.

* **Formula:** `AHT_sec = Σ(Avg Handle_sec × Answered) ÷ Σ Answered`
* **Fields:** `Training Agent Performance Summary.csv` → `Avg Handle`, `Answered`

---

## 9) **Service Level (SLA\_T)**  **← Added**

**Purpose:** % of answered contacts answered within threshold **T** seconds (e.g., 20, 60, 90).

* **Formula:** `SLA_T = ( count(answered AND queue_sec ≤ T) ÷ count(answered) ) × 100%`
* **Fields:** `Training Interactions.csv` → `Total Queue`, `Abandoned`

## 10) **Shrinkage**  **← Added**

**Purpose:** Inflate base staffing to cover non-productive time.

* **Shrinkage %:**
  `Shrinkage = ( (Break + Meal + Away + Not Responding + Off Queue)_sec ÷ Logged In_sec ) × 100%`
* **Required Staff (with shrinkage):**
  `Required_with_Shrinkage = Base_Required ÷ (1 − Shrinkage)`
* **Fields:** `training Agent Status Summary.csv` → `Break`, `Meal`, `Away`, `Not Responding`, `Off Queue`, `Logged In`

## 11) **Schedule Coverage (Interval)**  **← Added**

**Purpose:** Measure under/overstaffing vs. requirement (with and without shrinkage).

* **Raw Difference:**
  `Difference = Scheduled − Required Staff`
* **Difference (Shrinkage-aware):**
  `Difference_with_Shrinkage = Scheduled − Required Staff with Shrinkage`
* **Adjusted fields (if present):** Use `Adjusted Required Staff` and `Adjusted Required Staff with Shrinkage` the same way.
* **Fields:** `ScheduledRequiredAndPerformance*.csv` →
  `Scheduled`, `Required Staff`, `Required Staff with Shrinkage`, `Difference`, `Difference with Shrinkage`, `Adjusted …`

---

## 12) Adherence / Conformance (source-provided)

**Purpose:** Schedule discipline KPIs for coaching & variance attribution.

* **Adherence (as given):** `% time in scheduled states ÷ scheduled time`
* **Conformance (as given):** `% logged-in time within scheduled window`
* **Fields:** `HistoricalAdherence 7_24.csv` → `Adherence (%)`, `Conformance (%)`, `Exceptions Duration Minutes`

---

## Optional (for planning models)

### Erlang-C Staffing (when you need to compute Required)

* **Inputs:** arrivals/hour `λ`, service rate `μ = 3600/AHT_sec`, staff `c`
* **Wait:**
  `P(wait) = [ a^c/(c!(1−ρ)) ] ÷ [ Σ_{k=0}^{c−1} a^k/k! + a^c/(c!(1−ρ)) ]`
  `Wq_hours = P(wait) ÷ (cμ − λ)` → `Wq_sec = 3600 × Wq_hours`, where `a=λ/μ`, `ρ=a/c`
* **Solve for smallest `c` with** `Wq_sec ≤ target` (e.g., 20s, 90s).
* **Fields:** arrivals from `Training Interactions.csv`; AHT from above.

---

### Implementation Notes

* Always **convert durations to seconds** before math.
* Use **Time (Chicago)** for interval alignment and reporting consistency.
* For weighted agent metrics, **multiply averages by `Answered`** before summing (then divide by total `Answered`).
* Pick **one authoritative SLA/ASA source** for dashboards (recommended: the Scheduled/Required performance export when available); use Interactions for diagnostics.
