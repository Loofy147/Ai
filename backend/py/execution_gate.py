import torch
import torch.nn as nn
import numpy as np

class TransformerExecutionGate(nn.Module):
    """
    A neural gate that performs a forward pass using a synthetic bred layer
    derived from the Saturation Core's manifold.
    """
    def __init__(self, dim=4096):
        super().__init__()
        self.dim = dim
        self.static_proj = nn.Linear(dim, dim)
        self.ln = nn.LayerNorm(dim)

    def forward(self, x, fiber: np.ndarray):
        """
        Performs a forward pass where the logic is modulated by a synthetic fiber.
        """
        # Ensure x is at least 2D
        if x.dim() == 1:
            x = x.unsqueeze(0)

        f_tensor = torch.from_numpy(fiber).float().to(x.device)

        # Spectral Modulation
        contextual_gate = torch.tanh(f_tensor)

        out = self.static_proj(x) * contextual_gate

        return self.ln(out + x)

def execute_synthetic_pass(input_data: np.ndarray, fiber: np.ndarray):
    """Utility function to execute a synthetic forward pass."""
    gate = TransformerExecutionGate(dim=len(fiber))
    x = torch.from_numpy(input_data).float()

    with torch.no_grad():
        output = gate(x, fiber)

    return output.numpy()
