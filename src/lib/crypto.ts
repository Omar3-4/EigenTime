export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"],
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function encryptData(text: string, password: string): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text),
  );

  const cipherArray = new Uint8Array(cipherBuffer);
  const combined = new Uint8Array(salt.length + iv.length + cipherArray.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(cipherArray, salt.length + iv.length);

  // Base64 encode
  const bin = String.fromCharCode(...combined);
  return btoa(bin);
}

export async function decryptData(b64: string, password: string): Promise<string> {
  const bin = atob(b64);
  const combined = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) combined[i] = bin.charCodeAt(i);

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const cipherArray = combined.slice(28);

  const key = await deriveKey(password, salt);
  const plainBuffer = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherArray);

  const dec = new TextDecoder();
  return dec.decode(plainBuffer);
}
