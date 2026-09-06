# MCH-Shield: Project Presentation & Review Deck

**Topic**: Neighbourhood Heat-Risk Communication and Targeted Maternal Health Response Planner  
**Review Date**: September 2026  
**Format**: 10–12 Minute Presentation with Live Prototype Demonstration  
**Presenter Guide**: Includes bilingual speaker scripts (**🇬🇧 English & 🇮🇳 Tanglish**) for each slide.

---

## Slide 1: Title & Introduction

### Visual:
- **Title**: MCH-Shield: Maternal & Child Health Heat-Risk Response Planner
- **Subtitle**: Closing the Implementation Gap in State Public Health Heatwave Response
- **Badges**: Real-Time Open Weather • Equity-First Optimization • Privacy-Preserving GIS

### Speaker Script:
* **🇬🇧 English**:  
  "Good morning respected evaluators. Today, we are presenting **MCH-Shield**, a targeted neighborhood-level heat-risk response planner designed for state maternal and child health programs. Our system bridges the critical implementation gap between generic weather warnings and actionable, equitable field interventions."
* **🇮🇳 Tanglish**:  
  "Ellarukkum Good Morning. Innaiku namma presentation **MCH-Shield** pathi. State government tharra heatwave warning generic-a irukkuradhaala field-level-la epdi real-a high-risk pregnant mothers-a kapatha mudiyum-ngra problem-ku namma oru targeted response planner build pannirukkom."

---

## Slide 2: The Real-World Problem Statement

### Visual:
- Comparison graphic: Generic SMS Broadcast vs. Real Field Conditions
- Highlighting Slum Tin Roofs (45.8°C ground heat) vs. Air-Conditioned High Rises (24°C indoor)

### Speaker Script:
* **🇬🇧 English**:  
  "The assignment identifies a real implementation failure: public advisories are far too generic to change behavior in specific vulnerable neighborhoods. A pregnant mother in her third trimester living in an informal settlement with corrugated tin roofs, 3% tree canopy, and no indoor cooling is under extreme risk of heat exhaustion, preterm labor, or preeclampsia. Broadcasting a generic SMS saying 'drink water and stay indoors' fails because she cannot stay indoors in a tin-roof room that acts as an oven."
* **🇮🇳 Tanglish**:  
  "Problem enna-na, government tharra normal SMS advisories romba generic-a irukku. Oru tin-roof slum-la irukka pregnant mother-kum, AC veetla irukka mother-kum ore message thaan poguthu. Tin roof veetukulla heat 45°C-ku mela pogum, anga 'veetukulla irunga' nu solrathu useless. Indha structural inequality-a generic advisories address pannave illa."

---

## Slide 3: Our Solution & Multi-Source Data Fusion

### Visual:
- Flow diagram combining:
  1. Open-Meteo Live API (Ambient Temp)
  2. Built-Environment Indicators (Tree canopy deficit %, Informal housing %)
  3. Service-Access Metrics (Distance to nearest ANC clinic & cooling center)
  4. Clinical Parameters (Gestational age, pre-existing conditions: Hypertension, Anemia)

### Speaker Script:
* **🇬🇧 English**:  
  "Instead of city-wide averages, MCH-Shield calculates risk at the micro-neighborhood (ward) level. We dynamically fuse real-time ambient temperature from the open Open-Meteo API with built-environment factors like tree canopy deficit and informal settlement density, plus service-access indicators like clinic distance. We cross-reference this with antenatal clinical data to generate an objective Maternal Vulnerability Score."
* **🇮🇳 Tanglish**:  
  "Namma overall city-a paakama, ward-by-ward data edukkurom. Open-Meteo API-la irundhu live temperature edukkurom, adho kooda tree canopy (marangal evlo irukku), slum percentage, and clinic evlo thoorathula irukku-nu check panrom. Mother-oda clinical records (3rd trimester, blood pressure) idhellam combine panni oru accurate Vulnerability Score calculate panrom."

---

## Slide 4: The Optimization Engine — Comparing Two Competing Objectives

### Visual:
- Side-by-side comparison table of **Objective A** vs. **Objective B**
- Hard Constraints & Soft Constraints Callout Box

### Speaker Script:
* **🇬🇧 English**:  
  "A central requirement of the assignment is explicitly modeling constraints and comparing competing objectives:
  - **Objective A (Raw Quantity Maximization)**: Spreads resources thinly to maximize total headcount reached. It sends cheap INR 1.00 SMS alerts to everyone, leaving high-risk mothers in slums without physical Cool Kits or clinical visits.
  - **Objective B (Equity & Vulnerability Priority - Our Proposed Model)**: Prioritizes intensive physical care—delivering Cool Kits (ORS, cooling towels, thermometers) and 1.5-hour ASHA home checks to high-risk third-trimester mothers in the hottest slums first.
  Both models operate under strict **Hard Constraints**: a budget cap of INR 5,000 per ward and frontline worker hourly limits."
* **🇮🇳 Tanglish**:  
  "Rubric-la sonna maadhiri, namma two competing objectives compare panrom:
  - **Objective A**: Count-a mattum perusa kaata cheap SMS ellarukkum anuppum, aana slum-la irukka high-risk mothers-ku cool kit kedaikaathu.
  - **Objective B (Namma model)**: Equity-first approach. High-risk third-trimester mothers-kaha cool kits and ASHA home visit-a direct-a allocate pannum.
  Idhula INR 5,000 ward budget and ASHA working hours-ngra strict Hard Constraints irukku."

