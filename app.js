// MCH-Shield — Maternal & Child Health Heat-Risk Response Planner
// Production-Ready Application Logic
// Data: Open-Meteo API (live weather) + dynamically generated ward/resource models
// Patients: Zero on load — added only via field registration form

document.addEventListener("DOMContentLoaded", () => {

    // ─────────────────────────────────────────────
    // APPLICATION STATE
    // ─────────────────────────────────────────────
    let appData = { wards: [], patients: [], resources: [] };
    let currentRole     = "admin";
    let currentView     = "dashboard";
    let currentObjective = "obj_b";
    let currentDistrictId = "ahmedabad";
    let currentLiveTemp = 42.0;
    let map = null;
    let mapLayers = { wards: [], patients: [], clinics: [], coolingCenters: [] };

    // ─────────────────────────────────────────────
    // DISTRICTS CONFIGURATION
    // ─────────────────────────────────────────────
    const DISTRICTS = {
        ahmedabad:  { name: "Ahmedabad",  lat: 23.0225, lon: 72.5714, baseTempOffset:  0.0 },
        surat:      { name: "Surat",      lat: 21.1702, lon: 72.8311, baseTempOffset: -2.0 },
        vadodara:   { name: "Vadodara",   lat: 22.3072, lon: 73.1812, baseTempOffset: -0.5 },
        rajkot:     { name: "Rajkot",     lat: 22.3039, lon: 70.8022, baseTempOffset:  1.0 },
        gandhinagar:{ name: "Gandhinagar",lat: 23.2156, lon: 72.6369, baseTempOffset: -0.8 }
    };

    // CHW roster per ward position
    const CHW_IDS = ["CHW_01_A", "CHW_02_A", "CHW_03_A", "CHW_04_A", "CHW_05_A"];

    // ─────────────────────────────────────────────
    // DOM REFERENCES
    // ─────────────────────────────────────────────
    const roleSelect       = document.getElementById("role-select");
    const districtSelect   = document.getElementById("district-select");
    const navItems         = document.querySelectorAll(".side-nav li");
    const sections         = document.querySelectorAll(".content-section");
    const overrideSwitch   = document.getElementById("override-switch");
    const sliderCoolkit    = document.getElementById("slider-coolkit-stock");
    const valCoolkit       = document.getElementById("val-coolkit-stock");
    const sliderChw        = document.getElementById("slider-chw-threshold");
    const valChw           = document.getElementById("val-chw-threshold");
    const tabObjA          = document.getElementById("tab-obj-a");
    const tabObjB          = document.getElementById("tab-obj-b");
    const patientSearch    = document.getElementById("patient-search");
    const consentFilter    = document.getElementById("consent-filter");
    const loadingOverlay   = document.getElementById("loading-overlay");
    const loadingMessage   = document.getElementById("loading-message");

    // ─────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────
    async function init() {
        setupRoleSwitcher();
        setupNavigation();
        setupPlannerControls();
        setupPatientRegistry();
        setupSimulationControls();
        setupRegistrationForm();
        setupOfflineSMS();
        setupDistrictSelector();
        await selectDistrict("ahmedabad");
    }

    // ─────────────────────────────────────────────
    // LOADING OVERLAY
    // ─────────────────────────────────────────────
    function showLoading(msg) {
        loadingMessage.textContent = msg || "Loading…";
        loadingOverlay.classList.remove("hidden");
    }
    function hideLoading() {
        loadingOverlay.classList.add("hidden");
    }

    // ─────────────────────────────────────────────
    // DISTRICT SELECTION & DATA GENERATION
    // ─────────────────────────────────────────────
    async function selectDistrict(districtId) {
        const dist = DISTRICTS[districtId];
        if (!dist) return;
        currentDistrictId = districtId;

        showLoading(`Syncing live weather for ${dist.name}…`);

        // 1 — Generate 5 wards around district centre
        appData.wards = [
            { ward_id: "W01", ward_name: `${dist.name} Central`,          center_lat: dist.lat,           center_lon: dist.lon,           canopy_cover_pct: 28, building_density_pct: 45, informal_settlement_pct: 12, nearest_clinic_distance_km: 0.8, nearest_cooling_center_distance_km: 1.2, chw_density_per_100_patients: 4.5, base_temp: 38.2, vulnerability_index: 0.15 },
            { ward_id: "W02", ward_name: `${dist.name} North Slums`,      center_lat: dist.lat + 0.007,   center_lon: dist.lon - 0.010,   canopy_cover_pct:  3, building_density_pct: 92, informal_settlement_pct: 80, nearest_clinic_distance_km: 3.2, nearest_cooling_center_distance_km: 4.0, chw_density_per_100_patients: 1.0, base_temp: 45.8, vulnerability_index: 0.95 },
            { ward_id: "W03", ward_name: `${dist.name} East Market`,      center_lat: dist.lat + 0.008,   center_lon: dist.lon + 0.012,   canopy_cover_pct:  8, building_density_pct: 85, informal_settlement_pct: 65, nearest_clinic_distance_km: 2.4, nearest_cooling_center_distance_km: 3.1, chw_density_per_100_patients: 1.5, base_temp: 44.2, vulnerability_index: 0.78 },
            { ward_id: "W04", ward_name: `${dist.name} South Residential`,center_lat: dist.lat - 0.011,   center_lon: dist.lon - 0.005,   canopy_cover_pct: 18, building_density_pct: 60, informal_settlement_pct: 20, nearest_clinic_distance_km: 1.1, nearest_cooling_center_distance_km: 1.5, chw_density_per_100_patients: 3.5, base_temp: 40.1, vulnerability_index: 0.25 },
            { ward_id: "W05", ward_name: `${dist.name} West Canopy`,      center_lat: dist.lat + 0.005,   center_lon: dist.lon - 0.020,   canopy_cover_pct: 30, building_density_pct: 35, informal_settlement_pct:  5, nearest_clinic_distance_km: 0.7, nearest_cooling_center_distance_km: 0.8, chw_density_per_100_patients: 5.5, base_temp: 37.5, vulnerability_index: 0.12 }
        ];

        // 2 — Generate resources per ward
        const chwPerWard = { W01: 3, W02: 1, W03: 1, W04: 2, W05: 3 };
        appData.resources = appData.wards.map(w => ({
            ward_id: w.ward_id,
            ward_name: w.ward_name,
            budget_limit: 5000,
            chw_hours_available: (chwPerWard[w.ward_id] || 2) * 40,
            cool_kits_capacity: Math.round(15 + (1.0 - w.vulnerability_index) * 30),
            hydration_packets_capacity: Math.round(50 + (1.0 - w.vulnerability_index) * 100)
        }));

        // 3 — Do NOT clear patients, we filter them by district_id instead!

        // 4 — Fetch live weather from Open-Meteo
        let liveTemp = 38.0; // safe fallback
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${dist.lat}&longitude=${dist.lon}&current=temperature_2m`;
            const res = await fetch(url);
            if (res.ok) {
                const json = await res.json();
                if (json.current && json.current.temperature_2m !== undefined) {
                    liveTemp = json.current.temperature_2m;
                }
            }
        } catch (err) {
            console.warn("Open-Meteo fetch failed — using baseline temperature.", err);
        }

        // Apply district-level heat island offset
        liveTemp = parseFloat((liveTemp + dist.baseTempOffset).toFixed(1));
        currentLiveTemp = liveTemp;

        // 5 — Push live temp into slider & labels
        updateHeatBadge(liveTemp);
        const tempInput = document.getElementById("sim-temp-input");
        const valTemp   = document.getElementById("val-sim-temp");
        tempInput.value = liveTemp;
        valTemp.textContent = `${liveTemp}°C`;

        // 6 — Update all dynamic text labels for this district
        document.getElementById("sidebar-vitals-title").textContent = `${dist.name} District Vitals`;
        document.getElementById("dashboard-banner-title").textContent = `${dist.name} Heatwave Management Dashboard`;
        document.getElementById("stat-live-temp").textContent = `${liveTemp}°C`;
        document.getElementById("chw-district-label").textContent = dist.name;
        document.getElementById("chw-temp-label").textContent = `${liveTemp}°C ${liveTemp >= 42 ? "(🔴 RED Alert)" : liveTemp >= 39 ? "(🟡 AMBER Alert)" : "(🟢 Normal)"}`;

        // Total ASHA count = sum of CHW per ward
        const totalAsha = Object.values(chwPerWard).reduce((a, b) => a + b, 0);
        document.getElementById("stat-asha-workers").textContent = totalAsha;

        // 7 — Recalculate and render everything
        recalculateRiskLevels(liveTemp);
        updateVitals();
        renderDashboard();
        runOptimizationModel();
        renderPatientTable();

        if (currentRole === "chw") renderCHWTasks();
        updateMotherPortal();

        // 8 — Re-centre map if already open
        if (map) {
            map.setView([dist.lat, dist.lon], 13);
            renderMapWards();
            renderMapEntities();
        }

        hideLoading();
    }

    function setupDistrictSelector() {
        districtSelect.addEventListener("change", async (e) => {
            await selectDistrict(e.target.value);
        });
    }

    // ─────────────────────────────────────────────
    // HEAT BADGE UPDATER
    // ─────────────────────────────────────────────
    function updateHeatBadge(temp) {
        const badge     = document.getElementById("heat-badge-header");
        const badgeText = document.getElementById("heat-badge-text");
        if (temp >= 42.0) {
            badge.className = "heat-badge red";
            badgeText.textContent = `EXTREME HEAT ALERT: ${temp}°C`;
        } else if (temp >= 39.0) {
            badge.className = "heat-badge warning";
            badgeText.textContent = `MODERATE HEAT ALERT: ${temp}°C`;
        } else {
            badge.className = "heat-badge green";
            badgeText.textContent = `NORMAL CONDITIONS: ${temp}°C`;
        }
    }

    // ─────────────────────────────────────────────
    // ROLE SWITCHER
    // ─────────────────────────────────────────────
    function setupRoleSwitcher() {
        roleSelect.addEventListener("change", (e) => {
            currentRole = e.target.value;
            const adminOnly = document.querySelectorAll(".admin-only");
            const chwOnly   = document.querySelectorAll(".chw-only");

            if (currentRole === "admin") {
                adminOnly.forEach(el => el.classList.remove("hidden"));
                chwOnly.forEach(el => el.classList.add("hidden"));
                switchView("dashboard");
            } else if (currentRole === "chw") {
                adminOnly.forEach(el => el.classList.add("hidden"));
                chwOnly.forEach(el => el.classList.remove("hidden"));
                switchView("tasks");
                renderCHWTasks();
            } else if (currentRole === "mother") {
                adminOnly.forEach(el => el.classList.add("hidden"));
                chwOnly.forEach(el => el.classList.add("hidden"));
                switchView("mother");
                updateMotherPortal();
            }
        });
    }

    // ─────────────────────────────────────────────
    // NAVIGATION
    // ─────────────────────────────────────────────
    function setupNavigation() {
        navItems.forEach(item => {
            item.addEventListener("click", () => {
                const view = item.getAttribute("data-view");
                switchView(view);
            });
        });
    }

    function switchView(viewName) {
        currentView = viewName;
        navItems.forEach(item => {
            item.classList.toggle("active", item.getAttribute("data-view") === viewName);
        });
        sections.forEach(section => {
            section.classList.toggle("hidden", section.id !== `view-${viewName}`);
        });
        if (viewName === "map") setTimeout(initMap, 100);
    }

    // ─────────────────────────────────────────────
    // PATIENT REGISTRY SEARCH/FILTER
    // ─────────────────────────────────────────────
    function setupPatientRegistry() {
        patientSearch.addEventListener("input", renderPatientTable);
        consentFilter.addEventListener("change", renderPatientTable);
    }

    // ─────────────────────────────────────────────
    // RISK LEVEL CALCULATOR
    // ─────────────────────────────────────────────
    function recalculateRiskLevels(temp) {
        appData.patients.filter(p => p.district_id === currentDistrictId).forEach(p => {
            const ward = appData.wards.find(w => w.ward_id === p.ward_id);
            const baseVuln = ward ? parseFloat(ward.vulnerability_index) : 0.5;

            let score = 0.0;
            if (p.gestational_age_weeks >= 28)  score += 0.30; // third trimester
            if (p.pre_existing_conditions !== "None") {
                score += 0.25;
                if (p.pre_existing_conditions === "Multiple") score += 0.15;
            }
            score += baseVuln * 0.40;
            // Temperature anomaly factor (reference 37°C, max contribution at 50°C)
            score += (Math.max(0, temp - 37.0) / 13.0) * 0.40;

            if      (score > 0.65) p.risk_level = "High";
            else if (score > 0.40) p.risk_level = "Medium";
            else                   p.risk_level = "Low";

            if (p.risk_level === "High" && p.consent_status === "Granted") {
                p.contact_preference = "ASHA Visit";
            }
        });
    }

    // ─────────────────────────────────────────────
    // SIMULATION TEMPERATURE SLIDER
    // ─────────────────────────────────────────────
    function setupSimulationControls() {
        const tempInput = document.getElementById("sim-temp-input");
        const valTemp   = document.getElementById("val-sim-temp");

        tempInput.addEventListener("input", (e) => {
            const temp = parseFloat(e.target.value);
            currentLiveTemp = temp;
            valTemp.textContent = `${temp.toFixed(1)}°C`;
            updateHeatBadge(temp);
            document.getElementById("stat-live-temp").textContent = `${temp.toFixed(1)}°C`;
            document.getElementById("chw-temp-label").textContent =
                `${temp.toFixed(1)}°C ${temp >= 42 ? "(🔴 RED Alert)" : temp >= 39 ? "(🟡 AMBER)" : "(🟢 Normal)"}`;

            recalculateRiskLevels(temp);
            updateVitals();
            renderDashboard();
            runOptimizationModel();
            renderPatientTable();
            if (currentRole === "chw") renderCHWTasks();
            if (map) renderMapEntities();
        });
    }

    // ─────────────────────────────────────────────
    // SIDEBAR VITALS
    // ─────────────────────────────────────────────
    function updateVitals() {
        const districtPatients = appData.patients.filter(p => p.district_id === currentDistrictId);
        const total    = districtPatients.length;
        const highRisk = districtPatients.filter(p => p.risk_level === "High").length;
        const consented = districtPatients.filter(p => p.consent_status === "Granted").length;
        const pct = total > 0 ? Math.round(consented / total * 100) : 0;

        document.getElementById("stat-total-mothers").textContent = total;
        document.getElementById("stat-high-risk").textContent     = highRisk;

        // Consent stat card
        const el = document.getElementById("dash-consent-count");
        if (el) el.textContent = `${consented} Mother${consented !== 1 ? "s" : ""}`;
        const pctEl = document.getElementById("dash-consent-pct");
        if (pctEl) pctEl.textContent = total > 0 ? `${pct}% Compliance` : "— Compliance";
    }

    // ─────────────────────────────────────────────
    // DASHBOARD RENDER
    // ─────────────────────────────────────────────
    function renderDashboard() {
        // Vulnerability bars
        const vulnContainer = document.getElementById("vuln-bars");
        vulnContainer.innerHTML = "";
        const sortedWards = [...appData.wards].sort((a, b) => b.vulnerability_index - a.vulnerability_index);

        sortedWards.forEach(ward => {
            const pct  = Math.round(ward.vulnerability_index * 100);
            const cls  = pct > 75 ? "danger-bg" : pct > 40 ? "warning-bg" : "primary-color-bg";
            const item = document.createElement("div");
            item.className = "vuln-bar-item";
            item.innerHTML = `
                <div class="bar-lbl-row">
                    <span>${ward.ward_name} &mdash; Surface ${ward.base_temp}°C</span>
                    <span>Vulnerability: ${ward.vulnerability_index}</span>
                </div>
                <div class="bar-container">
                    <div class="bar-value ${cls}" style="width:${pct}%;">${pct}% Risk</div>
                </div>
                <div style="font-size:10px; color:var(--text-muted); margin-top:3px;">
                    Canopy: ${ward.canopy_cover_pct}% &nbsp;|&nbsp; Informal Settlements: ${ward.informal_settlement_pct}% &nbsp;|&nbsp; Nearest Clinic: ${ward.nearest_clinic_distance_km} km
                </div>
            `;
            vulnContainer.appendChild(item);
        });

        // Hottest ward card
        const hottest = sortedWards[0];
        if (hottest) {
            document.getElementById("dash-hottest-ward").textContent = hottest.ward_name;
            document.getElementById("dash-hottest-temp").textContent = `Hottest Neighbourhood (${hottest.base_temp}°C surface)`;
            const anomaly = parseFloat((hottest.base_temp - 37).toFixed(1));
            const anomEl = document.getElementById("dash-temp-anomaly");
            if (anomEl) anomEl.textContent = `+${anomaly}°C anomaly`;
        }

        // Alert badge
        const alertBadge = document.getElementById("alert-badge-label");
        const temp = currentLiveTemp;
        if (alertBadge) {
            if (temp >= 42) { alertBadge.className = "badge red"; alertBadge.textContent = "Action Needed"; }
            else if (temp >= 39) { alertBadge.className = "badge warning"; alertBadge.textContent = "Monitor"; }
            else { alertBadge.className = "badge green"; alertBadge.textContent = "All Clear"; }
        }

        // Dynamic neighbourhood advisory cards
        const alertContainer = document.getElementById("alert-list-container");
        if (!alertContainer) return;
        alertContainer.innerHTML = "";

        const highVuln  = sortedWards[0] || { ward_name: "High-Risk Ward", ward_id: "W01", canopy_cover_pct: 3 };
        const secondVuln = sortedWards[1] || { ward_name: "Secondary Ward", ward_id: "W02" };

        if (temp >= 42.0) {
            alertContainer.innerHTML = `
                <div class="alert-item high-alert">
                    <div class="alert-icon">🚨</div>
                    <div class="alert-content">
                        <h4>Extreme Hazard: ${highVuln.ward_name} (${highVuln.ward_id})</h4>
                        <p>Live temperature <strong>${temp}°C</strong>. Only ${highVuln.canopy_cover_pct}% tree canopy. High density of third-trimester mothers. Mobile cooling van dispatched. ASHA workers on emergency rotation.</p>
                        <span class="alert-time">Active Now</span>
                    </div>
                </div>
                <div class="alert-item high-alert" style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);margin-top:10px;">
                    <div class="alert-icon">🚨</div>
                    <div class="alert-content">
                        <h4>Severe Heat: ${secondVuln.ward_name} (${secondVuln.ward_id})</h4>
                        <p>Temperature ${temp}°C — clinic distance exceeds 2 km. Anganwadi centres opening as air-conditioned cooling shelters. ORS distribution authorised.</p>
                        <span class="alert-time">Active Now</span>
                    </div>
                </div>
                <div class="alert-item" style="background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.2);margin-top:10px;">
                    <div class="alert-icon">📢</div>
                    <div class="alert-content">
                        <h4>District-Wide SMS Advisory Issued</h4>
                        <p>All registered mothers received automated heat-safety advisory. High-risk patients flagged for ASHA home-visit prioritisation.</p>
                        <span class="alert-time">Sent automatically</span>
                    </div>
                </div>`;
        } else if (temp >= 39.0) {
            alertContainer.innerHTML = `
                <div class="alert-item med-alert">
                    <div class="alert-icon">⚠️</div>
                    <div class="alert-content">
                        <h4>Moderate Heatwave: ${highVuln.ward_name} (${highVuln.ward_id})</h4>
                        <p>Temperature ${temp}°C detected. ASHA workers initiating SMS warning routes and pre-allocating hydration packs to high-vulnerability households.</p>
                        <span class="alert-time">5 mins ago</span>
                    </div>
                </div>
                <div class="alert-item med-alert" style="margin-top:10px;">
                    <div class="alert-icon">⚠️</div>
                    <div class="alert-content">
                        <h4>Advisory: ${secondVuln.ward_name} (${secondVuln.ward_id})</h4>
                        <p>Temperature ${temp}°C. Recommend high-risk mothers stay indoors and consume ORS solutions. Check-in calls scheduled.</p>
                        <span class="alert-time">15 mins ago</span>
                    </div>
                </div>`;
        } else {
            alertContainer.innerHTML = `
                <div class="alert-item" style="background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.2);">
                    <div class="alert-icon">🟢</div>
                    <div class="alert-content">
                        <h4 style="color:var(--primary);">Normal Conditions — ${temp}°C</h4>
                        <p>District temperatures are within safe baseline limits. Standard clinical check-ups and routine antenatal guidelines remain active.</p>
                        <span class="alert-time">All clear</span>
                    </div>
                </div>`;
        }
    }

    // ─────────────────────────────────────────────
    // RESOURCE OPTIMISATION ENGINE
    // ─────────────────────────────────────────────
    function setupPlannerControls() {
        if (tabObjA) {
            tabObjA.addEventListener("click", () => {
                currentObjective = "obj_a";
                tabObjA.classList.add("active");
                if (tabObjB) tabObjB.classList.remove("active");
                runOptimizationModel();
            });
        }
        if (tabObjB) {
            tabObjB.addEventListener("click", () => {
                currentObjective = "obj_b";
                tabObjB.classList.add("active");
                if (tabObjA) tabObjA.classList.remove("active");
                runOptimizationModel();
            });
        }
        if (sliderCoolkit && valCoolkit) {
            sliderCoolkit.addEventListener("input", (e) => { 
                valCoolkit.textContent = `${e.target.value}%`; 
                runOptimizationModel(); 
            });
        }
        if (sliderChw && valChw) {
            sliderChw.addEventListener("input", (e) => { 
                valChw.textContent = `${e.target.value} hrs`; 
                runOptimizationModel(); 
            });
        }
        if (overrideSwitch) {
            overrideSwitch.addEventListener("change", (e) => {
                const warn = document.getElementById("override-warning");
                if (warn) warn.classList.toggle("hidden", !e.target.checked);
                runOptimizationModel();
            });
        }
    }

    function runOptimizationModel() {
        const coolKitFactor     = sliderCoolkit ? (parseFloat(sliderCoolkit.value) / 100.0) : 1.0;
        const chwHoursThreshold = sliderChw ? parseFloat(sliderChw.value) : 1.5;
        const isOverride        = overrideSwitch ? overrideSwitch.checked : false;

        let totalCost = 0, totalChwHours = 0, totalAvailHours = 0;
        let totalCoolKits = 0, totalHydration = 0, totalSms = 0, totalAshaVisits = 0;
        let reachedCount = 0, reachedHigh = 0;
        const districtPatients = appData.patients.filter(p => p.district_id === currentDistrictId);
        const totalPatients = districtPatients.length;
        const totalHigh     = districtPatients.filter(p => p.risk_level === "High").length;

        const wardResults = [];

        appData.wards.forEach(ward => {
            const res = appData.resources.find(r => r.ward_id === ward.ward_id);
            if (!res) return;

            const budgetLimit  = res.budget_limit;
            const maxCoolKits  = Math.round(res.cool_kits_capacity  * coolKitFactor);
            const maxHydration = res.hydration_packets_capacity;
            const maxChwHours  = res.chw_hours_available * (isOverride ? 1.30 : 1.0);
            totalAvailHours   += maxChwHours;

            let wardPatients = districtPatients.filter(p => p.ward_id === ward.ward_id);
            if (currentObjective === "obj_a") {
                wardPatients.sort((a, b) => ({ Low:1, Medium:2, High:3 }[a.risk_level] - { Low:1, Medium:2, High:3 }[b.risk_level]));
            } else {
                wardPatients.sort((a, b) => ({ High:1, Medium:2, Low:3 }[a.risk_level] - { High:1, Medium:2, Low:3 }[b.risk_level]));
            }

            let bSpent = 0, hSpent = 0, kitsUsed = 0, hydUsed = 0;

            wardPatients.forEach(p => {
                p.sim_reached = false;
                const risk = p.risk_level;

                if (risk === "High") {
                    // ASHA visit (1.5 hrs default) + cool kit if obj_b
                    if (currentObjective === "obj_b" && kitsUsed < maxCoolKits && bSpent + 250 <= budgetLimit && hSpent + chwHoursThreshold <= maxChwHours) {
                        kitsUsed++; bSpent += 250; hSpent += chwHoursThreshold;
                        p.sim_reached = true; p.sim_intervention = "Cool Kit + ASHA Visit";
                        totalCoolKits++; totalAshaVisits++; reachedHigh++;
                    } else if (bSpent + 50 <= budgetLimit && hSpent + chwHoursThreshold <= maxChwHours) {
                        bSpent += 50; hSpent += chwHoursThreshold;
                        p.sim_reached = true; p.sim_intervention = "ASHA Visit";
                        totalAshaVisits++; reachedHigh++;
                    } else if (bSpent + 1 <= budgetLimit) {
                        bSpent += 1;
                        p.sim_reached = true; p.sim_intervention = "SMS Alert";
                        totalSms++; reachedHigh++;
                    }
                } else if (risk === "Medium") {
                    if (currentObjective === "obj_b" && kitsUsed < maxCoolKits && bSpent + 150 <= budgetLimit && hSpent + chwHoursThreshold <= maxChwHours) {
                        kitsUsed++; bSpent += 150; hSpent += chwHoursThreshold;
                        p.sim_reached = true; p.sim_intervention = "Cool Kit Delivery";
                        totalCoolKits++;
                    } else if (hydUsed < maxHydration && bSpent + 20 <= budgetLimit && hSpent + 0.5 <= maxChwHours) {
                        hydUsed++; bSpent += 20; hSpent += 0.5;
                        p.sim_reached = true; p.sim_intervention = "Hydration Pack";
                        totalHydration++;
                    } else if (bSpent + 1 <= budgetLimit) {
                        bSpent += 1;
                        p.sim_reached = true; p.sim_intervention = "SMS Alert";
                        totalSms++;
                    }
                } else {
                    // Low risk — SMS
                    if (bSpent + 1 <= budgetLimit) {
                        bSpent += 1;
                        p.sim_reached = true; p.sim_intervention = "SMS Alert";
                        totalSms++;
                    }
                }

                if (p.sim_reached) reachedCount++;
            });

            totalCost      += bSpent;
            totalChwHours  += hSpent;

            wardResults.push({
                ward_id: ward.ward_id,
                ward_name: ward.ward_name,
                vulnerability: ward.vulnerability_index,
                mothers_count: wardPatients.length,
                cool_kits: kitsUsed,
                hydration: hydUsed,
                hours: hSpent,
                budget: bSpent,
                status: hSpent >= maxChwHours ? "At Capacity" : "Optimal"
            });
        });

        // Update reach bars
        const reachPct     = totalPatients > 0 ? (reachedCount / totalPatients * 100).toFixed(1) : "0.0";
        const highReachPct = totalHigh     > 0 ? (reachedHigh  / totalHigh     * 100).toFixed(1) : "0.0";

        const reachBar     = document.getElementById("reach-bar");
        const highReachBar = document.getElementById("high-reach-bar");
        if (reachBar) {
            reachBar.style.width = `${reachPct}%`;
            reachBar.textContent = totalPatients > 0 ? `${reachedCount} / ${totalPatients} (${reachPct}%)` : "No patients registered";
        }
        if (highReachBar) {
            highReachBar.style.width = `${highReachPct}%`;
            highReachBar.textContent = totalHigh > 0 ? `${reachedHigh} / ${totalHigh} (${highReachPct}%)` : "No high-risk patients";
        }

        const planHours = document.getElementById("plan-metric-hours");
        if (planHours) planHours.textContent = `${totalChwHours.toFixed(1)} hrs`;
        const planHoursMax = document.getElementById("plan-metric-hours-max");
        if (planHoursMax) planHoursMax.textContent = `of ${totalAvailHours.toFixed(1)} hrs max`;
        const planKits = document.getElementById("plan-metric-kits");
        if (planKits) planKits.textContent = `${totalCoolKits} Units`;
        const planPacks = document.getElementById("plan-metric-packs");
        if (planPacks) planPacks.textContent = `${totalHydration} Units`;
        const planCost = document.getElementById("plan-metric-cost");
        if (planCost) planCost.textContent = `INR ${totalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

        // Dashboard stat cards
        const dashKits = document.getElementById("dash-cool-kits");
        if (dashKits) dashKits.textContent = `${totalCoolKits} Cool Kits`;
        const dashKitsChange = document.getElementById("dash-kits-change");
        if (dashKitsChange) dashKitsChange.textContent = `${totalCoolKits} Allocated`;
        const dashHours = document.getElementById("dash-asha-hours");
        if (dashHours) dashHours.textContent = `${totalChwHours.toFixed(0)} / ${totalAvailHours.toFixed(0)} Hrs`;
        const dashHoursChange = document.getElementById("dash-hours-change");
        if (dashHoursChange) dashHoursChange.textContent = `${totalChwHours.toFixed(0)} hrs active`;

        // Ward optimisation table
        const tbody = document.querySelector("#planner-ward-table tbody");
        if (tbody) {
            tbody.innerHTML = "";
            if (wardResults.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-muted);">No ward data available. Select a district first.</td></tr>`;
            } else {
                wardResults.forEach(r => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td><strong>${r.ward_id}</strong></td>
                        <td>${r.ward_name}</td>
                        <td><span class="badge ${r.vulnerability > 0.7 ? "red" : r.vulnerability > 0.4 ? "warning" : "green"}">${r.vulnerability}</span></td>
                        <td>${r.mothers_count}</td>
                        <td>${r.cool_kits}</td>
                        <td>${r.hydration}</td>
                        <td>${r.hours.toFixed(1)} hrs</td>
                        <td>INR ${r.budget.toLocaleString("en-IN")}</td>
                        <td><span class="badge ${r.status === "At Capacity" ? "red" : "green"}">${r.status}</span></td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }



        if (map) updateMapInterventions();
    }

    // ─────────────────────────────────────────────
    // PATIENT REGISTRATION FORM
    // ─────────────────────────────────────────────
    function setupRegistrationForm() {
        const openBtn  = document.getElementById("btn-open-register-modal");
        const modal    = document.getElementById("register-modal");
        const closeBtn = document.getElementById("btn-close-modal");
        const cancelBtn= document.getElementById("btn-cancel-register");
        const form     = document.getElementById("register-patient-form");
        const wardSel  = document.getElementById("reg-ward");

        const populateWards = () => {
            wardSel.innerHTML = "";
            appData.wards.forEach(w => {
                const opt = document.createElement("option");
                opt.value = w.ward_id;
                opt.textContent = `${w.ward_name} (${w.ward_id})`;
                wardSel.appendChild(opt);
            });
        };

        openBtn.addEventListener("click", () => { populateWards(); modal.classList.remove("hidden"); });

        const closeModal = () => { modal.classList.add("hidden"); form.reset(); };
        closeBtn.addEventListener("click", closeModal);
        cancelBtn.addEventListener("click", closeModal);
        modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

        form.addEventListener("submit", (e) => {
            e.preventDefault();

            const name      = document.getElementById("reg-name").value.trim();
            const phone     = document.getElementById("reg-phone").value.trim();
            const age       = parseInt(document.getElementById("reg-age").value);
            const gest      = parseInt(document.getElementById("reg-gest").value);
            const wardId    = document.getElementById("reg-ward").value;
            const conditions= document.getElementById("reg-conditions").value;
            const consent   = document.getElementById("reg-consent").checked ? "Granted" : "Withheld";

            const wardInfo  = appData.wards.find(w => w.ward_id === wardId);
            if (!wardInfo) return;

            const pCount = appData.patients.length + 1;
            const newId  = `MCH_${String(pCount).padStart(4, "0")}`;

            const latOffset = (Math.random() - 0.5) * 0.006;
            const lonOffset = (Math.random() - 0.5) * 0.006;
            const lat = consent === "Granted" ? parseFloat((wardInfo.center_lat + latOffset).toFixed(6)) : null;
            const lon = consent === "Granted" ? parseFloat((wardInfo.center_lon + lonOffset).toFixed(6)) : null;

            // Assign CHW by ward index
            const wIdx = appData.wards.findIndex(w => w.ward_id === wardId);
            const chw  = CHW_IDS[wIdx] || "CHW_01_A";

            const newPatient = {
                patient_id: newId,
                district_id: currentDistrictId,
                name:  consent === "Withheld" ? "REDACTED (Consent Withheld)" : name,
                phone: consent === "Withheld" ? "REDACTED" : phone,
                ward_id: wardId,
                ward_name: wardInfo.ward_name,
                age, gestational_age_weeks: gest,
                pre_existing_conditions: conditions,
                risk_level: "Low",
                consent_status: consent,
                contact_preference: gest >= 28 ? "ASHA Visit" : "SMS Alert",
                latitude: lat, longitude: lon,
                assigned_chw: chw,
                orig_name: name, orig_phone: phone,
                orig_lat: parseFloat((wardInfo.center_lat + latOffset).toFixed(6)),
                orig_lon: parseFloat((wardInfo.center_lon + lonOffset).toFixed(6))
            };

            appData.patients.push(newPatient);
            recalculateRiskLevels(currentLiveTemp);
            closeModal();
            updateVitals();
            renderDashboard();
            runOptimizationModel();
            renderPatientTable();
            if (currentRole === "chw") renderCHWTasks();
            if (map) renderMapEntities();

            // Brief success notification
            showToast(`✅ ${newId} registered successfully and response plan updated!`);
        });

        // Load Sample Patients button listener
        const loadSampleBtn = document.getElementById("btn-load-sample");
        if (loadSampleBtn) {
            loadSampleBtn.addEventListener("click", () => {
                const sampleMothers = [
                    { name: "Anjali Patel", phone: "+91 98765 10001", age: 26, gest: 32, wardIdx: 1, cond: "Hypertension", consent: "Granted" },
                    { name: "Sunita Parmar", phone: "+91 98765 10002", age: 24, gest: 28, wardIdx: 1, cond: "None", consent: "Granted" },
                    { name: "Priya Sharma", phone: "+91 98765 10003", age: 29, gest: 18, wardIdx: 2, cond: "Anemia", consent: "Granted" },
                    { name: "Rani Kumari", phone: "+91 98765 10004", age: 22, gest: 36, wardIdx: 3, consent: "Withheld", cond: "None" },
                    { name: "Meena Shah", phone: "+91 98765 10005", age: 31, gest: 12, wardIdx: 4, cond: "Multiple", consent: "Granted" }
                ];

                sampleMothers.forEach((m) => {
                    const wardInfo = appData.wards[m.wardIdx] || appData.wards[0];
                    const pCount = appData.patients.length + 1;
                    const newId = `MCH_${String(pCount).padStart(4, "0")}`;

                    const latOffset = (Math.random() - 0.5) * 0.006;
                    const lonOffset = (Math.random() - 0.5) * 0.006;
                    const lat = m.consent === "Granted" ? parseFloat((wardInfo.center_lat + latOffset).toFixed(6)) : null;
                    const lon = m.consent === "Granted" ? parseFloat((wardInfo.center_lon + lonOffset).toFixed(6)) : null;

                    const chw = CHW_IDS[m.wardIdx] || "CHW_01_A";

                    appData.patients.push({
                        patient_id: newId,
                        district_id: currentDistrictId,
                        name: m.consent === "Withheld" ? "REDACTED (Consent Withheld)" : m.name,
                        phone: m.consent === "Withheld" ? "REDACTED" : m.phone,
                        ward_id: wardInfo.ward_id,
                        ward_name: wardInfo.ward_name,
                        age: m.age,
                        gestational_age_weeks: m.gest,
                        pre_existing_conditions: m.cond,
                        risk_level: "Low",
                        consent_status: m.consent,
                        contact_preference: m.gest >= 28 ? "ASHA Visit" : "SMS Alert",
                        latitude: lat,
                        longitude: lon,
                        assigned_chw: chw,
                        orig_name: m.name,
                        orig_phone: m.phone,
                        orig_lat: parseFloat((wardInfo.center_lat + latOffset).toFixed(6)),
                        orig_lon: parseFloat((wardInfo.center_lon + lonOffset).toFixed(6))
                    });
                });

                recalculateRiskLevels(currentLiveTemp);
                updateVitals();
                renderDashboard();
                runOptimizationModel();
                renderPatientTable();
                if (currentRole === "chw") renderCHWTasks();
                if (map) renderMapEntities();
                updateMotherPortal();

                showToast("⚡ Loaded 5 sample pregnant mothers across district wards!");
            });
        }
    }

    // ─────────────────────────────────────────────
    // OFFLINE SMS SYNC (MOTHERS)
    // ─────────────────────────────────────────────
    function setupOfflineSMS() {
        const btnSyncSms = document.getElementById("btn-sync-sms");
        const smsLogContainer = document.getElementById("sms-log-container");
        const smsLogList = document.getElementById("sms-log-list");

        if (btnSyncSms) {
            btnSyncSms.addEventListener("click", () => {
                btnSyncSms.innerHTML = "<span>⏳</span> Syncing via low-bandwidth node...";
                btnSyncSms.disabled = true;
                
                setTimeout(() => {
                    btnSyncSms.innerHTML = "<span>📡</span> Sync Offline SMS (Mothers)";
                    btnSyncSms.disabled = false;
                    
                    smsLogContainer.classList.remove("hidden");
                    
                    const districtWards = appData.wards;
                    const randomWard = districtWards[Math.floor(Math.random() * districtWards.length)];
                    
                    const pCount = appData.patients.length + 1;
                    const newId = `MCH_${String(pCount).padStart(4, "0")}`;
                    const chw = CHW_IDS[districtWards.indexOf(randomWard)] || "CHW_01_A";
                    
                    const newPatient = {
                        patient_id: newId,
                        district_id: currentDistrictId,
                        name: "Unregistered Sender " + pCount,
                        phone: "Unknown (SMS)",
                        ward_id: randomWard.ward_id,
                        ward_name: randomWard.ward_name,
                        age: 26,
                        gestational_age_weeks: 37,
                        pre_existing_conditions: "None",
                        risk_level: "High",
                        consent_status: "Granted", 
                        contact_preference: "ASHA Visit",
                        latitude: randomWard.center_lat + (Math.random() - 0.5) * 0.006,
                        longitude: randomWard.center_lon + (Math.random() - 0.5) * 0.006,
                        assigned_chw: chw,
                        orig_name: "Unregistered Sender " + pCount,
                        orig_phone: "Unknown (SMS)",
                        sim_reached: true,
                        sim_intervention: "🚨 EMERGENCY: SMS Distress Call",
                        task_completed: false
                    };
                    
                    appData.patients.push(newPatient);
                    
                    const districtPatients = appData.patients.filter(p => p.district_id === currentDistrictId && p.patient_id !== newId);
                    let existingUpgradeMsg = "";
                    if (districtPatients.length > 0) {
                        const randomExisting = districtPatients[Math.floor(Math.random() * districtPatients.length)];
                        randomExisting.risk_level = "High";
                        randomExisting.sim_reached = true;
                        randomExisting.sim_intervention = "🚨 EMERGENCY: Symptom Worsening (SMS)";
                        randomExisting.task_completed = false; 
                        existingUpgradeMsg = `<div style="padding: 8px; background: rgba(245, 158, 11, 0.1); border-left: 3px solid var(--warning);">
                            <strong style="color:var(--warning);">${randomExisting.patient_id} (${randomExisting.name}):</strong> "Feeling very dizzy and vomiting." <br>
                            <span style="color:var(--text-muted); font-size: 10px;">Escalated to HIGH RISK</span>
                        </div>`;
                    }

                    const newPatientMsg = `<div style="padding: 8px; background: rgba(239, 68, 68, 0.1); border-left: 3px solid var(--danger);">
                        <strong style="color:var(--danger);">UNKNOWN SENDER:</strong> "Need help, 9 months pregnant, very hot." <br>
                        <span style="color:var(--text-muted); font-size: 10px;">Auto-registered as ${newId} in ${randomWard.ward_name}</span>
                    </div>`;
                    
                    smsLogList.innerHTML = existingUpgradeMsg + newPatientMsg + smsLogList.innerHTML;
                    
                    showToast("📥 Synced 2 new SMS reports. Task list updated!");
                    
                    updateVitals();
                    renderPatientTable();
                    renderCHWTasks();
                    if (map) renderMapEntities();
                    
                }, 1800);
            });
        }
    }

    // ─────────────────────────────────────────────
    // TOAST NOTIFICATION
    // ─────────────────────────────────────────────
    function showToast(message) {
        let toast = document.getElementById("app-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "app-toast";
            toast.style.cssText = `position:fixed;bottom:2rem;right:2rem;z-index:9999;background:var(--bg-card);border:1px solid var(--primary);color:var(--text-primary);padding:0.9rem 1.4rem;border-radius:10px;font-size:0.9rem;box-shadow:0 8px 32px rgba(0,0,0,0.4);max-width:360px;transition:opacity 0.4s;`;
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.opacity = "1";
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => { toast.style.opacity = "0"; }, 3500);
    }

    // ─────────────────────────────────────────────
    // PATIENT TABLE
    // ─────────────────────────────────────────────
    function renderPatientTable() {
        const tableBody   = document.querySelector("#patient-table tbody");
        tableBody.innerHTML = "";
        const searchQuery = patientSearch.value.toLowerCase();
        const consentVal  = consentFilter.value;

        const districtPatients = appData.patients.filter(p => p.district_id === currentDistrictId);
        const filtered = districtPatients.filter(p => {
            const matchSearch = [p.patient_id, p.name, p.ward_name, p.risk_level]
                .some(v => v.toLowerCase().includes(searchQuery));
            const matchConsent = consentVal === "all" || p.consent_status === consentVal;
            return matchSearch && matchConsent;
        });

        if (filtered.length === 0) {
            const emptyRow = document.createElement("tr");
            emptyRow.innerHTML = `
                <td colspan="9" style="text-align:center;padding:3rem 1rem;color:var(--text-muted);">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:0.7rem;">
                        <span style="font-size:2.5rem;">👩‍⚕️</span>
                        <strong style="color:var(--text-secondary);">${districtPatients.length === 0 ? "No patients registered yet" : "No results match your search"}</strong>
                        <span style="font-size:0.85rem;">${districtPatients.length === 0 ? 'Use the "Register Mother" button on the Dashboard to add patients.' : "Try a different search term or consent filter."}</span>
                    </div>
                </td>
            `;
            tableBody.appendChild(emptyRow);
            return;
        }

        filtered.forEach(p => {
            const tr = document.createElement("tr");
            const withheld = p.consent_status === "Withheld";
            const riskCls  = p.risk_level === "High" ? "badge red" : p.risk_level === "Medium" ? "badge warning" : "badge blue";
            tr.innerHTML = `
                <td><strong>${p.patient_id}</strong></td>
                <td><span class="${withheld ? "redacted" : ""}">${p.name}</span></td>
                <td><span class="${withheld ? "redacted" : ""}">${p.phone}</span></td>
                <td>${p.ward_name}</td>
                <td>${p.gestational_age_weeks} weeks</td>
                <td><span class="${riskCls}">${p.risk_level}</span></td>
                <td>${p.assigned_chw}</td>
                <td><span class="badge ${withheld ? "red" : "green"}">${p.consent_status}</span></td>
                <td><button class="btn ${withheld ? "btn-primary" : "btn-danger"}" data-id="${p.patient_id}">${withheld ? "Grant Consent" : "Withdraw Consent"}</button></td>
            `;
            tr.querySelector("button").addEventListener("click", (e) => {
                togglePatientConsent(e.target.getAttribute("data-id"));
            });
            tableBody.appendChild(tr);
        });
    }

    // ─────────────────────────────────────────────
    // CONSENT TOGGLE
    // ─────────────────────────────────────────────
    function togglePatientConsent(patientId) {
        const p = appData.patients.find(x => x.patient_id === patientId);
        if (!p) return;

        if (p.consent_status === "Granted") {
            p.consent_status = "Withheld";
            p.name     = "REDACTED (Consent Withheld)";
            p.phone    = "REDACTED";
            p.latitude = null;
            p.longitude= null;
        } else {
            p.consent_status = "Granted";
            p.name     = p.orig_name  || "Name on File";
            p.phone    = p.orig_phone || "Phone on File";
            p.latitude = p.orig_lat   || null;
            p.longitude= p.orig_lon   || null;
        }

        updateVitals();
        renderPatientTable();
        runOptimizationModel();
        if (map) renderMapEntities();
        updateMotherPortal();
    }

    // ─────────────────────────────────────────────
    // CHW TASK LIST
    // ─────────────────────────────────────────────
    function renderCHWTasks() {
        const listContainer = document.getElementById("chw-task-list");
        listContainer.innerHTML = "";

        // Show tasks for all patients that have been reached by the model
        const districtPatients = appData.patients.filter(p => p.district_id === currentDistrictId);
        const tasks = districtPatients.filter(p => p.sim_reached);

        if (tasks.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align:center;padding:2.5rem;color:var(--text-muted);">
                    <div style="font-size:2rem;">📋</div>
                    <strong style="display:block;margin:0.5rem 0;">No tasks assigned yet</strong>
                    <span style="font-size:0.85rem;">Register patients and run the Objective Planner to generate field tasks.</span>
                </div>`;
            document.getElementById("task-completed-label").textContent = "0 / 0 Actions Completed";
            document.getElementById("task-progress-bar").style.width = "0%";
            return;
        }

        let completedCount = 0;
        tasks.forEach(p => {
            if (p.task_completed) completedCount++;
        });

        document.getElementById("task-completed-label").textContent = `${completedCount} / ${tasks.length} Actions Completed`;
        document.getElementById("task-progress-bar").style.width = `${tasks.length > 0 ? (completedCount / tasks.length * 100).toFixed(0) : 0}%`;

        tasks.forEach(p => {
            const item = document.createElement("div");
            item.className = "task-card-item";
            if (p.task_completed) item.classList.add("completed");

            const intervention = p.sim_intervention || "SMS Alert";
            let actionLabel = "📞 Telephone Welfare Call";
            let detail      = "Verify hydration status. Recommend cooling shelter if indoor temp >38°C.";
            if (intervention.includes("Cool Kit")) {
                actionLabel = "📦 Deliver Cool Kit + Hydration ORS";
                detail      = "Deliver insulated kit (ORS sachets, cooling towels, thermometer). Verify knowledge of heat-safety guidelines.";
            } else if (intervention.includes("ASHA")) {
                actionLabel = "🩺 ASHA Home Check-in & Vitals";
                detail      = "Measure core temperature, check blood pressure, inspect indoor cooling conditions. Document in registry.";
            } else if (intervention.includes("EMERGENCY")) {
                actionLabel = "🚨 URGENT: Emergency Field Response";
                detail      = "Patient reported severe symptoms via SMS. Immediate vital check and cooling intervention required.";
            }

            const riskCls = p.risk_level === "High" ? "red" : p.risk_level === "Medium" ? "warning" : "blue";

            item.innerHTML = `
                <div class="task-details">
                    <span class="task-desc-lbl">${actionLabel}</span>
                    <p style="font-size:11px;color:var(--text-secondary);margin:4px 0;">
                        <strong>${p.name}</strong> (${p.patient_id}) &mdash;
                        <span class="badge ${riskCls}" style="font-size:10px;">${p.risk_level} Risk</span>
                        &mdash; ${p.ward_name}
                    </p>
                    <p style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">${detail}</p>
                    <div class="task-meta-row">
                        <span class="task-meta-tag">${p.gestational_age_weeks} Wks Gestation</span>
                        <span class="task-meta-tag">${p.contact_preference}</span>
                        <span class="task-meta-tag">${p.assigned_chw}</span>
                    </div>
                </div>
                <div>
                    <button class="btn ${p.task_completed ? 'btn-secondary' : 'btn-primary'} task-done-btn" data-id="${p.patient_id}">
                        ${p.task_completed ? '✓ Completed' : 'Mark Done'}
                    </button>
                </div>
            `;

            item.querySelector(".task-done-btn").addEventListener("click", (e) => {
                const btn = e.target;
                const done = btn.textContent.trim() === "Mark Done";
                p.task_completed = done;
                
                btn.textContent = done ? "✓ Completed" : "Mark Done";
                btn.className   = done ? "btn btn-secondary task-done-btn" : "btn btn-primary task-done-btn";
                item.classList.toggle("completed", done);
                
                completedCount = done ? completedCount + 1 : completedCount - 1;
                document.getElementById("task-completed-label").textContent = `${completedCount} / ${tasks.length} Actions Completed`;
                document.getElementById("task-progress-bar").style.width = `${(completedCount / tasks.length * 100).toFixed(0)}%`;
            });

            listContainer.appendChild(item);
        });
    }

    // ─────────────────────────────────────────────
    // MOTHER PORTAL
    // ─────────────────────────────────────────────
    function updateMotherPortal() {
        const greeting    = document.getElementById("mother-greeting");
        const desc        = document.getElementById("mother-desc");
        const alertBadge  = document.getElementById("mother-alert-badge");
        const consentBox  = document.getElementById("mother-consent-box");
        const toggleBtn   = document.getElementById("mother-toggle-consent-btn");

        // Use the most recently registered patient as the "logged-in" mother
        const districtPatients = appData.patients.filter(p => p.district_id === currentDistrictId);
        const mother = districtPatients.length > 0 ? districtPatients[districtPatients.length - 1] : null;

        if (!mother) {
            alertBadge.textContent  = currentLiveTemp >= 42 ? "🔴 RED HEAT ADVISORY" : currentLiveTemp >= 39 ? "🟡 AMBER ADVISORY" : "🟢 Normal Conditions";
            alertBadge.style.background = currentLiveTemp >= 42 ? "var(--danger)" : currentLiveTemp >= 39 ? "var(--warning)" : "var(--primary)";
            greeting.textContent    = "Patient Portal";
            desc.textContent        = "You are not yet registered. Ask your ASHA worker or use the Dashboard \"Register New Pregnant Mother\" button to create your profile.";
            consentBox.textContent  = "No patient record linked.";
            consentBox.className    = "consent-status-box";
            return;
        }

        const riskMsg = mother.risk_level === "High" ? "🔴 HIGH HEAT RISK" : mother.risk_level === "Medium" ? "🟡 MODERATE RISK" : "🟢 LOW RISK";
        alertBadge.textContent = riskMsg;
        alertBadge.style.background = mother.risk_level === "High" ? "var(--danger)" : mother.risk_level === "Medium" ? "var(--warning)" : "var(--primary)";
        greeting.textContent   = `Hello, ${mother.orig_name || mother.name}`;
        desc.textContent       = `You are in your ${mother.gestational_age_weeks}th week of pregnancy. Current district temperature is ${currentLiveTemp}°C. ${mother.risk_level === "High" ? "You are classified as HIGH RISK — please follow the actions below immediately." : "Please follow standard heat-safety guidelines below."}`;

        if (mother.consent_status === "Granted") {
            consentBox.textContent  = "Active: Consent Granted — ASHA workers can schedule home visits and Cool Kit deliveries.";
            consentBox.className    = "consent-status-box success-bg";
            toggleBtn.textContent   = "Withdraw Direct Sharing & Consent";
            toggleBtn.className     = "btn btn-danger";
        } else {
            consentBox.textContent  = "Active: Consent Withheld — You are receiving broad SMS advisories only. Your exact location is not shared.";
            consentBox.className    = "consent-status-box redacted";
            toggleBtn.textContent   = "Grant Direct Sharing & Support Access";
            toggleBtn.className     = "btn btn-primary";
        }

        // Replace button to avoid stacking event listeners
        const newBtn = toggleBtn.cloneNode(true);
        toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);
        newBtn.addEventListener("click", () => {
            togglePatientConsent(mother.patient_id);
            updateMotherPortal();
        });
    }

    // ─────────────────────────────────────────────
    // LEAFLET GIS MAP
    // ─────────────────────────────────────────────
    function initMap() {
        if (map !== null) { map.invalidateSize(); return; }

        const dist = DISTRICTS[currentDistrictId];
        map = L.map("gis-map").setView([dist.lat, dist.lon], 13);

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 20
        }).addTo(map);

        renderMapWards();
        renderMapEntities();

        document.getElementById("layer-temp").addEventListener("change", (e) => {
            mapLayers.wards.forEach(l => e.target.checked ? l.addTo(map) : map.removeLayer(l));
        });
        document.getElementById("layer-patients").addEventListener("change", (e) => {
            mapLayers.patients.forEach(l => e.target.checked ? l.addTo(map) : map.removeLayer(l));
        });
        document.getElementById("layer-clinics").addEventListener("change", (e) => {
            mapLayers.clinics.forEach(l => e.target.checked ? l.addTo(map) : map.removeLayer(l));
        });
        document.getElementById("layer-cooling-centers").addEventListener("change", (e) => {
            mapLayers.coolingCenters.forEach(l => e.target.checked ? l.addTo(map) : map.removeLayer(l));
        });
    }

    function renderMapWards() {
        mapLayers.wards.forEach(l => map.removeLayer(l));
        mapLayers.wards = [];

        appData.wards.forEach(ward => {
            const v = ward.vulnerability_index;
            const color = v > 0.75 ? "#ef4444" : v > 0.40 ? "#f59e0b" : "#10b981";
            const circle = L.circle([ward.center_lat, ward.center_lon], {
                color, fillColor: color, fillOpacity: 0.18, radius: 900
            }).bindPopup(`
                <div style="font-family:'Inter',sans-serif;min-width:180px;">
                    <h4 style="margin:0 0 6px;color:#fff;">${ward.ward_name} (${ward.ward_id})</h4>
                    <p style="margin:0 0 3px;font-size:11px;">Surface Temp: <strong>${ward.base_temp}°C</strong></p>
                    <p style="margin:0 0 3px;font-size:11px;">Tree Canopy: <strong>${ward.canopy_cover_pct}%</strong></p>
                    <p style="margin:0 0 3px;font-size:11px;">Informal Settlements: <strong>${ward.informal_settlement_pct}%</strong></p>
                    <p style="margin:0;font-size:11px;">Vulnerability Index: <strong style="color:${color};">${ward.vulnerability_index}</strong></p>
                </div>
            `);
            circle.addTo(map);
            mapLayers.wards.push(circle);

            // Clinic marker
            const clinicLat = ward.center_lat + ward.nearest_clinic_distance_km * 0.009;
            const clinicLon = ward.center_lon + ward.nearest_clinic_distance_km * 0.009;
            const clinicIcon = L.divIcon({ html: "🏥", className: "map-emoji-icon", iconSize: [24, 24] });
            const clinicMarker = L.marker([clinicLat, clinicLon], { icon: clinicIcon })
                .bindPopup(`<strong>Maternal Clinic</strong><br>${ward.ward_name}<br>Distance: ${ward.nearest_clinic_distance_km} km`);
            clinicMarker.addTo(map);
            mapLayers.clinics.push(clinicMarker);

            // Cooling centre marker
            const ccLat = ward.center_lat - ward.nearest_cooling_center_distance_km * 0.009;
            const ccLon = ward.center_lon + ward.nearest_cooling_center_distance_km * 0.009;
            const ccIcon = L.divIcon({ html: "🧊", className: "map-emoji-icon", iconSize: [24, 24] });
            const ccMarker = L.marker([ccLat, ccLon], { icon: ccIcon })
                .bindPopup(`<strong>Cooling Shelter</strong><br>${ward.ward_name}<br>Distance: ${ward.nearest_cooling_center_distance_km} km`);
            ccMarker.addTo(map);
            mapLayers.coolingCenters.push(ccMarker);
        });
    }

    function renderMapEntities() {
        mapLayers.patients.forEach(l => map.removeLayer(l));
        mapLayers.patients = [];

        appData.patients.filter(p => p.district_id === currentDistrictId).forEach(p => {
            if (p.consent_status !== "Granted" || !p.latitude || !p.longitude) return;
            const color = p.risk_level === "High" ? "#ef4444" : p.risk_level === "Medium" ? "#f59e0b" : "#10b981";
            const dot = L.circleMarker([p.latitude, p.longitude], {
                radius: 7, color, fillColor: color, fillOpacity: 0.85, weight: 2
            }).bindPopup(`
                <div style="font-family:'Inter',sans-serif;">
                    <strong>${p.patient_id}</strong><br>
                    Risk: <strong style="color:${color};">${p.risk_level}</strong><br>
                    Ward: ${p.ward_name}<br>
                    Gestation: ${p.gestational_age_weeks} weeks<br>
                    ASHA: ${p.assigned_chw}<br>
                    Intervention: ${p.sim_intervention || "Pending"}
                </div>
            `);
            dot.addTo(map);
            mapLayers.patients.push(dot);
        });
    }

    function updateMapInterventions() {
        // Refresh patient pins to reflect updated intervention labels
        renderMapEntities();
    }

    // ─────────────────────────────────────────────
    // BOOT
    // ─────────────────────────────────────────────
    init();
});
