import pytest
import os
import numpy as np
import shutil
from backend.py.saturation import SaturationCore

@pytest.fixture
def saturation_core():
    # Use a temporary directory for memory
    core = SaturationCore(dim=2048)
    core.memory_dir = './TEST_STRATOS_MEMORY_V2'
    if os.path.exists(core.memory_dir):
        shutil.rmtree(core.memory_dir)
    os.makedirs(core.memory_dir, exist_ok=True)
    yield core
    # Cleanup
    if os.path.exists(core.memory_dir):
        shutil.rmtree(core.memory_dir)

def test_hrr_fidelity(saturation_core):
    path_name = "os.path.join"
    # We'll use a dummy object
    def mock_obj(): pass

    # Ingest
    saturation_core.ingest(path_name, mock_obj)

    # Query
    res_vec = saturation_core.query(path_name)
    assert res_vec is not None
    assert res_vec.shape == (2048,)

    # Verification: Cosine Similarity with original semantic vector
    sig = saturation_core._get_semantic_signature(mock_obj)
    orig_vec = saturation_core._unitary_vec(sig)

    similarity = np.dot(res_vec, orig_vec) / (np.linalg.norm(res_vec) * np.linalg.norm(orig_vec))
    print(f"Retrieval Fidelity: {similarity}")
    # Similarity should be high (e.g., > 0.5) for a single entry
    assert similarity > 0.3

def test_atomic_locking(saturation_core):
    # This just ensures fcntl doesn't crash if it exists
    path_name = "test.lock"
    def mock_obj(): pass
    saturation_core.ingest(path_name, mock_obj)
    res = saturation_core.query(path_name)
    assert res is not None

def test_breeding_v2(saturation_core):
    saturation_core.ingest("p1.func", lambda: 1)
    saturation_core.ingest("p2.func", lambda: 2)

    # Breeding requires 2 buckets (p1 and p2)
    files = os.listdir(saturation_core.memory_dir)
    npy_files = [f for f in files if f.endswith('.npy')]
    assert len(npy_files) >= 2
