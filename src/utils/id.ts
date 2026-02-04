import { randomBytes } from "crypto";

/**
 * Generate a unique memory ID.
 * Format: mem_{16 hex chars}
 */
export function generateMemoryId(): string {
  const random = randomBytes(8).toString("hex");
  return `mem_${random}`;
}

/**
 * Generate a unique filename for a memory file.
 * Format: HHMMSS_XXXX.md
 */
export function generateFilename(): string {
  const now = new Date();
  const time = [
    now.getHours().toString().padStart(2, "0"),
    now.getMinutes().toString().padStart(2, "0"),
    now.getSeconds().toString().padStart(2, "0"),
  ].join("");
  const random = randomBytes(2).toString("hex");
  return `${time}_${random}.md`;
}
