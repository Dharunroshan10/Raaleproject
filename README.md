# MCH-Shield: Maternal & Child Health Heat-Risk Response Planner

[![Live Preview](https://img.shields.io/badge/Live-Vercel-black?style=flat&logo=vercel)](https://raaleproject.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Prototype-Complete-brightgreen.svg)]()
[![Data](https://img.shields.io/badge/Data-Open--Meteo%20%2B%20Synthetic-orange.svg)]()

> **A state programme field tool for neighbourhood-level heat-risk communication and targeted maternal health response planning. Powered by real-time weather data, built-environment indicators, and equity-first resource optimization.**

---

## 1. Problem Statement & Background

During extreme summer heatwaves in India, state health departments issue broad, city-wide advisories (e.g., *"stay indoors and drink water"*). However, **generic advisories fail to change behavior in specific vulnerable neighborhoods**. 

A pregnant mother in an informal settlement (tin-roof slum, 3% tree canopy, 3.2 km to the nearest clinic) faces acute heat stress, preterm labor risks, and hyperthermia that are orders of magnitude higher than someone in an air-conditioned apartment. Yet, conventional public health systems deliver the exact same generic SMS to both.

### The Solution: MCH-Shield
**MCH-Shield** replaces generic broadcast warnings with **micro-neighborhood heat-risk communication and targeted field response planning**:
1. **Fuses real-time data**: Pulls live 2m ambient temperatures from the open-source Open-Meteo API and factors in neighborhood building density, informal housing percentage, and tree canopy deficit.
2. **Prioritizes with Mathematical Optimization**: Allocates scarce frontline resources (Cool Kits, ORS Hydration Packs, ASHA worker home visits) according to explicit **hard constraints** (budget caps, CHW hours limits) and **soft constraints**.
3. **Compares Competing Objectives**: Directly evaluates **Objective A** (Raw Volume Maximization) against **Objective B** (Equity & Vulnerability Priority).
4. **Protects Privacy**: Enforces end-to-end consent management, redacting personal identifiable information (PII) and GPS coordinates for mothers who withhold consent while preserving aggregate ward risk statistics.
5. **Bridges the Digital Divide**: Includes an **Offline SMS Sync Simulator** enabling ASHA field workers to intake distress messages from non-smartphone users in low-connectivity settlements.

---

## 2. Key Architecture & Features

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             MCH-SHIELD ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
┌──────────────────────────────┐                       ┌──────────────────────────────┐
│  OPEN ENVIRONMENTAL DATA     │                       │    MATERNAL REGISTRY & ANC   │
│  - Open-Meteo Live API       │                       │    - Gestational Age (wks)   │
│  - Micro-Urban Heat Island   │                       │    - Pre-existing Conditions │
│  - Tree Canopy Deficit %     │                       │    - Dynamic Consent Status  │
│  - Informal Settlements %    │                       │    - Assigned ASHA Worker    │
└──────────────┬───────────────┘                       └──────────────┬───────────────┘
               │                                                      │
               └───────────────────────┬──────────────────────────────┘
                                       ▼
                       ┌──────────────────────────────┐
                       │  MATERNAL HEAT-RISK ENGINE   │
                       │  - Dynamic Risk Scoring      │
                       │  - High / Med / Low Triaging │
                       └──────────────┬───────────────┘
                                       ▼
                       ┌──────────────────────────────┐
                       │ RESOURCE OPTIMIZATION MODEL  │
                       │ - Objective A vs Objective B │
                       │ - Hard Budget & Hour Caps    │
                       │ - Authorised CHW Overtime    │
                       └──────────────┬───────────────┘
                                       ▼
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐         ┌───────────────────┐         ┌───────────────────┐
│   ADMIN VIEW     │         │     ASHA VIEW     │         │   MOTHER PORTAL   │
│ - Ward Risk GIS  │         │ - Action Checklist│         │ - Plain Advisories│
│ - Objective Plan │         │ - Mark Done State │         │ - Shelter Locator │
│ - Override Mode  │         │ - Offline SMS Sync│         │ - Privacy Toggle  │
└──────────────────┘         └───────────────────┘         └───────────────────┘
```

### Role-Based Access Control (RBAC):
- **🏛️ State Programme Planner (`admin`)**: Accesses the high-level Dashboard, Ward Vulnerability Index, GIS Heat Map, and the Strategic Objective Planner with Overtime Override controls.
- **🩺 ASHA Worker (`chw`)**: Field view focused on daily actionable tasks (Cool Kit deliveries, clinical vital checks, welfare calls) with offline SMS synchronization and persistent task completion tracking.
- **🏡 Patient / Mother Portal (`mother`)**: Beneficiary-facing view showing plain-language hydration guidance, nearest cooling center referrals, and an active consent withdrawal toggle.

---

## 3. Optimization Model: Objective A vs Objective B

| Feature | Objective A: Raw Maximization | Objective B: Equity & Vulnerability (Proposed) |
| :--- | :--- | :--- |
| **Optimization Target** | $\max \sum \text{Patients Reached}$ | $\max \sum \text{Weight}(\text{Risk}) \times \text{Action}$ |
| **Strategy** | Floods cheap SMS (INR 1) to maximize reach | Reserves Cool Kits & visits for high-risk slum mothers |
| **High-Risk Home Visits** | Minimal / Superficially satisfied | **Guaranteed 100% targeted visits** |
| **Cool Kits Allocated** | 0 units (deprioritized to save cost) | **Prioritized to 3rd-trimester high-risk mothers** |
| **Hard Constraints** | Max INR 5,000 / ward, 40 hrs/worker | Max INR 5,000 / ward, 40 hrs/worker |
| **Authorised Override** | N/A | **+30% CHW Overtime capacity switch during emergency** |

---

## 4. Project Directory Structure

```
projectralle/
├── index.html                   # Main single-page application UI with RBAC views
├── app.js                       # Core state engine, optimization algorithms, Leaflet GIS
├── style.css                    # Responsive dark-theme design system with accessible colors
├── README.md                    # Comprehensive technical documentation
├── data_science/
│   ├── generate_synthetic_data.py # Reproducible data synthesis for wards, patients, resources
│   ├── experiment.py            # Headless benchmark comparing Baseline, Obj A, Obj B
│   ├── data/                    # Generated CSVs & JSON datasets (de-identified)
│   └── results/                 # Experiment benchmark outputs (experiment_results.json)
└── docs/
    ├── field_workflow.md        # Operational flowchart (Mermaid diagram)
    ├── failure_mode_analysis.md # 3 critical failure modes and system mitigations
    ├── user_feedback_summary.md # Stakeholder usability testing with Admin, ASHA, & Beneficiary
    ├── measurable_experiment_report.md # Formal benchmark report with baseline, target, & errors
    └── presentation.md          # Complete slide-by-slide script for project reviews
```

---

## 5. How to Run Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Dharunroshan10/Raaleproject.git
   cd Raaleproject
   ```

2. **Launch a local HTTP server**:
   ```bash
   # Using Python:
   python -m http.server 8000
   ```

3. **Open in browser**:
   Navigate to `http://localhost:8000`.

---

## 6. Deployment on Vercel

This repository is built as a zero-dependency static web application and deploys seamlessly on Vercel:
1. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
2. Select `Dharunroshan10/Raaleproject` from your GitHub repositories.
3. Keep default settings (Framework: `Other`, Build Command: empty).
4. Click **"Deploy"**.

---

## 7. Compliance & Privacy Guarantees
- **100% Synthetic / De-identified Data**: No real patient records are exposed or stored.
- **GDPR / NDHM Consent Modeling**: Patients can toggle consent in real-time. When withheld, GPS coordinates and personal identifiers are immediately scrubbed from the Leaflet GIS map.