---

## Slide 5: Authorised Overtime Override (+30%)

### Visual:
- UI Screenshot showing the **Authorised CHW Overtime Override** switch and warning banner
- Graph showing capacity expansion from 100% to 130%

### Speaker Script:
* **🇬🇧 English**:  
  "What happens when an unprecedented heat spike of 46°C occurs and the normal ASHA capacity is saturated? Rather than crashing or ignoring patients, MCH-Shield provides an **Authorised Executive Override**. A health officer toggles the override, legally unlocking a +30% overtime budget. This reflects operational reality while maintaining strict administrative auditability."
* **🇮🇳 Tanglish**:  
  "Veyil 46°C-ku mela poi emergency aana, ASHA workers-oda normal hours pathaadhu. Adhukaha namma app-la **Authorised Overtime Override** switch vachirukkom. Admin idhai on panna, legal-a +30% extra overtime funding unlock aagi, balance irukka high-risk mothers-kum care kudukka mudiyum."

---

## Slide 6: Privacy, Consent & Role-Based UI (RBAC)

### Visual:
- UI comparison: State Programme Planner view vs. ASHA Task Checklist vs. Mother Portal
- The Consent Toggle (`Granted` vs `Withheld`) showing GPS coordinates scrubbing

### Speaker Script:
* **🇬🇧 English**:  
  "The assignment mandates role-based visibility and privacy inside the user interface, not just in a written report:
  - **State Planner**: Sees strategic district maps and resource sliders.
  - **ASHA Worker**: Sees only her ward's actionable task list.
  - **Mother Portal**: Sees plain-language heat safety advice and cooling shelter locations.
  Crucially, our **Consent & Privacy Engine** allows mothers to withhold location consent at any time. When withheld, their name and GPS pin are immediately redacted from the GIS map, yet they are still counted in aggregate ward statistics."
* **🇮🇳 Tanglish**:  
  "Privacy and Role-Based Access namma UI-laye build pannirukkom:
  - Admin-ku Strategic Planner and GIS map theriyum.
  - ASHA worker-ku avanga daily tasks mattum theriyum.
  - Mother Portal-la simple advice and shelter details irukum.
  Mukkiyama, **Consent Toggle** irukku. Mother consent withdraw panna, avanga GPS location and name GIS map-la irundhu redact aaidum, but ward statistics-la aggregate-a count aagum. Idhu GDPR and NDHM standards-ku compliant."

---

## Slide 7: Addressing Rural Realities — Offline SMS Sync Simulator

### Visual:
- ASHA View with the **"📡 Sync Offline SMS (Mothers)"** button and inbound distress feed

### Speaker Script:
* **🇬🇧 English**:  
  "In many informal settlements, mothers have basic feature phones or no data connectivity. We built an **Offline SMS Sync Simulator**. An ASHA worker can sync low-bandwidth inbound SMS distress reports directly into her field terminal. The system automatically registers unregistered mothers, escalates worsening patients to High-Risk, and instantly generates emergency home-visit tasks."
* **🇮🇳 Tanglish**:  
  "Gramapurangal-la and slum-la smartphones irukaadhu. Idhukaha namma **Offline SMS Sync** build pannom. ASHA worker oru click panna, basic phones-la irundhu vara SMS distress messages-a sync panni, auto-register panni, emergency home-visit task-a create pannidum."

---

## Slide 8: Measured Results & Deliverables Verification

### Visual:
- Data Table comparing Baseline vs Objective A vs Objective B
- 100% High-Risk Reach Achieved

### Speaker Script:
* **🇬🇧 English**:  
  "In our benchmark experiment across 200 synthetic patients:
  - **Baseline** reached only 25% of high-risk mothers.
  - **Objective A** reached 100% on paper, but delivered 0 Cool Kits and purely SMS.
  - **Objective B (MCH-Shield)** successfully delivered **100% targeted reach** to all 40 high-risk mothers, dispatching 85 Cool Kits and 37 physical clinical visits while staying strictly within ward budget caps."
* **🇮🇳 Tanglish**:  
  "200 patients vechu test panna experiment results:
  - Baseline-la 25% high-risk mothers thaan reach aanaanga.
  - Objective A-la empty SMS mattum thaan pochu.
  - Namma **Objective B**-la 100% high-risk mothers-ku 85 Cool Kits and 37 direct clinical home visits deliver aachu, adhum budget kulla!"

---

## Slide 9: Conclusion & Demonstration Transition

### Speaker Script:
* **🇬🇧 English**:  
  "To conclude, all 8 required project deliverables—from the field workflow map and synthetic data generator to the failure-mode analysis, measurable experiment, user validation, and live functional prototype—are fully complete and deployed on GitHub and Vercel. We are now delighted to show you the live prototype demonstration."
* **🇮🇳 Tanglish**:  
  "Ellame complete: Field workflow map, Failure-mode analysis, User feedback summary, Measurable experiment report, and Live working app GitHub and Vercel-la live-a irukku. Ippo live demo kaatrom!"
