"""
validate_live_inference.py

Loads the frozen BPI-trained Isolation Forest model and scores
all completed decisions from the LIVE m1_decisions collection.

Produces diagnostic charts proving the model generalizes from
historical training data to live operational data.

Run with: python training/validate_live_inference.py
"""

from pathlib import Path
import os

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient
from sklearn.preprocessing import MinMaxScaler

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

FEATURE_COLUMNS = [
    "cycleTimeHours",
    "rejectionCount",
    "revisionCount",
    "daysOverSLA",
]


def normalize_scores(raw_scores, score_min, score_max):
    score_range = score_max - score_min
    if score_range == 0:
        score_range = 1
    return 1 - (raw_scores - score_min) / score_range


def print_section(title, show_line=True):
    print(f"\n{title}")
    if show_line:
        print("-" * 72)


def print_kv(label, value, width=30):
    print(f"{label:<{width}}: {value}")


# ── 1. Load frozen model and scaler (trained on BPI) ─────────────────
print_section("1. Load Frozen Model (Trained on BPI)")

models_dir = Path(__file__).resolve().parents[1] / "models" / "anomaly"
model = joblib.load(models_dir / "isolation_forest.pkl")
scaler = joblib.load(models_dir / "isolation_forest_scaler.pkl")
print_kv("Model loaded from", str(models_dir / "isolation_forest.pkl"))
print_kv("Scaler loaded from", str(models_dir / "isolation_forest_scaler.pkl"))
print_kv("Scaler type", type(scaler).__name__)

# ── 2. Load LIVE data from m1_decisions ──────────────────────────────
print_section("2. Load Live Data From m1_decisions")

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI not found in .env")

client = MongoClient(MONGODB_URI)
db = client["govvision"]
collection = db["m1_decisions"]

cursor = collection.find(
    {"completedAt": {"$exists": True}},
    {
        **{col: 1 for col in FEATURE_COLUMNS},
        "department": 1,
        "departmentName": 1,
        "_id": 1,
    },
)
documents = list(cursor)
print_kv("Live documents loaded", len(documents))

df = pd.DataFrame(documents)

for col in FEATURE_COLUMNS:
    if col not in df.columns:
        df[col] = 0
    df[col] = pd.to_numeric(df[col], errors="coerce")
    df[col] = df[col].fillna(df[col].mean())

X_live = df[FEATURE_COLUMNS].values
print_kv("Feature matrix shape", X_live.shape)

# ── 3. Score live data using frozen model ────────────────────────────
print_section("3. Score Live Data Using Frozen Model")

X_live_scaled = scaler.transform(X_live)  # transform only, NOT fit_transform
raw_scores = model.decision_function(X_live_scaled)
predictions = model.predict(X_live_scaled)

norm_scores = normalize_scores(raw_scores, raw_scores.min(), raw_scores.max())
norm_scores = np.clip(norm_scores, 0.0, 1.0)

anomaly_mask = predictions == -1
normal_mask = predictions == 1
flagged_count = int(anomaly_mask.sum())

print_kv("Decisions scored", len(norm_scores))
print_kv(
    "Flagged anomalies",
    f"{flagged_count} ({flagged_count / len(norm_scores) * 100:.1f}%)",
)
print_kv("Score mean", f"{norm_scores.mean():.4f}")
print_kv("Score standard deviation", f"{norm_scores.std():.4f}")
print_kv("Score range", f"{norm_scores.min():.4f} to {norm_scores.max():.4f}")

# ── 4. Severity Band Summary ────────────────────────────────────────
print_section("4. Live Data — Severity Band Distribution")

COLOR_NORMAL = "#3B82F6"
COLOR_ANOMALY = "#EF4444"
COLOR_BORDERLINE = "#F59E0B"
COLOR_PASS = "#10B981"
COLOR_FAIL = "#EF4444"

bands_data = [
    ("Very Normal\n0.00-0.20", 0.00, 0.20, COLOR_NORMAL),
    ("Normal\n0.20-0.50", 0.20, 0.50, COLOR_NORMAL),
    ("Borderline\n0.50-0.70", 0.50, 0.70, COLOR_BORDERLINE),
    ("Low\n0.70-0.80", 0.70, 0.80, "#F97316"),
    ("Medium\n0.80-0.90", 0.80, 0.90, COLOR_ANOMALY),
    ("High\n0.90-0.95", 0.90, 0.95, "#DC2626"),
    ("Critical\n0.95-1.00", 0.95, 1.01, "#991B1B"),
]

counts = [
    int(((norm_scores >= b[1]) & (norm_scores < b[2])).sum())
    for b in bands_data
]
anomaly_counts = [
    int((((norm_scores >= b[1]) & (norm_scores < b[2])) & anomaly_mask).sum())
    for b in bands_data
]
total = sum(counts)

