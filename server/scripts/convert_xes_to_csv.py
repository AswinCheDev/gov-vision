import pm4py
import pandas as pd
import os

print("Loading XES file...")
xes_path = "d:/GithubUploads/gov_vision/server/Dataset/BPI Challenge 2017.xes"
csv_path = "d:/GithubUploads/gov_vision/server/Dataset/BPI_Challenge_2017_Flat.csv"

# Load the event log
log = pm4py.read_xes(xes_path)

print("Converting to DataFrame...")
df = pm4py.convert_to_dataframe(log)

print(f"Saving to CSV... (Rows: {len(df)})")
df.to_csv(csv_path, index=False)

print(f"Done! Saved to {csv_path}")
