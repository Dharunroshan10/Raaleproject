import os
import json
import random
import pandas as pd
import numpy as np

# Set random seed for reproducibility
random.seed(42)
np.random.seed(42)

# Define wards/neighborhoods (based on a fictional district "Vasantapuram" in Ahmedabad region)
wards_data = [
    {"ward_id": "W01", "ward_name": "Vasant Vihar", "center_lat": 23.0225, "center_lon": 72.5714, "canopy_cover_pct": 28, "building_density_pct": 45, "albedo_index": 0.35, "informal_settlement_pct": 12, "nearest_clinic_distance_km": 0.8, "nearest_cooling_center_distance_km": 1.2, "chw_density_per_100_patients": 4.5, "base_temp": 38.2},
    {"ward_id": "W02", "ward_name": "Nehru Nagar", "center_lat": 23.0301, "center_lon": 72.5605, "canopy_cover_pct": 15, "building_density_pct": 70, "albedo_index": 0.22, "informal_settlement_pct": 35, "nearest_clinic_distance_km": 1.5, "nearest_cooling_center_distance_km": 0.9, "chw_density_per_100_patients": 3.0, "base_temp": 41.5},
    {"ward_id": "W03", "ward_name": "Shastri Nagar", "center_lat": 23.0422, "center_lon": 72.5851, "canopy_cover_pct": 8, "building_density_pct": 85, "albedo_index": 0.15, "informal_settlement_pct": 65, "nearest_clinic_distance_km": 2.4, "nearest_cooling_center_distance_km": 3.1, "chw_density_per_100_patients": 1.5, "base_temp": 44.2},
    {"ward_id": "W04", "ward_name": "Rajendra Ward", "center_lat": 23.0110, "center_lon": 72.5920, "canopy_cover_pct": 18, "building_density_pct": 60, "albedo_index": 0.28, "informal_settlement_pct": 20, "nearest_clinic_distance_km": 1.1, "nearest_cooling_center_distance_km": 1.5, "chw_density_per_100_patients": 3.5, "base_temp": 40.1},
    {"ward_id": "W05", "ward_name": "Ganga Nagar Slums", "center_lat": 23.0530, "center_lon": 72.5510, "canopy_cover_pct": 3, "building_density_pct": 92, "albedo_index": 0.12, "informal_settlement_pct": 80, "nearest_clinic_distance_km": 3.2, "nearest_cooling_center_distance_km": 4.0, "chw_density_per_100_patients": 1.0, "base_temp": 45.8},
    {"ward_id": "W06", "ward_name": "Subhash Ward", "center_lat": 23.0015, "center_lon": 72.5450, "canopy_cover_pct": 22, "building_density_pct": 50, "albedo_index": 0.30, "informal_settlement_pct": 15, "nearest_clinic_distance_km": 0.9, "nearest_cooling_center_distance_km": 2.0, "chw_density_per_100_patients": 4.0, "base_temp": 39.0},
    {"ward_id": "W07", "ward_name": "Indira Nagar", "center_lat": 23.0640, "center_lon": 72.5730, "canopy_cover_pct": 11, "building_density_pct": 78, "albedo_index": 0.18, "informal_settlement_pct": 55, "nearest_clinic_distance_km": 1.8, "nearest_cooling_center_distance_km": 2.5, "chw_density_per_100_patients": 2.2, "base_temp": 43.1},
    {"ward_id": "W08", "ward_name": "Tilak Colony", "center_lat": 22.9890, "center_lon": 72.5680, "canopy_cover_pct": 25, "building_density_pct": 40, "albedo_index": 0.33, "informal_settlement_pct": 8, "nearest_clinic_distance_km": 0.5, "nearest_cooling_center_distance_km": 1.0, "chw_density_per_100_patients": 5.0, "base_temp": 38.0},
    {"ward_id": "W09", "ward_name": "Prasad Nagar", "center_lat": 23.0350, "center_lon": 72.6110, "canopy_cover_pct": 13, "building_density_pct": 72, "albedo_index": 0.20, "informal_settlement_pct": 48, "nearest_clinic_distance_km": 2.1, "nearest_cooling_center_distance_km": 2.8, "chw_density_per_100_patients": 2.5, "base_temp": 42.6},
    {"ward_id": "W10", "ward_name": "Vivekananda Ward", "center_lat": 23.0280, "center_lon": 72.5310, "canopy_cover_pct": 30, "building_density_pct": 35, "albedo_index": 0.40, "informal_settlement_pct": 5, "nearest_clinic_distance_km": 0.7, "nearest_cooling_center_distance_km": 0.8, "chw_density_per_100_patients": 5.5, "base_temp": 37.5}
]

