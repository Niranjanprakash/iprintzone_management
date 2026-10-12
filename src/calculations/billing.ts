/**
 * All amounts in integer paise.
 * C Total = (C Rate × Quantity) + C Design Charge
 * SVK Total = SVK Rate × Quantity
 */

export function calculateCTotal(
  cRatePaise: number,
  quantity: number,
  cDesignChargePaise: number
): number {
  return Math.round(cRatePaise * quantity) + cDesignChargePaise;
}

export function calculateSVKTotal(svkRatePaise: number, quantity: number): number {
  return Math.round(svkRatePaise * quantity);
}
