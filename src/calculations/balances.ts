/**
 * All amounts in integer paise.
 * Balances are computed from totals minus sum of actual payments.
 */

export function calculateCustomerBalance(cTotalPaise: number, customerPaymentsPaise: number[]): number {
  const paid = customerPaymentsPaise.reduce((s, p) => s + p, 0);
  return cTotalPaise - paid;
}

export function calculateSVKBalance(svkTotalPaise: number, svkPaymentsPaise: number[]): number {
  const paid = svkPaymentsPaise.reduce((s, p) => s + p, 0);
  return svkTotalPaise - paid;
}

export function calculateIPZBalance(ipzTotalPaise: number, customerPaymentsPaise: number[]): number {
  // IPZ Total = Customer Billing Total; balance = total - collected
  const collected = customerPaymentsPaise.reduce((s, p) => s + p, 0);
  return ipzTotalPaise - collected;
}
