import { createHash, randomBytes, timingSafeEqual } from "crypto";

const PIN_PATTERN = /^\d{4}$/;

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && PIN_PATTERN.test(pin);
}

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(`${salt}:${pin}`).digest("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, storedHash: string | null | undefined) {
  if (!storedHash || !isValidPin(pin)) return false;
  const [salt, expectedHash] = storedHash.split(":");
  if (!salt || !expectedHash) return false;

  const actualHash = createHash("sha256").update(`${salt}:${pin}`).digest("hex");
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(actualHash, "hex");

  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