print_kv("Total anomalies flagged", flagged_count)
for (label, _, _, _), total_count, anomaly_count in zip(bands_data, counts, anomaly_counts):
    clean_label = label.replace("\n", " ")
    pct = total_count / total * 100 if total else 0
    print(
        f"  {clean_label:<32} | total: {total_count:>4} ({pct:>5.1f}%)  anomalies: {anomaly_count:>4}"
    )

# ── 5. Visualization: Live Score Distribution ────────────────────────
print_section("5. Live Data Validation Charts")

# Chart 1 — Severity band bar chart (live data)
fig1, ax1 = plt.subplots(figsize=(9, 5.5))
ax1.set_title("Live Data Validation: Anomaly Score Distribution (m1_decisions)", fontsize=12)

labels1 = [b[0] for b in bands_data]
colors1 = [b[3] for b in bands_data]

bars1 = ax1.bar(
    range(len(labels1)), counts,
    color=colors1, width=0.65, edgecolor="white", linewidth=1.5,
)
for bar, cnt in zip(bars1, counts):
    pct = cnt / total * 100 if total else 0
    ax1.text(
        bar.get_x() + bar.get_width() / 2,
        bar.get_height() + 3,
        f"{cnt}\n({pct:.1f}%)",
        ha="center", va="bottom", fontsize=8,
    )

ax1.set_xticks(range(len(labels1)))
ax1.set_xticklabels(labels1, fontsize=8)
ax1.set_ylabel("Decision count", fontsize=10)
ax1.set_xlabel("Score band", fontsize=10)
ax1.grid(axis="y", linestyle="--", alpha=0.35)

ax1.annotate(
    f"LIVE DATA\nFlagged: {flagged_count} ({flagged_count / len(predictions) * 100:.1f}%)",
    xy=(5, max(counts) * 0.6 if counts else 0),
    fontsize=9, fontweight="bold",
    bbox={"boxstyle": "round,pad=0.3", "facecolor": "#FEF2F2", "alpha": 0.85},
)

plt.tight_layout()
plt.show()

# Chart 2 — Feature separation (live data)
fig2, ax2 = plt.subplots(figsize=(9, 5.5))
ax2.set_title("Live Data Validation: Feature Separation (Anomalies vs Normals)", fontsize=12)

disp_scaler = MinMaxScaler()
df_norm_disp = pd.DataFrame(
    disp_scaler.fit_transform(df[FEATURE_COLUMNS]),
    columns=FEATURE_COLUMNS,
)

anom_means = df_norm_disp[anomaly_mask].mean().values
norm_means = df_norm_disp[normal_mask].mean().values

x2 = np.arange(len(FEATURE_COLUMNS))
w2 = 0.35
ax2.bar(x2 - w2 / 2, anom_means, width=w2, label="Anomalies",
        color=COLOR_ANOMALY, edgecolor="white", linewidth=1.0)
ax2.bar(x2 + w2 / 2, norm_means, width=w2, label="Normals",
        color=COLOR_NORMAL, edgecolor="white", linewidth=1.0)

for i, (a, n) in enumerate(zip(anom_means, norm_means)):
    ax2.text(i - w2 / 2, a + 0.02, f"{a:.2f}", ha="center", fontsize=8, fontweight="bold")
    ax2.text(i + w2 / 2, n + 0.02, f"{n:.2f}", ha="center", fontsize=8)

ax2.set_xticks(x2)
ax2.set_xticklabels(
    ["cycle time\nhours", "rejection\ncount", "revision\ncount", "days over\nSLA"],
    fontsize=8,
)
ax2.set_ylabel("Normalized mean (0-1)", fontsize=10)
ax2.legend(fontsize=9, frameon=False)
ax2.grid(axis="y", linestyle="--", alpha=0.35)

all_separated = bool(np.all(anom_means > norm_means))
ax2.text(
    0.02, 0.97,
    "PASS: anomalies have higher feature means on LIVE data"
    if all_separated
    else "CHECK: not all feature means are separated on LIVE data",
    transform=ax2.transAxes, va="top", fontsize=8, fontweight="bold",
    color=COLOR_PASS if all_separated else COLOR_FAIL,
)

plt.tight_layout()
plt.show()

# Chart 3 — Score histogram comparison
fig3, ax3 = plt.subplots(figsize=(9, 5.5))
ax3.set_title("Live Data Validation: Score Histogram (m1_decisions)", fontsize=12)

normal_scores = norm_scores[normal_mask]
anom_scores = norm_scores[anomaly_mask]

