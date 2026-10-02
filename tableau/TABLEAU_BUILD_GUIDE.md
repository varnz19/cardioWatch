# CardioWatch: Step-by-Step Tableau Dashboard Build Guide

This guide walks you through importing the generated CSV files into **Tableau Desktop** (or **Tableau Public**) and building the 4 interactive monitoring dashboards.

---

## 1. Connecting Data Sources in Tableau

1. Open Tableau Desktop / Tableau Public.
2. Under **Connect** -> **To a File**, select **Text file**.
3. Navigate to `data/processed/patient_records_longitudinal.csv` and click **Open**.
4. To add the auxiliary KPI and drift tables:
   - Click **Add** next to Connections.
   - Add `monthly_performance_kpis.csv`, `feature_drift_metrics.csv`, and `subgroup_fairness_audit.csv`.
   - In Tableau's Logical Data Model canvas, establish relationships using:
     - `patient_records_longitudinal` relates to `monthly_performance_kpis` on:
       `[time_period] = [time_period]`
     - `patient_records_longitudinal` relates to `subgroup_fairness_audit` on:
       `[time_period] = [time_period]` AND `[sex_desc] = [subgroup]`
   - *(Alternative simpler method for college lab: Use each CSV as its own clean Data Source on separate sheets!)*

---

## 2. Calculated Fields Reference (Copy & Paste)

Create these calculated fields in Tableau (`Analysis` -> `Create Calculated Field`):

### Field 1: `Error Classification Label`
```tableau
IF [target] = 1 AND [predicted_outcome] = 1 THEN "True Positive (TP)"
ELSEIF [target] = 0 AND [predicted_outcome] = 0 THEN "True Negative (TN)"
ELSEIF [target] = 0 AND [predicted_outcome] = 1 THEN "False Positive (FP)"
ELSEIF [target] = 1 AND [predicted_outcome] = 0 THEN "False Negative (FN)"
END
```

### Field 2: `Clinical Drift Severity Color`
```tableau
IF [drift_score] >= 0.20 THEN "Critical High Drift"
ELSEIF [drift_score] >= 0.10 THEN "Warning Medium Drift"
ELSE "Normal Low Drift"
END
```

### Field 3: `Calculated Recall` (From Patient Table)
```tableau
ZN(SUM(IF [target] = 1 AND [predicted_outcome] = 1 THEN 1 ELSE 0 END))
/
ZN(SUM(IF [target] = 1 THEN 1 ELSE 0 END))
```

### Field 4: `Calculated FNR`
```tableau
1.0 - [Calculated Recall]
```

### Field 5: `LOD Male Recall`
```tableau
{ FIXED [time_period] : 
    SUM(IF [sex_desc] = "Male" AND [target] = 1 AND [predicted_outcome] = 1 THEN 1 ELSE 0 END) 
    / 
    SUM(IF [sex_desc] = "Male" AND [target] = 1 THEN 1 ELSE 0 END) 
}
```

### Field 6: `LOD Female Recall`
```tableau
{ FIXED [time_period] : 
    SUM(IF [sex_desc] = "Female" AND [target] = 1 AND [predicted_outcome] = 1 THEN 1 ELSE 0 END) 
    / 
    SUM(IF [sex_desc] = "Female" AND [target] = 1 THEN 1 ELSE 0 END) 
}
```

### Field 7: `LOD Gender Disparity Gap`
```tableau
ABS([LOD_Male_Recall] - [LOD_Female_Recall])
```

---

## 3. Building the 4 Dashboards

### Dashboard 1: Model Performance & Diagnostic Error
* **Data Source:** `monthly_performance_kpis.csv` & `patient_records_longitudinal.csv`
1. **Sheet 1 — Top KPI Cards:**
   - Drag `Measure Values` to Text. Filter to `accuracy`, `recall`, `precision`, `fnr`.
   - Format as Cards with large numbers (24pt font).
