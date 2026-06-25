"""
forecast_service.py

Load trained Prophet models and generate forecast rows.

This module is intentionally small so the FastAPI route layer can stay thin.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List

import joblib
import pandas as pd
from prophet import Prophet

MODELS_DIR = Path(__file__).resolve().parents[2] / "models" / "forecast"
TARGET_MODEL_PREFIX = {
	"volume": "prophet",
	"delay": "prophet_delay",
	"approval_rate": "prophet_approval_rate",
	"rejection_rate": "prophet_rejection_rate",
	"pending_workload": "prophet_pending_workload",
	"sla_misses": "prophet_sla_misses",
}


# Maps department IDs / short-codes to all known naming variants so we can
# find a model regardless of which naming convention was used during training.
DEPT_ALIASES: Dict[str, List[str]] = {
	"CS005": ["CS005", "CS", "Customer_Service"],
	"CS": ["CS", "CS005", "Customer_Service"],
	"Customer_Service": ["Customer_Service", "CS005", "CS"],
	"FI001": ["FI001", "Finance"],
	"Finance": ["Finance", "FI001"],
	"HR002": ["HR002", "HR", "Human_Resources"],
	"HR": ["HR", "HR002", "Human_Resources"],
	"Human_Resources": ["Human_Resources", "HR002", "HR"],
	"IT004": ["IT004", "IT", "Information_Technology"],
	"IT": ["IT", "IT004", "Information_Technology"],
	"Information_Technology": ["Information_Technology", "IT004", "IT"],
	"OP003": ["OP003", "Operations"],
	"Operations": ["Operations", "OP003"],
}


def load_prophet_model(dept_id: str, target: str) -> Prophet:
	"""Load a trained Prophet model for a department or the org-level model."""
	if target not in TARGET_MODEL_PREFIX:
		raise ValueError(
			"target must be one of 'volume', 'delay', 'approval_rate', "
			"'rejection_rate', 'pending_workload', or 'sla_misses'"
		)

	prefix = TARGET_MODEL_PREFIX[target]
	safe_dept_id = dept_id.replace("/", "_").replace(" ", "_")

	# Try the exact department ID first.
	path = MODELS_DIR / f"{prefix}_{safe_dept_id}.pkl"
	if path.exists():
		return joblib.load(path)

	# Fall back through known aliases for this department.
	for alias in DEPT_ALIASES.get(safe_dept_id, []):
		alt_path = MODELS_DIR / f"{prefix}_{alias}.pkl"
		if alt_path.exists():
			return joblib.load(alt_path)

	raise FileNotFoundError(
		f"No {target} Prophet model found for department: {dept_id}"
	)


def generate_forecast(payload: dict) -> Dict[str, object]:
	"""Generate forecast rows from a request payload."""
	dept_id = str(payload.get("dept_id") or payload.get("deptId") or "org")
	horizon = int(payload.get("horizon", 7))
	target = str(payload.get("target") or "volume").lower()

	if horizon not in (7, 14, 30):
		raise ValueError("horizon must be 7, 14, or 30")
	if target not in TARGET_MODEL_PREFIX:
		raise ValueError(
			"target must be one of 'volume', 'delay', 'approval_rate', "
			"'rejection_rate', 'pending_workload', or 'sla_misses'"
		)

	model = load_prophet_model(dept_id, target)
	
	# FIX: Create future dataframe starting from today, not training end date
	today = datetime.now().date()
	future_dates = pd.date_range(start=today, periods=horizon, freq='D')
	future = pd.DataFrame({'ds': future_dates})
	
	forecast = model.predict(future)

	forecast_data: List[Dict[str, object]] = []
	for _, row in forecast.iterrows():
		forecast_data.append(
			{
				"ds": row["ds"].strftime("%Y-%m-%d"),
				"yhat": round(float(row["yhat"]), 2),
				"yhat_lower": round(float(row["yhat_lower"]), 2),
				"yhat_upper": round(float(row["yhat_upper"]), 2),
			}
		)

	return {
		"dept_id": dept_id,
		"horizon": horizon,
		"target": target,
		"forecastData": forecast_data,
	}
