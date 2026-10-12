/**
 * IPZ Profit = Customer Revenue (C Total) - SVK Production Cost (SVK Total) - Other Job Expenses
 *
 * Rules:
 * - Customer revenue is C Total (billed amount), counted once.
 * - SVK production cost is SVK Total (full cost), counted once.
 * - Advances/payments do NOT affect profit; only outstanding balances change.
 * - Profit is based on full job values, not on what has been collected/paid.
 */

export function calculateIPZProfit(
  cTotalPaise: number,
  svkTotalPaise: number,
  otherExpensesPaise: number[]
): number {
  const totalExpenses = otherExpensesPaise.reduce((s, e) => s + e, 0);
  return cTotalPaise - svkTotalPaise - totalExpenses;
}
