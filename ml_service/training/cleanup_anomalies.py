"""
cleanup_anomalies.py
Clears m3_anomalies and resets m1_decisions isScored flags.
"""
import os
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

MONGODB_URI = os.getenv("MONGODB_URI")
client = MongoClient(MONGODB_URI)
db = client["govvision"]

# 1. Clear anomalies
res1 = db["m3_anomalies"].delete_many({})
print(f"Deleted {res1.deleted_count} anomalies from m3_anomalies.")

# 2. Reset scoring flags
res2 = db["m1_decisions"].update_many({}, {"$set": {"isScored": False}})
print(f"Reset isScored flag for {res2.modified_count} decisions in m1_decisions.")

client.close()
