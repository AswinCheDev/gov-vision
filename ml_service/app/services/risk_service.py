"""Risk scoring service backed by a saved Random Forest pipeline."""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd

MODELS_DIR = Path(__file__).resolve().parents[2] / "models" / "risk"
MODEL_PATH = MODELS_DIR / "random_forest.pkl"

# Matches train_random_forest.py — 7 direct DB fields, no engineered features.
# daysOverSLA and status excluded to prevent target leakage.
FEATURE_COLS = [
    "hourOfDaySubmitted",
    "revisionCount",
    "stageCount",
    "rejectionCount",
    "cycleTimeHours",
    "department",
    "priority",
]

# 3-class map — Medium class removed (had only 5 training samples)
LEVEL_MAP = {
    0: "low",
    1: "high",
    2: "critical",
}


def _load_model():
	if not MODEL_PATH.exists():
		raise FileNotFoundError(
			f"random_forest.pkl not found at {MODEL_PATH}. "
			"Run: python training/train_random_forest.py"
		)
	return joblib.load(MODEL_PATH)


def _normalize_features(features: list[dict]) -> pd.DataFrame:
    frame = pd.DataFrame(features)
    for col in FEATURE_COLS:
        if col not in frame.columns:
            frame[col] = None
    return frame[FEATURE_COLS]


def score_departments(features: list[dict]) -> list[dict]:
	"""Score a list of department feature vectors with confidence and importance."""
	model = _load_model()
	x = _normalize_features(features)

	predictions = model.predict(x)
	probabilities = model.predict_proba(x)
	importances = model.named_steps["classifier"].feature_importances_

	results: list[dict] = []
	for index, row in enumerate(features):
		# 3-class model foundation: 0=Low, 1=High, 2=Critical
		# We map these to weights that allow a "Medium" score to emerge
		# when the model is uncertain between Low and High.
		weights = [0.0, 66.0, 100.0] 
		probs = probabilities[index]
		risk_score = sum(p * w for p, w in zip(probs, weights))

		# Determine 4-tier level for UI compatibility
		if risk_score >= 80:
			level = "critical"
		elif risk_score >= 60:
			level = "high"
		elif risk_score >= 40:
			level = "medium"
		else:
			level = "low"

		results.append(
			{
				"dept": row.get("dept", "unknown"),
				"score": round(risk_score, 1),
				"level": level,
				"featureImportance": {
					name: round(float(importance), 4)
					for name, importance in zip(FEATURE_COLS, importances)
				},
			}
		)

	return results


def score_risk(payload: dict):
	"""Backward-compatible single-item scoring used by legacy /risk route."""
	dept = payload.get("dept") or payload.get("id") or "unknown"
	features = [{**payload, "dept": dept}]
	result = score_departments(features)[0]
	return {
		"id": dept,
		"riskScore": result["score"],
		"riskLevel": result["level"],
		"featureImportance": result["featureImportance"],
	}
