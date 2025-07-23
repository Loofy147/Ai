# client.py

import requests
import json

API_URL = "http://127.0.0.1:8000/generate-code"

# --- Test Case 1: Simple function generation ---
print("--- Running Test Case 1: Generate a simple function ---")
payload1 = {
    "prompt": "Create a Python function that takes a string and returns it in reverse.",
    "language": "python"
}

try:
    response = requests.post(API_URL, json=payload1)
    response.raise_for_status()  # Raises an exception for bad status codes (4xx or 5xx)
    data = response.json()
    print("✅ AI Generated Code:")
    print(data.get("generated_code", "No code found."))
except requests.exceptions.RequestException as e:
    print(f"❌ Error: {e}")

print("\n" + "="*50 + "\n")

# --- Test Case 2: Code completion with context ---
print("--- Running Test Case 2: Complete code with context ---")
payload2 = {
    "prompt": "Complete the 'calculate_area' method for me.",
    "code_context": """
class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def calculate_area(self):
        # TODO: Implement this method
    """,
    "language": "python"
}

try:
    response = requests.post(API_URL, json=payload2)
    response.raise_for_status()
    data = response.json()
    print("✅ AI Generated Code:")
    print(data.get("generated_code", "No code found."))
except requests.exceptions.RequestException as e:
    print(f"❌ Error: {e}")
