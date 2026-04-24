import hashlib
import secrets
import time


def generate_cuir(tenant_prefix: str) -> str:
    """
    Generate a unique CUIR (Clave Única de Identificación de Receta).

    Format: XXXX (prefix) + 13 digits (timestamp in ms) + 8 hex chars (random) + 2 hex chars (checksum)
    Total: 4 + 13 + 8 + 2 = 27 characters

    CUIR is required by Ley 27.553 and Decreto 98/2023 for electronic prescriptions.

    Args:
        tenant_prefix: 2-4 char prefix identifying the tenant/platform (e.g., "DEVP", "TEST")

    Returns:
        A 27-character unique CUIR string
    """
    # Normalize and pad/truncate prefix to exactly 4 chars
    prefix = tenant_prefix[:4].upper().ljust(4, "X")

    # Timestamp in milliseconds (13 digits)
    ts = str(int(time.time() * 1000))

    # Random hex string (8 chars)
    rand = secrets.token_hex(4)

    # Build the raw CUIR without checksum
    raw = f"{prefix}{ts}{rand}"

    # Calculate MD5 checksum of the raw CUIR (take first 2 hex chars, uppercase)
    checksum = hashlib.md5(raw.encode()).hexdigest()[:2].upper()

    return f"{raw}{checksum}"
