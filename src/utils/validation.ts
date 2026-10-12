export function validateRequired(value: string | null | undefined, field: string): string | null {
  if (!value || value.trim() === '') return `${field} is required`;
  return null;
}

export function validatePositiveInt(value: number, field: string): string | null {
  if (!Number.isInteger(value) || value <= 0) return `${field} must be a positive whole number`;
  return null;
}

export function validateNonNegativePaise(paise: number, field: string): string | null {
  if (!Number.isInteger(paise) || paise < 0) return `${field} must be zero or a positive amount`;
  return null;
}

export function validatePositivePaise(paise: number, field: string): string | null {
  if (!Number.isInteger(paise) || paise <= 0) return `${field} must be a positive amount`;
  return null;
}

export function validatePhone(phone: string): string | null {
  if (!phone) return null; // optional
  const cleaned = phone.replace(/\s/g, '');
  if (!/^\+?[\d]{7,15}$/.test(cleaned)) return 'Invalid phone number';
  return null;
}
