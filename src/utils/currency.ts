// All monetary values stored as integer paise (1 INR = 100 paise)

export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(rupees);
}

export function formatINRCompact(paise: number): string {
  const rupees = paise / 100;
  if (Math.abs(rupees) >= 100000) {
    return `₹${(rupees / 100000).toFixed(2)}L`;
  }
  if (Math.abs(rupees) >= 1000) {
    return `₹${(rupees / 1000).toFixed(2)}K`;
  }
  return formatINR(paise);
}

/** Parse a rupee string input (e.g. "1,200.50") to integer paise */
export function parseINRInput(input: string): number {
  const cleaned = input.replace(/[₹,\s]/g, '');
  if (!cleaned || isNaN(Number(cleaned))) return 0;
  return Math.round(parseFloat(cleaned) * 100);
}

/** Convert paise to display rupee string for input fields */
export function paiseToRupeeString(paise: number): string {
  if (paise === 0) return '';
  return (paise / 100).toFixed(2);
}