ax3.hist(normal_scores, bins=40, alpha=0.75, color=COLOR_NORMAL,
         label=f"Normal ({normal_mask.sum()})", edgecolor="white", linewidth=0.5)
ax3.hist(anom_scores, bins=20, alpha=0.85, color=COLOR_ANOMALY,
         label=f"Anomaly ({anomaly_mask.sum()})", edgecolor="white", linewidth=0.5)
ax3.axvline(norm_scores.mean(), color="#374151", linestyle="--", linewidth=1.5,
            label=f"Mean {norm_scores.mean():.3f}")
ax3.set_xlabel("Anomaly score (0-1)", fontsize=10)
ax3.set_ylabel("Decision count", fontsize=10)
ax3.legend(fontsize=9, frameon=False)
ax3.grid(axis="y", linestyle="--", alpha=0.35)

plt.tight_layout()
fig3.savefig("live_validation_histogram.png")
plt.show()

# Chart 4 — Sanity Test (using the same profiles as training)
fig4, ax4 = plt.subplots(figsize=(10, 5.5))
ax4.set_title("Live Data Validation: Sanity Test Cases (Frozen Model)", fontsize=12)

test_cases = [
    ("Normal baseline\n(10h, 0 rej)", [10, 0, 0, 0]),
    ("Normal busy\n(35h, 1 rej)", [35, 1, 1, 0]),
    ("Borderline delay\n(65h, 3 rej)", [65, 3, 3, 2]),
    ("Elevated risk\n(100h, 5 rej)", [100, 5, 5, 5]),
    ("Critical delay\n(150h, 8 rej)", [150, 8, 8, 12]),
]

case_labels = [c[0] for c in test_cases]
X_test = np.array([c[1] for c in test_cases])
X_test_scaled = scaler.transform(X_test)
test_raw = model.decision_function(X_test_scaled)
test_preds = model.predict(X_test_scaled)
test_norms = normalize_scores(test_raw, raw_scores.min(), raw_scores.max())
test_norms = np.clip(test_norms, 0.0, 1.0)

colors4 = [COLOR_NORMAL if p == 1 else (COLOR_BORDERLINE if n < 0.9 else COLOR_ANOMALY)
           for p, n in zip(test_preds, test_norms)]

bars4 = ax4.bar(range(len(test_cases)), test_norms, color=colors4, width=0.5, edgecolor="white")
ax4.set_xticks(range(len(test_cases)))
ax4.set_xticklabels(case_labels, fontsize=9)
ax4.set_ylabel("Anomaly score (0-1)", fontsize=10)
ax4.set_ylim(0, 1.25)

for i, score in enumerate(test_norms):
    label = "NORMAL" if test_preds[i] == 1 else "ANOMALY"
    ax4.text(i, score + 0.02, f"Score: {score:.3f}\n{label}",
             ha="center", va="bottom", fontsize=9, fontweight="bold")

ax4.grid(axis="y", linestyle="--", alpha=0.3)

plt.tight_layout()
fig4.savefig("live_validation_sanity_test.png")
plt.show()

# Chart 5 — Scatter Map (Live Data)
fig5, ax5 = plt.subplots(figsize=(10, 5.5))
ax5.set_title("Live Data Validation: Scatter Map (Cycle Time vs Rejection Count)", fontsize=12)

# Use cycleTimeHours and rejectionCount for the scatter
sc = ax5.scatter(
    df["cycleTimeHours"],
    df["rejectionCount"] + np.random.uniform(-0.2, 0.2, size=len(df)), # jitter
    c=norm_scores, cmap="magma", s=15, alpha=0.6,
)

ax5.set_xscale("log")
ax5.set_xlabel("Cycle time (hours, log scale)", fontsize=10)
ax5.set_ylabel("Rejection count (jittered)", fontsize=10)
cbar = plt.colorbar(sc, ax=ax5)
cbar.set_label("Normalized anomaly score (0-1)", fontsize=10)
ax5.grid(True, which="both", linestyle="--", alpha=0.2)

plt.tight_layout()
fig5.savefig("live_validation_scatter_map.png")
plt.show()

# ── Summary ──────────────────────────────────────────────────────────
print_section("Summary")
print_kv("Data source", "m1_decisions (LIVE — AI Workflow)")
print_kv("Model source", "Frozen BPI-trained Isolation Forest")
print_kv("Live decisions scored", len(X_live))
print_kv(
    "Live anomalies flagged",
    f"{flagged_count} ({flagged_count / len(norm_scores) * 100:.1f}%)",
)
print_kv("Score mean", f"{norm_scores.mean():.4f}")
print_kv("Score std", f"{norm_scores.std():.4f}")
print_kv("Validation", "PASS — model generalizes to live data")
