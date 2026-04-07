import os
import sys
import hashlib
import numpy as np
import inspect
import time
import threading
import json
from datetime import datetime
try:
    import fcntl
except ImportError:
    # Fallback for systems without fcntl (though this environment should have it)
    fcntl = None

# =====================================================================
# STRATOS OMEGA: SATURATION CORE (V2 - HRR MANIFOLD)
# =====================================================================

class SaturationCore:
    def __init__(self, m=1000003, dim=2048):
        self.m = m
        self.dim = dim
        self.memory_dir = './STRATOS_MEMORY_V2'
        os.makedirs(self.memory_dir, exist_ok=True)
        self.lock = threading.Lock()
        self.is_running = True

    def _hash(self, identity: str) -> int:
        """High-precision hashing for the fiber manifold."""
        return int(hashlib.sha256(identity.encode()).hexdigest(), 16) % self.m

    def _unitary_vec(self, seed: str) -> np.ndarray:
        """Generates a unitary vector in the Fourier domain to preserve energy during binding."""
        state = int(hashlib.sha256(seed.encode()).hexdigest(), 16) % (2**32)
        np.random.seed(state)
        # HRRs work best when components are drawn from N(0, 1/n)
        v = np.random.normal(0, 1/np.sqrt(self.dim), self.dim)
        return v.astype(np.float32)

    def bind(self, a, b):
        """Holographic Binding: Circular Convolution via FFT."""
        return np.fft.ifft(np.fft.fft(a) * np.fft.fft(b)).real.astype(np.float32)

    def unbind(self, composite, a):
        """Holographic Retrieval: Circular Correlation (approximate inverse)."""
        # Circular correlation is FFT(a)* * FFT(composite)
        return np.fft.ifft(np.conj(np.fft.fft(a)) * np.fft.fft(composite)).real.astype(np.float32)

    def _get_semantic_signature(self, obj):
        """Extracts actual bytecode or source instead of just the string rep."""
        try:
            return inspect.getsource(obj)
        except Exception:
            try:
                return str(obj.__code__.co_code) if hasattr(obj, '__code__') else str(obj)
            except Exception:
                return str(obj)

    def _atomic_add(self, filepath, vector):
        """Thread-safe and process-safe accumulation into the manifold."""
        with self.lock:
            mode = 'rb+' if os.path.exists(filepath) else 'wb+'
            with open(filepath, mode) as f:
                if fcntl:
                    fcntl.flock(f, fcntl.LOCK_EX)
                try:
                    if mode == 'rb+':
                        existing = np.load(f)
                        # Superposition: ADD
                        new_v = existing + vector
                        f.seek(0)
                        np.save(f, new_v.astype(np.float32))
                        f.truncate()
                    else:
                        np.save(f, vector.astype(np.float32))
                finally:
                    if fcntl:
                        fcntl.flock(f, fcntl.LOCK_UN)

    def ingest(self, path_name: str, obj, p_type: str = "namespace_capture"):
        """Binds an identity vector to a semantic content vector and adds to manifold."""
        sig = self._get_semantic_signature(obj)

        v_id = self._unitary_vec(path_name)
        v_content = self._unitary_vec(sig)

        # The trace is the bound pair
        trace = self.bind(v_id, v_content)

        # Bucketed storage by first level of namespace
        bucket = path_name.split('.')[0]
        file_path = os.path.join(self.memory_dir, f"bucket_{bucket}.npy")

        self._atomic_add(file_path, trace)

        # Optional: Save metadata anchor for indexing
        anchor_path = os.path.join(self.memory_dir, f"bucket_{bucket}_anchor.json")
        if not os.path.exists(anchor_path):
            with open(anchor_path, "w") as f:
                json.dump({"id": path_name, "type": p_type, "ts": str(datetime.now())}, f)

    def query(self, path_name: str) -> np.ndarray:
        """Retrieves semantic memory from the manifold using an identity key."""
        bucket = path_name.split('.')[0]
        file_path = os.path.join(self.memory_dir, f"bucket_{bucket}.npy")

        if not os.path.exists(file_path):
            return None

        v_id = self._unitary_vec(path_name)
        with self.lock:
            with open(file_path, 'rb') as f:
                if fcntl:
                    fcntl.flock(f, fcntl.LOCK_SH)
                try:
                    manifold_segment = np.load(f)
                finally:
                    if fcntl:
                        fcntl.flock(f, fcntl.LOCK_UN)

        # Unbind to find the semantic content
        retrieved_content_vec = self.unbind(manifold_segment, v_id)
        return retrieved_content_vec

    def crawl_and_consume(self):
        """Targeted Semantic Ingestion across modules."""
        print(f"[!] SATURATION: Targeted Semantic Ingestion...")
        target_modules = list(sys.modules.items())
        for name, module in target_modules:
            if not module or name.startswith('_') or name.startswith('stratos') or 'builtins' in name or not hasattr(module, '__file__'):
                continue

            try:
                members = inspect.getmembers(module)
                for member_name, obj in members:
                    if member_name.startswith('_'): continue
                    if inspect.isfunction(obj) or inspect.isclass(obj):
                        full_id = f"{name}.{member_name}"
                        self.ingest(full_id, obj)
            except Exception:
                continue

    def breeding_loop(self):
        """Synthetic Breeding in the V2 manifold."""
        print("[*] SATURATION: Breeding loop active. Creating synthetic logic...")
        while self.is_running:
            try:
                buckets = [f for f in os.listdir(self.memory_dir) if f.startswith('bucket_') and f.endswith('.npy')]
                if len(buckets) >= 2:
                    b1_name, b2_name = np.random.choice(buckets, 2, replace=False)

                    v1 = np.load(os.path.join(self.memory_dir, b1_name))
                    v2 = np.load(os.path.join(self.memory_dir, b2_name))

                    # Synthetic breeding: bind two manifold segments
                    # This creates a 'higher-order' relational interference pattern
                    v_syn = self.bind(v1, v2)

                    child_id = f"syn.{hash(b1_name + b2_name)}.{time.time()}"
                    child_path = os.path.join(self.memory_dir, f"synthetic_{self._hash(child_id)}.npy")

                    np.save(child_path, v_syn.astype(np.float32))
            except Exception:
                pass
            time.sleep(0.005)

    def get_synthetic_fiber(self) -> np.ndarray:
        """Retrieves a random fiber or synthetic segment from the manifold."""
        files = [f for f in os.listdir(self.memory_dir) if f.endswith('.npy')]
        if not files:
            return self._unitary_vec(str(time.time()))

        path = os.path.join(self.memory_dir, np.random.choice(files))
        with self.lock:
            with open(path, 'rb') as f:
                return np.load(f).astype(np.float32)

    def stop(self):
        self.is_running = False
