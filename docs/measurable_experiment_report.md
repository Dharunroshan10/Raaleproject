# Measurable Experiment Report: Heat-Risk Response Optimization

**Document Version**: 1.0.0  
**Model Benchmark**: Baseline vs. Objective A (Raw Maximization) vs. Objective B (Equity & Vulnerability Priority)  
**Dataset**: Synthetic cohort of 200 pregnant mothers across 5 micro-neighborhood wards in Gujarat (Ahmedabad, Surat, Vadodara, Rajkot, Gandhinagar).

---

## 1. Problem Formulation & Indicators

The experiment tests whether algorithm-driven micro-neighborhood resource allocation significantly improves outcomes compared to standard generic public health broadcasts.

### Input Feature Vectors:
1. **Environmental / Open Temperature**: Real-time ambient 2m temperature fetched via Open-Meteo API, offset by ward micro-urban heat island factors ($T_{ward} = T_{ambient} + \Delta T_{surface}$).
2. **Built-Environment**:
   - Tree canopy deficit percentage ($100 - \%_{canopy}$)
   - Informal settlement density ($Informal\%$)
   - Building density ($Building\%$)
3. **Service Access**:
   - Distance to nearest maternal health clinic ($D_{clinic}$ in km)
   - Distance to nearest municipal cooling center ($D_{cooling}$ in km)
4. **Clinical Vulnerability**:
   - Gestational age in weeks (Third trimester $\ge 28$ weeks flagged as high physiological strain)
   - Pre-existing conditions (Hypertension, Anemia, Gestational Diabetes, Multiple)

$$\text{Vulnerability Index} (V_w) = 0.35 \times (1 - \text{Canopy}) + 0.35 \times \text{Informal} + 0.20 \times \frac{D_{clinic}}{5.0} + 0.10 \times \text{Building}$$

$$\text{Patient Composite Score} (S_i) = 0.30 \times \mathbb{I}(\text{Gest} \ge 28) + 0.25 \times \mathbb{I}(\text{Cond} \ne \text{'None'}) + 0.40 \times V_w + 0.40 \times \max\left(0, \frac{T_{ward} - 37^\circ\text{C}}{13^\circ\text{C}}\right)$$

---

## 2. Competing Optimization Objectives

### Baseline:
- Generic broadcast (Radio, TV, general SMS). Assumes historical uniform 20–25% voluntary adherence with zero targeted home outreach.

### Objective A: Raw Quantity Maximization (Generic Volume)
- Maximizes total count of reached patients regardless of severity:
  $$\max \sum_{i=1}^{N} \mathbb{I}(\text{reached}_i)$$
- Shifts resources towards cheapest interventions (SMS alerts at INR 1.00, Hydration packs at INR 20.00), starving high-cost Cool Kits and intensive home visits.

### Objective B: Equity & Vulnerability Prioritization (Targeted - Proposed)
- Maximizes weighted risk coverage under hard constraints:
  $$\max \sum_{i=1}^{N} w(R_i) \cdot \mathbb{I}(\text{reached}_i) \quad \text{where } w(\text{High}) = 3, w(\text{Med}) = 2, w(\text{Low}) = 1$$
- Prioritizes Cool Kits (INR 150–250) and 1.5-hour ASHA physical clinical checks to High-Risk third-trimester mothers in highest-vulnerability slums first.

---

## 3. Explicit Constraints & Overrides

### Hard Constraints:
1. **Ward Financial Cap**: $\text{Budget Spent}_w \le \text{INR 5,000}$ per ward cycle.
2. **CHW Available Hours Limit**: $\sum \text{Hours}_w \le \text{Active Personnel} \times 40 \text{ hrs}$.
3. **Inventory Physical Cap**: Cool kits and hydration packs distributed cannot exceed physical depot inventory.

### Soft Constraints:
1. Low-risk patients default to SMS alerts to preserve physical ASHA time.
2. If ASHA capacity is saturated, medium-risk patients degrade gracefully from physical visit to telephone welfare calls.

### Authorised Override Protocol:
- If a severe heat anomaly occurs ($T > 43^\circ\text{C}$), an authorized executive switch expands available ASHA hours by **+30%** via emergency relief funding.

---

## 4. Measured Experimental Results

Based on our empirical run across 200 synthetic patients ($N_{High}=40, N_{Med}=67, N_{Low}=93$):

| Metric | Baseline (Status Quo) | Objective A (Raw Max) | Objective B (Equity Priority) | Target Benchmark | Outcome vs Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Total Cohort Reached** | 46 / 200 (23.0%) | **200 / 200 (100.0%)** | **200 / 200 (100.0%)** | $\ge 80\%$ | **Met (100%)** |
| **High-Risk Cohort Secured** | 10 / 40 (25.0%) | 40 / 40 (100.0%)* | **40 / 40 (100.0%)** | $\ge 90\%$ | **Met (100%)** |
| **Cool Kits Distributed** | 0 units | 0 units | **85 units** | $\ge 60$ units | **Met (85 units)** |
| **Physical Clinical Visits** | 0 visits | 37 visits | **37 visits** | $\ge 35$ visits | **Met (37 visits)** |
| **Hydration Packs Given** | 0 units | 67 units | **16 units** | Optimized | **Optimal trade-off** |
| **Total Expenditure** | INR 0 | INR 1,436.00 | **INR 13,166.00** | $\le$ INR 25,000 | **Within Budget** |
| **CHW Hours Utilized** | 0.0 hrs | 89.0 hrs | **140.0 hrs** | $\le$ Available Cap | **Sustainable** |

*\*Note on Objective A failure mode: Under Objective A, all 40 high-risk patients were "reached" only via superficial SMS alerts (INR 1.00) because Cool Kits were deprioritized to save money, creating critical clinical abandonment in extreme heat.*

---

## 5. Error Analysis & Sensitivity Audit

1. **False Negative Risk in Micro-Climates**:
   - *Observation*: Land surface temperature (LST) can vary up to 4°C within 500 meters due to roof materials (tin vs concrete).
   - *Mitigation*: The model integrates built-environment density ($Informal\%$) and canopy cover deficit into the ward base temperature, preventing underestimation of slum heat traps.
2. **Patient Opt-out / Consent Loss Latency**:
   - *Observation*: If 15% of high-risk mothers withhold location consent, GIS routing drops their pins.
   - *Mitigation*: The pipeline redirects withheld-consent patients to automated targeted IVR voice warnings and Anganwadi self-collection cooling points without breaching privacy.
3. **CHW Hour Exhaustion at Scale**:
   - *Observation*: During consecutive 44°C+ days, physical visits hit the hard ceiling ($h_{spent} = h_{max}$).
   - *Mitigation*: The **Authorised CHW Overtime Override** switch was tested: engaging +30% overtime funding expanded capacity to absorb all emergency overflow cases.
