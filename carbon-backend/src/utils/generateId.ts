/**
 * Utility to generate unique IDs for emission records & attachments
 * Format: rec-172600123
 */
export function generateRecordId(prefix: string = "rec"): string {
  const timestamp = Date.now().toString().slice(-6);
  const randomSuffix = Math.floor(100 + Math.random() * 900).toString();
  return `${prefix}-${timestamp}${randomSuffix}`;
}
