# CardioWatch: An Interactive Tableau Dashboard for Monitoring ML Drift and Fairness in Heart Disease Risk Prediction

[![Python 3.9+](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-1.3+-F7931E?logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![Tableau Ready](https://img.shields.io/badge/Tableau-Ready-E97627?logo=tableau&logoColor=white)](https://www.tableau.com/)

---

## 📌 Executive Summary
**CardioWatch** is a clinical Machine Learning (ML) surveillance and decision-support system. In healthcare, ML models degrade in production due to **data distribution drift** (changing patient age, lifestyle, or clinical referral patterns) and **demographic fairness disparities** (elevated false negatives in underrepresented or atypical patient groups).

CardioWatch trains a calibrated Random Forest diagnostic model on historical baseline clinical records, simulates 5 sequential months of incoming patient cohorts with controlled physiological and symptom drift, statistically quantifies drift via the **Two-Sample Kolmogorov-Smirnov (KS) Test** and **Population Stability Index (PSI)**, conducts demographic fairness audits across biological sex and age cohorts, and exports four structured datasets for visual monitoring in **Tableau**.

---

## 🏗️ System Architecture
```
[ UCI Heart Disease Dataset (Cleveland + Multi-Center) ]
                           │
                           ▼
             [ Data Preprocessing & Cleaning ]
                           │
                           ├──► [ Baseline Calibration (Month 0 Random Forest Classifier) ]
                           │
                           ▼
             [ Longitudinal 5-Month Drift Engine ]
                           │
                           ├──► Batch Inference & Probability Scoring
                           ├──► Continuous Drift (Two-Sample KS-Test)
                           ├──► Categorical Drift (Population Stability Index - PSI)
                           └──► Fairness Auditing (Recall & FNR Disparity Gaps)
                                         │
                                         ▼
                     [ 4 Normalized Output CSV Files ]
                     ├── patient_records_longitudinal.csv
                     ├── monthly_performance_kpis.csv
                     ├── feature_drift_metrics.csv
                     └── subgroup_fairness_audit.csv
                                         │
                                         ▼
                     [ 4 Interactive Tableau Dashboards ]
                     ├── Dashboard 1: Model Performance & Error Analysis
                     ├── Dashboard 2: Population & Feature Drift Monitoring
                     ├── Dashboard 3: Subgroup Clinical Fairness Audit
                     └── Dashboard 4: Executive CardioWatch Surveillance Hub
```

---

## 📊 Longitudinal Results & Key Findings

### 1. Performance Degradation vs. Drift
| Operational Period | Accuracy | Recall (Sensitivity) | Precision | False Negative Rate (FNR) | Top Drifting Biomarkers |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Month 0 (Baseline)** | **88.5%** | **92.9%** | **83.9%** | **7.1%** | None (Reference Distribution) |
| **Month 1** | 90.4% | 86.7% | 91.6% | 13.3% | All Features Normal ($D < 0.07$) |
| **Month 2** | 90.0% | 86.1% | 91.7% | 13.9% | Resting BP ($D = 0.082$) |
| **Month 3** | 85.6% | 87.1% | 88.3% | 12.9% | Age ($D = 0.445$), Max HR ($D = 0.312$) |
| **Month 4** | 91.2% | 83.7% | 91.7% | 16.3% | Chest Pain ($D = 0.228$), Resting BP ($D = 0.350$) |
| **Month 5** | 83.6% | 86.9% | 85.1% | 13.1% | Chol ($D = 0.463$), BP ($D = 0.454$), Age ($D = 0.395$) |

### 2. Clinical Fairness Disparity: The Female Under-Diagnosis Hazard
| Operational Period | Male Recall | Female Recall | Male FNR | Female FNR | Gender Recall Gap | Fairness Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Month 0 (Baseline)** | 95.2% | 85.7% | 4.8% | 14.3% | 9.5% | Acceptable Baseline |
| **Month 1** | 87.9% | 81.8% | 12.1% | 18.2% | 6.1% | Fair |
| **Month 2** | 88.5% | 73.7% | 11.5% | 26.3% | 14.9% | Warning: Disparity Emerging |
| **Month 3** | 91.8% | 73.0% | 8.2% | 27.0% | 18.9% | Warning: Disparity Widening |
| **Month 4** | **94.9%** | **63.6%** | **5.1%** | **36.4%** | **31.3%** | **CRITICAL DISPARITY ALERT** |
| **Month 5** | 89.7% | 75.9% | 10.3% | 24.1% | 13.8% | High Risk Alert |

> **Key Clinical Takeaway:** In Month 4, overall accuracy remained high at 91.2%, but **Female False Negative Rate surged to 36.4%** due to atypical angina presentation. Global metrics masked an algorithmic failure that could lead to misdiagnosis and untreated cardiac events in women.

---

## 🚀 Quickstart & Pipeline Execution

### Prerequisites
* Python 3.9+
* Required packages: `pip install -r requirements.txt`

### 1-Command Execution
To run the full end-to-end pipeline (data acquisition, cleaning, model training, drift simulation, audits, and diagnostic plots):
```bash
python3 run_pipeline.py
```

### Outputs Generated:
1. **Processed CSVs for Tableau (`data/processed/`):**
   * `patient_records_longitudinal.csv`: 1,311 patient-level records with true/predicted outcomes and risk tiers.
   * `monthly_performance_kpis.csv`: Batch-level accuracy, precision, recall, FNR, FPR, and Brier scores.
   * `feature_drift_metrics.csv`: KS-statistics, PSI, p-values, and drift classifications for all features.
   * `subgroup_fairness_audit.csv`: Sliced metrics and disparity gaps across Sex and Age brackets.
2. **Visual Diagnostic Plots (`reports/`):**
   * `01_model_performance_decay.png`: Performance trajectories and safety threshold bands.
   * `02_feature_drift_heatmap.png`: Feature drift matrix across Months 1–5.
   * `03_subgroup_fairness_disparity.png`: Male vs. Female recall and FNR trajectories.

---

## 📈 Tableau Dashboard Implementation
See [`tableau/TABLEAU_BUILD_GUIDE.md`](tableau/TABLEAU_BUILD_GUIDE.md) for exact calculated field definitions, relationship connections, and sheet-by-sheet build instructions for:
- **Dashboard 1:** Model Performance & Error Analysis
- **Dashboard 2:** Population & Feature Drift Monitoring
- **Dashboard 3:** Subgroup Clinical Fairness Audit
- **Dashboard 4:** Executive CardioWatch Surveillance Hub

---

## 🎓 Viva & Technical Defense Guide

* **Q: Why use the Two-Sample Kolmogorov-Smirnov (KS) test for drift?**
  * *A:* Unlike simple mean or variance tracking, the KS test compares the entire Empirical Cumulative Distribution Function (ECDF). It detects shape changes, multimodal clustering, and spread differences without requiring normality assumptions ($D = \sup_x |F_{\text{current}}(x) - F_{\text{ref}}(x)|$).
* **Q: Why prioritize False Negative Rate over Accuracy?**
  * *A:* In cardiac diagnostics, a False Positive leads to further non-invasive testing, but a False Negative discharges a patient with active cardiac ischemia, creating severe medical and mortality risk.
* **Q: How are Python and Tableau decoupled?**
  * *A:* Python handles heavy statistical computation, matrix algebra, and inference offline, exporting a tidy relational star schema in CSV. Tableau handles visual aggregation, Level-of-Detail (LOD) formulas, and interactive dashboard filtering without performance bottlenecks.

---

## 📄 License
This educational lab project is licensed under the MIT License.
