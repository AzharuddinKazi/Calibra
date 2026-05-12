FROM python:3.11-slim

WORKDIR /app

# System deps: graphviz binary (required by SDV), gcc + libffi-dev (for cryptography)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        graphviz \
        libffi-dev \
        libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch first.
# Without this, pip resolves torch from sdv->ctgan and downloads the 2 GB CUDA wheel.
# The CPU wheel is ~400 MB and is sufficient — Calibra does not use GPU inference.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install remaining app dependencies.
# torch is already satisfied above so pip skips it.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Railway injects $PORT at runtime. exec replaces the shell so uvicorn receives SIGTERM directly.
CMD exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
