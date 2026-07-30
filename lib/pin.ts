const PIN_PATTERN = /^\d{4}$/;

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && PIN_PATTERN.test(pin);
}

// Convert string to ArrayBuffer
function str2ab(str: string) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

// Convert ArrayBuffer to hex string
function ab2hex(buffer: ArrayBuffer) {
  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

export async function hashPin(pin: string) {
  const saltArray = new Uint8Array(16);
  crypto.getRandomValues(saltArray);
  const salt = ab2hex(saltArray.buffer);
  
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hash = ab2hex(hashBuffer);
  return `${salt}:${hash}`;
}

export async function verifyPin(pin: string, storedHash: string | null | undefined) {
  if (!storedHash || !isValidPin(pin)) return false;
  const [salt, expectedHash] = storedHash.split(":");
  if (!salt || !expectedHash) return false;

  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const actualHashBuffer = await crypto.subtle.digest("SHA-256", data);
  const actualHash = ab2hex(actualHashBuffer);

  return expectedHash === actualHash;
}