# Calculate composite maternal heat-risk vulnerability index for wards
df_wards = pd.DataFrame(wards_data)
df_wards['norm_temp'] = (df_wards['base_temp'] - 37.0) / (46.0 - 37.0)
df_wards['norm_density'] = df_wards['building_density_pct'] / 100.0
df_wards['norm_canopy'] = 1.0 - (df_wards['canopy_cover_pct'] / 100.0)
df_wards['norm_informal'] = df_wards['informal_settlement_pct'] / 100.0
df_wards['norm_clinic'] = (df_wards['nearest_clinic_distance_km'] - 0.5) / (3.5 - 0.5)
df_wards['norm_chw'] = 1.0 - ((df_wards['chw_density_per_100_patients'] - 1.0) / (5.5 - 1.0))

# Weight sum to get aggregate vulnerability index
df_wards['vulnerability_index'] = (
    df_wards['norm_temp'] * 0.30 +
    df_wards['norm_density'] * 0.15 +
    df_wards['norm_canopy'] * 0.15 +
    df_wards['norm_informal'] * 0.20 +
    df_wards['norm_clinic'] * 0.10 +
    df_wards['norm_chw'] * 0.10
)

# Normalize vulnerability_index between 0.1 and 0.95
min_v = df_wards['vulnerability_index'].min()
max_v = df_wards['vulnerability_index'].max()
df_wards['vulnerability_index'] = 0.1 + 0.85 * (df_wards['vulnerability_index'] - min_v) / (max_v - min_v)
df_wards['vulnerability_index'] = df_wards['vulnerability_index'].round(2)

# Drop normalized temp variables before saving
clean_wards = df_wards.drop(columns=['norm_temp', 'norm_density', 'norm_canopy', 'norm_informal', 'norm_clinic', 'norm_chw'])

# Generate synthetic patients (pregnant women / mothers)
n_patients = 200
patient_list = []
pre_existing_probs = ["None", "Hypertension", "Anemia", "Gestational Diabetes", "Multiple"]
contact_prefs = ["SMS Alert", "Voice IVR", "ASHA Visit"]

# ASHA worker IDs mapped to Wards
chws_per_ward = {
    "W01": ["CHW_01_A", "CHW_01_B"],
    "W02": ["CHW_02_A"],
    "W03": ["CHW_03_A"],
    "W04": ["CHW_04_A", "CHW_04_B"],
    "W05": ["CHW_05_A"],
    "W06": ["CHW_06_A", "CHW_06_B"],
    "W07": ["CHW_07_A"],
    "W08": ["CHW_08_A", "CHW_08_B", "CHW_08_C"],
    "W09": ["CHW_09_A"],
    "W10": ["CHW_10_A", "CHW_10_B", "CHW_10_C"]
}

ward_weights = [0.08, 0.12, 0.18, 0.08, 0.22, 0.08, 0.10, 0.04, 0.08, 0.02]

