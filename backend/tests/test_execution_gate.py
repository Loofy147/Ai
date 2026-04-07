import torch
import numpy as np
from backend.py.execution_gate import TransformerExecutionGate, execute_synthetic_pass

def test_gate_forward():
    dim = 1024
    gate = TransformerExecutionGate(dim=dim)
    x = torch.randn(1, dim)
    fiber = np.random.randn(dim).astype(np.float32)

    output = gate(x, fiber)

    assert output.shape == (1, dim)
    assert not torch.allclose(output, x) # Gate should have modified the input

def test_execute_synthetic_pass():
    dim = 512
    input_data = np.random.randn(2, dim).astype(np.float32)
    fiber = np.random.randn(dim).astype(np.float32)

    output = execute_synthetic_pass(input_data, fiber)

    assert output.shape == (2, dim)
