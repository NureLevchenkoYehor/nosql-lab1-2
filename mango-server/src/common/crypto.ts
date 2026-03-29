import { createHash } from "crypto"

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: "bcrypt" })
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash)
}

export function generateApiKey(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")
}

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex")
}