for i in range(1, n_patients + 1):
    p_id = f"MCH_{i:04d}"
    ward = np.random.choice(clean_wards['ward_id'].values, p=ward_weights)
    ward_info = clean_wards[clean_wards['ward_id'] == ward].iloc[0]
    
    age = int(np.random.normal(26, 5))
    age = max(18, min(45, age))
    
    gestational_age = int(np.random.randint(4, 41))
    
    pre_existing = np.random.choice(pre_existing_probs, p=[0.60, 0.15, 0.15, 0.08, 0.02])
    
    risk_score = 0.0
    if gestational_age >= 28:
        risk_score += 0.3
    if pre_existing != "None":
        risk_score += 0.25
        if pre_existing == "Multiple":
            risk_score += 0.15
    risk_score += float(ward_info['vulnerability_index']) * 0.4
    
    if risk_score > 0.65:
        risk_level = "High"
    elif risk_score > 0.4:
        risk_level = "Medium"
    else:
        risk_level = "Low"
        
    consent = np.random.choice(["Granted", "Withheld"], p=[0.85, 0.15])
    
    lat_offset = np.random.normal(0, 0.003)
    lon_offset = np.random.normal(0, 0.003)
    
    first_names = ["Anjali", "Priya", "Sunita", "Deepika", "Kiran", "Meena", "Renu", "Pooja", "Aasha", "Kavita", "Jyoti", "Lata", "Rekha", "Sita", "Geeta"]
    last_names = ["Patel", "Sharma", "Verma", "Joshi", "Choudhary", "Mehta", "Shah", "Yadav", "Gupta", "Mishra", "Solanki", "Rathod", "Parmar"]
    name = f"{random.choice(first_names)} {random.choice(last_names)}"
    phone = f"+91 98765 {random.randint(10000, 99999)}"
    
    if consent == "Withheld":
        masked_name = "REDACTED (Consent Withheld)"
        masked_phone = "REDACTED"
        lat = None
        lon = None
    else:
        masked_name = name
        masked_phone = phone
        lat = round(float(ward_info['center_lat']) + lat_offset, 6)
        lon = round(float(ward_info['center_lon']) + lon_offset, 6)
        
    contact_pref = np.random.choice(contact_prefs, p=[0.50, 0.30, 0.20])
    if risk_level == "High" and consent == "Granted":
        contact_pref = "ASHA Visit"
        
    assigned_chw = random.choice(chws_per_ward[ward])
    
    patient_list.append({
        "patient_id": p_id,
        "name": masked_name,
        "phone": masked_phone,
        "ward_id": ward,
        "ward_name": ward_info['ward_name'],
        "age": age,
        "gestational_age_weeks": gestational_age,
        "pre_existing_conditions": pre_existing,
        "risk_level": risk_level,
        "consent_status": consent,
        "contact_preference": contact_pref,
        "latitude": lat,
        "longitude": lon,
        "assigned_chw": assigned_chw
    })

df_patients = pd.DataFrame(patient_list)

resources_data = []
for idx, ward in enumerate(clean_wards['ward_id'].values):
    ward_info = clean_wards[clean_wards['ward_id'] == ward].iloc[0]
    vuln = ward_info['vulnerability_index']
    
    budget_limit = 5000
    
    chw_count = len(chws_per_ward[ward])
    chw_hours_avail = chw_count * 40
    
    cool_kits_capacity = int(15 + (1.0 - vuln) * 30)
    hydration_packets_capacity = int(50 + (1.0 - vuln) * 100)
    
    resources_data.append({
        "ward_id": ward,
        "ward_name": ward_info['ward_name'],
        "budget_limit": budget_limit,
        "chw_hours_available": chw_hours_avail,
        "cool_kits_capacity": cool_kits_capacity,
        "hydration_packets_capacity": hydration_packets_capacity,
        "cool_kit_unit_cost": 150,
        "hydration_packet_cost": 20,
        "cool_kit_chw_hours": 1.5,
        "hydration_packet_chw_hours": 0.5
    })

df_resources = pd.DataFrame(resources_data)

# Create Output Folder inside data_science/data
os.makedirs("c:/Users/LENOVO/OneDrive/Desktop/projectralle/data_science/data", exist_ok=True)

# Save to CSV
clean_wards.to_csv("c:/Users/LENOVO/OneDrive/Desktop/projectralle/data_science/data/wards.csv", index=False)
df_patients.to_csv("c:/Users/LENOVO/OneDrive/Desktop/projectralle/data_science/data/patients.csv", index=False)
df_resources.to_csv("c:/Users/LENOVO/OneDrive/Desktop/projectralle/data_science/data/resources.csv", index=False)

# Save to JSON
data_json = {
    "wards": clean_wards.to_dict(orient="records"),
    "patients": df_patients.to_dict(orient="records"),
    "resources": df_resources.to_dict(orient="records")
}

with open("c:/Users/LENOVO/OneDrive/Desktop/projectralle/data_science/data/synthetic_data.json", "w") as f:
    json.dump(data_json, f, indent=2)

print("Data generation complete!")
print(f"Generated {len(clean_wards)} wards.")
print(f"Generated {len(df_patients)} patients (Consent Granted: {len(df_patients[df_patients['consent_status'] == 'Granted'])}, Withheld: {len(df_patients[df_patients['consent_status'] == 'Withheld'])}).")
print(f"Generated resource records for {len(df_resources)} wards.")
