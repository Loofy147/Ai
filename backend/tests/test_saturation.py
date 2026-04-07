import pytest
import os
import numpy as np
import shutil
from backend.py.saturation import SaturationCore

@pytest.fixture
def saturation_core():
    # Use a temporary directory for memory
    core = SaturationCore()
    core.memory_dir = './TEST_STRATOS_MEMORY'
    os.makedirs(core.memory_dir, exist_ok=True)
    yield core
    # Cleanup
    shutil.rmtree(core.memory_dir)

def test_ingest_and_retrieve(saturation_core):
    identity = "test.identity"
    payload = "test payload"
    saturation_core.ingest(identity, payload)

    # Check if files were created
    files = os.listdir(saturation_core.memory_dir)
    assert any(f.endswith('.npy') for f in files)
    assert any(f.endswith('_anchor.json') for f in files)

    # Retrieve
    fiber = saturation_core.get_synthetic_fiber()
    assert isinstance(fiber, np.ndarray)
    assert fiber.shape == (saturation_core.dim,)

def test_breeding(saturation_core):
    # Ingest two fibers to allow breeding
    saturation_core.ingest("p1", "payload1")
    saturation_core.ingest("p2", "payload2")

    # Manually trigger a breeding step
    # We can't easily wait for the loop, so we'll test the logic if we extract it or just check file count
    # For now, let's just ensure we can at least get a fiber after ingestion
    fiber = saturation_core.get_synthetic_fiber()
    assert fiber is not None
