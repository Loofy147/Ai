import pytest
import os
import numpy as np
import shutil
from backend.py.saturation import SaturationCore

@pytest.fixture
def saturation_core():
    # Use a temporary directory for memory
    core = SaturationCore(dim=4096)
    core.memory_dir = './TEST_STRATOS_MEMORY_V3'
    if os.path.exists(core.memory_dir):
        shutil.rmtree(core.memory_dir)
    os.makedirs(core.memory_dir, exist_ok=True)
    yield core
    # Cleanup
    if os.path.exists(core.memory_dir):
        shutil.rmtree(core.memory_dir)

def test_library_harvesting_and_fidelity(saturation_core):
    # Harvest a small built-in library for speed
    target = "json"
    saturation_core.harvest_library(target)

    # Check if bucket exists
    bucket_path = os.path.join(saturation_core.memory_dir, "bucket_json.npy")
    assert os.path.exists(bucket_path)

    # Check fidelity for a known member: json.dumps
    # Note: fidelity might vary slightly based on superposition,
    # but for a single small library it should be very high.
    fidelity = saturation_core.verify_fidelity("json.dumps")
    print(f"json.dumps Fidelity: {fidelity}")
    assert fidelity > 0.3

def test_ensure_libraries(saturation_core):
    # numpy should be already installed
    saturation_core.ensure_libraries(["numpy"])

def test_verify_fidelity_not_found(saturation_core):
    fidelity = saturation_core.verify_fidelity("non_existent.func")
    assert fidelity == 0.0
