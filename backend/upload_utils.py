"""
HEATLEDGER AI: Strict File-Upload Firewall & Magic-Byte Verifier
Extracted from main.py for Prompt Pack v5 Task 6.1.
"""

from typing import List, Optional
from fastapi import HTTPException, UploadFile

MAX_FILE_SIZE = 10 * 1024 * 1024  # Hard 10 MB limit (10,485,760 bytes)
ALLOWED_MAGIC_SIGNATURES = {
    "pdf": b"%PDF-",
    "png": b"\x89PNG\r\n\x1a\n",
    "jpeg": b"\xff\xd8\xff",
}


async def read_uploaded_file_stream(
    upload_file: UploadFile,
    allowed_types: Optional[List[str]] = None,
) -> bytes:
    """
    Reads upload stream in 64 KB chunks, enforcing a strict 10 MB payload firewall
    and authentic magic byte signature verification.
    """
    chunk_size = 64 * 1024
    data = bytearray()
    total_bytes = 0

    while True:
        chunk = await upload_file.read(chunk_size)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"Payload Too Large: File size exceeds the hard 10 MB limit ({MAX_FILE_SIZE} bytes).",
            )
        data.extend(chunk)

    if total_bytes == 0:
        raise HTTPException(status_code=400, detail="Empty file payload uploaded.")

    raw_bytes = bytes(data)

    matched_type = None
    for ftype, sig in ALLOWED_MAGIC_SIGNATURES.items():
        if raw_bytes.startswith(sig):
            matched_type = ftype
            break

    valid_types = allowed_types or list(ALLOWED_MAGIC_SIGNATURES.keys())
    if not matched_type or matched_type not in valid_types:
        expected_str = ", ".join(valid_types).upper()
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file signature: Only authentic {expected_str} files are permitted.",
        )

    return raw_bytes