2. **Sheet 2 — Accuracy & Sensitivity Trajectory:**
   - Columns: `time_period` (sort by `month_index`).
   - Rows: `Measure Values` (`accuracy`, `recall`, `fnr`).
   - Marks: Line chart with points.
   - Analytics Pane: Add Constant Line at `0.80` (Green dashed) and `0.20` (Red dashed).
3. **Sheet 3 — Normalized Confusion Matrix:**
   - Columns: `predicted_outcome` (0 vs 1).
   - Rows: `target` (0 vs 1).
   - Text: `Number of Records` / Count.
   - Color: `Error Classification Label` (Blue for TP/TN, Orange/Red for FP/FN).
4. **Sheet 4 — Diagnostic Error Breakdown:**
   - Columns: `error_classification` filtered to `False Negative` and `False Positive`.
   - Rows: `sex_desc` or `age_group`.
   - Color: `error_classification`.

---

### Dashboard 2: Population & Feature Drift Monitoring
* **Data Source:** `feature_drift_metrics.csv`
1. **Sheet 1 — Drift Score Matrix (Heatmap):**
   - Columns: `time_period` (Month 1 to Month 5).
   - Rows: `feature_name`.
   - Color: `drift_score` (Palette: Red-Yellow-Green Diverging, reversed, Center: 0.15).
   - Label: `drift_score`.
2. **Sheet 2 — Feature Distribution Comparison (KDE / Histogram):**
   - Switch to `patient_records_longitudinal.csv`.
   - Columns: `chol` (or `trestbps`, `age`).
   - Rows: `CNT(patient_records)`.
   - Color: `time_period` (Filtered to compare Month 0 vs Month 4 or 5).
3. **Sheet 3 — Biomarker Mean Shift Trajectory:**
   - Columns: `time_period`.
   - Rows: `current_mean`.
   - Filter: `feature_name` (Single value dropdown).

---

### Dashboard 3: Demographic Subgroup Fairness Audit
* **Data Source:** `subgroup_fairness_audit.csv`
1. **Sheet 1 — Sex Recall Disparity (Dumbbell Chart / Connected Dots):**
   - Filter `attribute_type` = `Biological Sex`.
   - Columns: `group_recall`.
   - Rows: `time_period`.
   - Color / Detail: `subgroup` (Male = Blue, Female = Orange).
2. **Sheet 2 — Clinical False Negative Rate by Sex:**
   - Filter `attribute_type` = `Biological Sex`.
   - Columns: `time_period`.
   - Rows: `group_fnr`.
   - Color: `subgroup`.
   - Reference line at `0.20` (Max Tolerable FNR).
3. **Sheet 3 — Age Bracket Performance:**
   - Filter `attribute_type` = `Age Bracket`.
   - Clustered bars comparing `group_recall` for `<55` vs `>=55`.

---

### Dashboard 4: CardioWatch Executive Surveillance Hub
* Assemble a unified 1200x800 px executive dashboard:
1. **Header Banner:** Title "CardioWatch Executive Monitor", Subtitle "Continuous Clinical ML Surveillance".
2. **Top Row:** 4 Executive KPI widgets (System Status, Current Recall, Top Drifting Feature, Max Fairness Gap).
3. **Middle Row:** Synchronized Dual-Line Chart (Model Recall vs Max Feature Drift vs Female FNR).
4. **Bottom Row:** Active Alert Log (Table showing month, triggered alerts, affected patient groups, and recommendations).

---

## 4. Dashboard Interactivity & Filters
- **Filter Action 1:** Click on a month in Dashboard 4 to filter Dashboards 1, 2, and 3 to that specific month.
- **Filter Action 2:** Click on a feature row in Dashboard 2 Heatmap to update the distribution chart.
- **Tooltips:** Include formatted tooltips with clinical context:
  `"Patient Cohort: <time_period> | Sex: <subgroup> | FNR: <group_fnr> | Clinical Implication: Potential under-diagnosis"`
