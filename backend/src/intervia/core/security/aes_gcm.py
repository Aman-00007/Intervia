import json
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from intervia.core.config import get_settings


class AESVaultCipher:
    """AES-256-GCM authenticated encryption for PII token maps and offline hints."""

    def __init__(self) -> None:
        key_hex = get_settings().AES_MASTER_KEY_HEX
        self._key = bytes.fromhex(key_hex)
        if len(self._key) != 32:
            raise ValueError("AES_MASTER_KEY_HEX must be 64 hex characters (32 bytes / 256 bits).")
        self._aesgcm = AESGCM(self._key)

    def encrypt_dict(self, payload: dict[str, str]) -> bytes:
        """Encrypts a Python dictionary into a secure binary blob (Nonce + Ciphertext)."""
        nonce = os.urandom(12)  # 96-bit NIST-recommended GCM nonce
        plaintext = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        ciphertext = self._aesgcm.encrypt(nonce, plaintext, associated_data=None)
        return nonce + ciphertext

    def decrypt_dict(self, blob: bytes) -> bytes:
        """Decrypts a binary blob back into the original Python dictionary."""
        nonce, ciphertext = blob[:12], blob[12:]
        plaintext = self._aesgcm.decrypt(nonce, ciphertext, associated_data=None)
        return json.loads(plaintext.decode("utf-8"))


aes_vault = AESVaultCipher()