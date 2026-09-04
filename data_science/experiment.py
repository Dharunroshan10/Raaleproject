import os
import json
import pandas as pd
import numpy as np

def load_data():
    wards = pd.read_csv("c:/Users/LENOVO/OneDrive/Desktop/projectralle/data_science/data/wards.csv")
    patients = pd.read_csv("c:/Users/LENOVO/OneDrive/Desktop/projectralle/data_science/data/patients.csv")
    resources = pd.read_csv("c:/Users/LENOVO/OneDrive/Desktop/projectralle/data_science/data/resources.csv")
    return wards, patients, resources

def run_experiment():
    wards, patients, resources = load_data()
    
    # ------------------
    # 1. Baseline Model
    # ------------------
    # Baseline assumes generic public advisories are issued via radio/newspaper.
    # We model a uniform 20% compliance/reach rate across all risk categories.
    np.random.seed(42)
    patients['baseline_reached'] = np.random.choice([True, False], size=len(patients), p=[0.20, 0.80])
    
    # Under baseline, since there's no tracking, consent is not utilized, and there are no direct home visits.
    baseline_high_reached = patients[patients['risk_level'] == 'High']['baseline_reached'].sum()
    baseline_med_reached = patients[patients['risk_level'] == 'Medium']['baseline_reached'].sum()
    baseline_low_reached = patients[patients['risk_level'] == 'Low']['baseline_reached'].sum()
    
    total_baseline_reached = patients['baseline_reached'].sum()
    
    # ------------------------------------
    # 2. Objective A: Maximize Raw Reach
    # ------------------------------------
    # We allocate resources to maximize the number of individuals contacted/reached, 
    # regardless of risk concentration, shifting towards low-cost interventions (like SMS/IVR/Hydration Packs)
    # to stretch the budget and CHW hours.
    
    # We will compute ward-by-ward allocation
    obj_a_allocations = []
    
    # Track resources used for Objective A
    obj_a_total_cost = 0
    obj_a_total_hours = 0
    obj_a_reached_patients = set()
    
    # Define intervention resource needs
    # Cool Kit: cost=150, hours=1.5
    # Hydration Pack: cost=20, hours=0.5
    # SMS: cost=1, hours=0
    # ASHA Visit only: cost=0, hours=1.5
    
    patients['obj_a_reached'] = False
    patients['obj_a_intervention'] = "None"
    
    for ward_id in wards['ward_id']:
        ward_patients = patients[patients['ward_id'] == ward_id].copy()
        ward_res = resources[resources['ward_id'] == ward_id].iloc[0]
        
        budget_limit = ward_res['budget_limit']
        chw_hours_limit = ward_res['chw_hours_available']
        cool_kits_avail = ward_res['cool_kits_capacity']
        hydration_avail = ward_res['hydration_packets_capacity']
        
        # Sort patients to maximize count: Low cost interventions first (Low risk -> Med risk -> High risk)
        # Low risk -> SMS (cost 1, hours 0)
        # Med risk -> Hydration (cost 20, hours 0.5)
        # High risk -> ASHA visit (cost 0, hours 1.5)
        
        ward_patients['sort_order'] = ward_patients['risk_level'].map({'Low': 1, 'Medium': 2, 'High': 3})
        ward_patients = ward_patients.sort_values(by='sort_order')
        
        budget_spent = 0
        hours_spent = 0
        cool_kits_used = 0
        hydration_used = 0
        
        for idx, row in ward_patients.iterrows():
            p_id = row['patient_id']
            risk = row['risk_level']
            consent = row['consent_status']
            
            # SMS is always possible if they have a phone, very cheap, no CHW hours
            if risk == 'Low':
                if budget_spent + 1 <= budget_limit:
                    budget_spent += 1
                    patients.loc[patients['patient_id'] == p_id, 'obj_a_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'obj_a_intervention'] = 'SMS Alert'
            
            elif risk == 'Medium':
                # Try Hydration pack first as it is cheaper and requires fewer CHW hours
                if hydration_used < hydration_avail and budget_spent + 20 <= budget_limit and hours_spent + 0.5 <= chw_hours_limit:
                    hydration_used += 1
                    budget_spent += 20
                    hours_spent += 0.5
                    patients.loc[patients['patient_id'] == p_id, 'obj_a_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'obj_a_intervention'] = 'Hydration Pack'
                # Fallback to SMS if constraints hit
                elif budget_spent + 1 <= budget_limit:
                    budget_spent += 1
                    patients.loc[patients['patient_id'] == p_id, 'obj_a_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'obj_a_intervention'] = 'SMS Alert'
            
            elif risk == 'High':
                # High risk requires direct contact. If they granted consent, try ASHA Home Visit
                if consent == 'Granted' and hours_spent + 1.5 <= chw_hours_limit:
                    hours_spent += 1.5
                    patients.loc[patients['patient_id'] == p_id, 'obj_a_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'obj_a_intervention'] = 'ASHA Visit'
                # If they didn't grant consent or no hours, try SMS if budget permits
                elif budget_spent + 1 <= budget_limit:
                    budget_spent += 1
                    patients.loc[patients['patient_id'] == p_id, 'obj_a_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'obj_a_intervention'] = 'SMS Alert'
        
        obj_a_total_cost += budget_spent
        obj_a_total_hours += hours_spent
        
    # -------------------------------------------------------------
    # 3. Objective B: Prioritize Vulnerability (Equity-First Allocation)
    # -------------------------------------------------------------
    # Prioritizes High-Risk patients in the hottest/most vulnerable wards, 
    # giving them comprehensive Cool Kits + ASHA visits, before supporting Medium/Low risk.
    
    patients['obj_b_reached'] = False
    patients['obj_b_intervention'] = "None"
    
    obj_b_total_cost = 0
    obj_b_total_hours = 0
    
    for ward_id in wards['ward_id']:
        ward_patients = patients[patients['ward_id'] == ward_id].copy()
        ward_res = resources[resources['ward_id'] == ward_id].iloc[0]
        
        budget_limit = ward_res['budget_limit']
        chw_hours_limit = ward_res['chw_hours_available']
        cool_kits_avail = ward_res['cool_kits_capacity']
        hydration_avail = ward_res['hydration_packets_capacity']
        
        # Sort by Risk Level DESC (High -> Medium -> Low)
        ward_patients['sort_order'] = ward_patients['risk_level'].map({'High': 1, 'Medium': 2, 'Low': 3})
        ward_patients = ward_patients.sort_values(by='sort_order')
        
        budget_spent = 0
        hours_spent = 0
        cool_kits_used = 0
        hydration_used = 0
        
        for idx, row in ward_patients.iterrows():
            p_id = row['patient_id']
            risk = row['risk_level']
            consent = row['consent_status']
            
            if risk == 'High':
                # Try ASHA Visit + Cool Kit (Premium service for high risk in hot zone)
                if consent == 'Granted' and cool_kits_used < cool_kits_avail and budget_spent + 150 <= budget_limit and hours_spent + 1.5 <= chw_hours_limit:
                    cool_kits_used += 1
                    budget_spent += 150
                    hours_spent += 1.5
                    patients.loc[patients['patient_id'] == p_id, 'obj_b_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'obj_b_intervention'] = 'Cool Kit + ASHA Visit'
                # Fallback to ASHA Visit only if cool kits run out
                elif consent == 'Granted' and hours_spent + 1.5 <= chw_hours_limit:
                    hours_spent += 1.5
                    patients.loc[patients['patient_id'] == p_id, 'obj_b_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'obj_b_intervention'] = 'ASHA Visit'
                # Fallback to SMS if no hours/consent but budget exists
                elif budget_spent + 1 <= budget_limit:
                    budget_spent += 1
                    patients.loc[patients['patient_id'] == p_id, 'obj_b_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'obj_b_intervention'] = 'SMS Alert'
                    
            elif risk == 'Medium':
                # Try Cool Kit or Hydration Pack
                if cool_kits_used < cool_kits_avail and budget_spent + 150 <= budget_limit and hours_spent + 1.5 <= chw_hours_limit:
                    cool_kits_used += 1
                    budget_spent += 150
                    hours_spent += 1.5
                    patients.loc[patients['patient_id'] == p_id, 'obj_b_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'obj_b_intervention'] = 'Cool Kit'
                elif hydration_used < hydration_avail and budget_spent + 20 <= budget_limit and hours_spent + 0.5 <= chw_hours_limit:
                    hydration_used += 1
                    budget_spent += 20
                    hours_spent += 0.5
                    patients.loc[patients['patient_id'] == p_id, 'obj_b_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'obj_b_intervention'] = 'Hydration Pack'
                elif budget_spent + 1 <= budget_limit:
                    budget_spent += 1
                    patients.loc[patients['patient_id'] == p_id, 'obj_b_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'obj_b_intervention'] = 'SMS Alert'
                    
            elif risk == 'Low':
                if budget_spent + 1 <= budget_limit:
                    budget_spent += 1
                    patients.loc[patients['patient_id'] == p_id, 'obj_b_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'obj_b_intervention'] = 'SMS Alert'
                    
        obj_b_total_cost += budget_spent
        obj_b_total_hours += hours_spent

    # -------------------------------------------------------------
    # 4. Authorized Override Scenario: Increase ASHA Hours by 30%
    # -------------------------------------------------------------
    # In extreme heat waves, management can override constraints to authorize overtime.
    # We apply this override to Objective B to see how many more High-Risk mothers are covered.
    
    patients['override_reached'] = False
    patients['override_intervention'] = "None"
    
    override_total_cost = 0
    override_total_hours = 0
    
    for ward_id in wards['ward_id']:
        ward_patients = patients[patients['ward_id'] == ward_id].copy()
        ward_res = resources[resources['ward_id'] == ward_id].iloc[0]
        
        budget_limit = ward_res['budget_limit']
        # AUTHORIZED OVERRIDE: +30% CHW Hours capacity
        chw_hours_limit = ward_res['chw_hours_available'] * 1.30
        cool_kits_avail = ward_res['cool_kits_capacity']
        hydration_avail = ward_res['hydration_packets_capacity']
        
        ward_patients['sort_order'] = ward_patients['risk_level'].map({'High': 1, 'Medium': 2, 'Low': 3})
        ward_patients = ward_patients.sort_values(by='sort_order')
        
        budget_spent = 0
        hours_spent = 0
        cool_kits_used = 0
        hydration_used = 0
        
        for idx, row in ward_patients.iterrows():
            p_id = row['patient_id']
            risk = row['risk_level']
            consent = row['consent_status']
            
            if risk == 'High':
                if consent == 'Granted' and cool_kits_used < cool_kits_avail and budget_spent + 150 <= budget_limit and hours_spent + 1.5 <= chw_hours_limit:
                    cool_kits_used += 1
                    budget_spent += 150
                    hours_spent += 1.5
                    patients.loc[patients['patient_id'] == p_id, 'override_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'override_intervention'] = 'Cool Kit + ASHA Visit'
                elif consent == 'Granted' and hours_spent + 1.5 <= chw_hours_limit:
                    hours_spent += 1.5
                    patients.loc[patients['patient_id'] == p_id, 'override_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'override_intervention'] = 'ASHA Visit'
                elif budget_spent + 1 <= budget_limit:
                    budget_spent += 1
                    patients.loc[patients['patient_id'] == p_id, 'override_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'override_intervention'] = 'SMS Alert'
                    
            elif risk == 'Medium':
                if cool_kits_used < cool_kits_avail and budget_spent + 150 <= budget_limit and hours_spent + 1.5 <= chw_hours_limit:
                    cool_kits_used += 1
                    budget_spent += 150
                    hours_spent += 1.5
                    patients.loc[patients['patient_id'] == p_id, 'override_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'override_intervention'] = 'Cool Kit'
                elif hydration_used < hydration_avail and budget_spent + 20 <= budget_limit and hours_spent + 0.5 <= chw_hours_limit:
                    hydration_used += 1
                    budget_spent += 20
                    hours_spent += 0.5
                    patients.loc[patients['patient_id'] == p_id, 'override_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'override_intervention'] = 'Hydration Pack'
                elif budget_spent + 1 <= budget_limit:
                    budget_spent += 1
                    patients.loc[patients['patient_id'] == p_id, 'override_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'override_intervention'] = 'SMS Alert'
                    
            elif risk == 'Low':
                if budget_spent + 1 <= budget_limit:
                    budget_spent += 1
                    patients.loc[patients['patient_id'] == p_id, 'override_reached'] = True
                    patients.loc[patients['patient_id'] == p_id, 'override_intervention'] = 'SMS Alert'
                    
        override_total_cost += budget_spent
        override_total_hours += hours_spent

    # ------------------
    # Analysis & Report
    # ------------------
    total_patients = len(patients)
    high_risk_patients = len(patients[patients['risk_level'] == 'High'])
    med_risk_patients = len(patients[patients['risk_level'] == 'Medium'])
    low_risk_patients = len(patients[patients['risk_level'] == 'Low'])
    
    # Calculate reach rates
    def stats_for_scenario(column_reached, column_intervention):
        total_r = patients[column_reached].sum()
        high_r = patients[(patients['risk_level'] == 'High') & patients[column_reached]].shape[0]
        med_r = patients[(patients['risk_level'] == 'Medium') & patients[column_reached]].shape[0]
        low_r = patients[(patients['risk_level'] == 'Low') & patients[column_reached]].shape[0]
        
        asha_visits = patients[patients[column_intervention].str.contains('ASHA', na=False)].shape[0]
        cool_kits = patients[patients[column_intervention].str.contains('Cool Kit', na=False)].shape[0]
        hydration = patients[patients[column_intervention].str.contains('Hydration', na=False)].shape[0]
        sms = patients[patients[column_intervention].str.contains('SMS', na=False)].shape[0]
        
        return {
            "total_reached": int(total_r),
            "reach_rate_pct": round(total_r / total_patients * 100, 1),
            "high_reached": int(high_r),
            "high_reach_rate_pct": round(high_r / high_risk_patients * 100, 1) if high_risk_patients > 0 else 0,
            "med_reached": int(med_r),
            "med_reach_rate_pct": round(med_r / med_risk_patients * 100, 1) if med_risk_patients > 0 else 0,
            "low_reached": int(low_r),
            "low_reach_rate_pct": round(low_r / low_risk_patients * 100, 1) if low_risk_patients > 0 else 0,
            "asha_visits_delivered": int(asha_visits),
            "cool_kits_delivered": int(cool_kits),
            "hydration_packets_delivered": int(hydration),
            "sms_delivered": int(sms)
        }
        
    baseline_stats = {
        "total_reached": int(total_baseline_reached),
        "reach_rate_pct": round(total_baseline_reached / total_patients * 100, 1),
        "high_reached": int(baseline_high_reached),
        "high_reach_rate_pct": round(baseline_high_reached / high_risk_patients * 100, 1),
        "med_reached": int(baseline_med_reached),
        "med_reach_rate_pct": round(baseline_med_reached / med_risk_patients * 100, 1),
        "low_reached": int(baseline_low_reached),
        "low_reach_rate_pct": round(baseline_low_reached / low_risk_patients * 100, 1),
        "asha_visits_delivered": 0,
        "cool_kits_delivered": 0,
        "hydration_packets_delivered": 0,
        "sms_delivered": 0 # Baseline is broad broadcast, not targeted sms
    }
    
    obj_a_stats = stats_for_scenario('obj_a_reached', 'obj_a_intervention')
    obj_a_stats['total_cost'] = float(obj_a_total_cost)
    obj_a_stats['total_hours'] = float(obj_a_total_hours)
    
    obj_b_stats = stats_for_scenario('obj_b_reached', 'obj_b_intervention')
    obj_b_stats['total_cost'] = float(obj_b_total_cost)
    obj_b_stats['total_hours'] = float(obj_b_total_hours)
    
    override_stats = stats_for_scenario('override_reached', 'override_intervention')
    override_stats['total_cost'] = float(override_total_cost)
    override_stats['total_hours'] = float(override_total_hours)
    
    report = {
        "summary": {
            "total_patients": total_patients,
            "high_risk_patients": high_risk_patients,
            "med_risk_patients": med_risk_patients,
            "low_risk_patients": low_risk_patients
        },
        "scenarios": {
            "baseline": baseline_stats,
            "objective_a_max_reach": obj_a_stats,
            "objective_b_equity_vulnerability": obj_b_stats,
            "override_scenario": override_stats
        }
    }
    
    # Save experiment outputs
    os.makedirs("c:/Users/LENOVO/OneDrive/Desktop/projectralle/data_science/results", exist_ok=True)
    with open("c:/Users/LENOVO/OneDrive/Desktop/projectralle/data_science/results/experiment_results.json", "w") as f:
        json.dump(report, f, indent=2)
        
    # Print markdown table summary for documentation
    print("### Mathematical Experiment Results Summary")
    print("| Metric | Baseline (Broad Advisory) | Obj A (Max Raw Reach) | Obj B (Vulnerability Priority) | Obj B + Authorized Override (+30% Hours) |")
    print("| :--- | :---: | :---: | :---: | :---: |")
    print(f"| **Total Reached** | {baseline_stats['total_reached']} ({baseline_stats['reach_rate_pct']}%) | {obj_a_stats['total_reached']} ({obj_a_stats['reach_rate_pct']}%) | {obj_b_stats['total_reached']} ({obj_b_stats['reach_rate_pct']}%) | {override_stats['total_reached']} ({override_stats['reach_rate_pct']}%) |")
    print(f"| **High-Risk Reached** | {baseline_stats['high_reached']} ({baseline_stats['high_reach_rate_pct']}%) | {obj_a_stats['high_reached']} ({obj_a_stats['high_reach_rate_pct']}%) | {obj_b_stats['high_reached']} ({obj_b_stats['high_reach_rate_pct']}%) | {override_stats['high_reached']} ({override_stats['high_reach_rate_pct']}%) |")
    print(f"| **Medium-Risk Reached** | {baseline_stats['med_reached']} ({baseline_stats['med_reach_rate_pct']}%) | {obj_a_stats['med_reached']} ({obj_a_stats['med_reach_rate_pct']}%) | {obj_b_stats['med_reached']} ({obj_b_stats['med_reach_rate_pct']}%) | {override_stats['med_reached']} ({override_stats['med_reach_rate_pct']}%) |")
    print(f"| **Low-Risk Reached** | {baseline_stats['low_reached']} ({baseline_stats['low_reach_rate_pct']}%) | {obj_a_stats['low_reached']} ({obj_a_stats['low_reach_rate_pct']}%) | {obj_b_stats['low_reached']} ({obj_b_stats['low_reach_rate_pct']}%) | {override_stats['low_reached']} ({override_stats['low_reach_rate_pct']}%) |")
    print(f"| **ASHA Visits** | 0 | {obj_a_stats['asha_visits_delivered']} | {obj_b_stats['asha_visits_delivered']} | {override_stats['asha_visits_delivered']} |")
    print(f"| **Cool Kits** | 0 | {obj_a_stats['cool_kits_delivered']} | {obj_b_stats['cool_kits_delivered']} | {override_stats['cool_kits_delivered']} |")
    print(f"| **Hydration Pack** | 0 | {obj_a_stats['hydration_packets_delivered']} | {obj_b_stats['hydration_packets_delivered']} | {override_stats['hydration_packets_delivered']} |")
    print(f"| **SMS Sent** | 0 | {obj_a_stats['sms_delivered']} | {obj_b_stats['sms_delivered']} | {override_stats['sms_delivered']} |")
    print(f"| **Total Financial Cost** | 0 | INR {obj_a_stats['total_cost']:.2f} | INR {obj_b_stats['total_cost']:.2f} | INR {override_stats['total_cost']:.2f} |")
    print(f"| **ASHA Hours Used** | 0 hrs | {obj_a_stats['total_hours']:.1f} hrs | {obj_b_stats['total_hours']:.1f} hrs | {override_stats['total_hours']:.1f} hrs |")
    
    # Save the patients df with decisions to view in app
    patients.to_csv("c:/Users/LENOVO/OneDrive/Desktop/projectralle/data_science/data/patients_with_decisions.csv", index=False)
    # Also save as JSON
    with open("c:/Users/LENOVO/OneDrive/Desktop/projectralle/data_science/data/synthetic_data_decisions.json", "w") as f:
        # Convert df to dictionary
        decisions_json = {
            "summary": report["summary"],
            "scenarios": report["scenarios"],
            "patients": patients.to_dict(orient="records"),
            "wards": wards.to_dict(orient="records"),
            "resources": resources.to_dict(orient="records")
        }
        json.dump(decisions_json, f, indent=2)

if __name__ == "__main__":
    run_experiment()
