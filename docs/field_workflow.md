# Field-Workflow Map: Maternal Child Health Heat-Risk response

This document visualizes the operational flow, from patient intake and environmental monitoring to optimized response planning and field execution.

```mermaid
graph TD
    %% Patient Registration & Consent Stage
    A[Maternal Patient Intake / Registration] --> B{Privacy Consent Form}
    B -- Consent Granted --> C[Store Full Health Data & GPS Coordinates]
    B -- Consent Withheld --> D[Store Health Data & Redact Identifying Info / Coords]
    
    %% Environmental and Service access Monitoring Stage
    C --> E[Data Integration Engine]
    D --> E
    F[Daily Temp, Built Environment, & Service Access Indicators] --> E
    
    %% Optimization Model Evaluation
    E --> G[Maternal Heat-Risk Engine]
    G --> H{Risk Stratification}
    
    %% Intervention Path: Low Risk
    H -- Low Risk --> I[Queue Automated SMS / Voice IVR Alerts]
    
    %% Intervention Path: Medium Risk
    H -- Med Risk --> J[Allocate Hydration Packs & Cool Kits]
    J --> K[Anganwadi Pick-up / Local Outreach Drop]
    
    %% Intervention Path: High Risk (Privacy branches)
    H -- High Risk --> L{Is Consent Granted?}
    L -- Yes --> M[Map Patient Location on GIS Map]
    M --> N[Assign ASHA Worker Home Visit Task]
    N --> O[Deliver Cool Kit + Clinical Vitals Assessment]
    
    L -- No --> P[Redact Patient details on GIS Map]
    P --> Q[Send Targeted Emergency IVR Advisory]
    Q --> R[Direct to Nearest Public Cooling Center]
    
    %% Completion & Feedback Loops
    O --> S[Log Completed Visit Vitals in Registry]
    K --> T[Update Inventory Tracker]
    S --> U[System Update & Vulnerability Recalculation]
    T --> U
```

### Operational Steps Description

1. **Intake and Consent**: During standard antenatal care visits, pregnant women are enrolled in the MCH tracking database. They choose whether to consent to active home visits, which requires sharing their precise location. If they opt-out (consent withheld), they are de-identified to protect privacy, appearing only as aggregated statistics at the ward level.
2. **Data Integration**: The engine pulls environmental data (land surface temperature, building density) and combines it with MCH clinical data (gestational age, pre-existing conditions).
3. **Risk Stratification**: Patients are classified into Low, Medium, and High heat-risk categories daily.
4. **Optimized Dispatch**:
   - **Low-Risk** receives cheap, automated digital advice.
   - **Medium-Risk** receives cooling materials distributed through local schools or self-collection.
   - **High-Risk** receives face-to-face clinical interventions from ASHA workers, provided they have granted location sharing consent. If consent is withheld, safety calls are triggered without exposing exact home addresses.
