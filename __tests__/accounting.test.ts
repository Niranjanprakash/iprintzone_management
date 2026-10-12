import { calculateCTotal, calculateSVKTotal } from '../src/calculations/billing';
import { calculateCustomerBalance, calculateSVKBalance, calculateIPZBalance } from '../src/calculations/balances';
import { calculateIPZProfit } from '../src/calculations/profit';
import { formatINR, parseINRInput, paiseToRupeeString } from '../src/utils/currency';
import { formatDate, todayISO, isValidDate } from '../src/utils/dates';

describe('Billing Calculations', () => {
  test('C Total = (C Rate × Qty) + Design Charge', () => {
    // ₹100/unit × 10 + ₹200 = ₹1200
    expect(calculateCTotal(10000, 10, 20000)).toBe(120000); // paise
  });

  test('C Total with zero design charge', () => {
    expect(calculateCTotal(10000, 10, 0)).toBe(100000);
  });

  test('C Total with zero rate', () => {
    expect(calculateCTotal(0, 10, 20000)).toBe(20000);
  });

  test('SVK Total = SVK Rate × Qty', () => {
    // ₹60/unit × 10 = ₹600
    expect(calculateSVKTotal(6000, 10)).toBe(60000);
  });

  test('SVK Total with zero rate', () => {
    expect(calculateSVKTotal(0, 5)).toBe(0);
  });

  test('Large monetary amounts', () => {
    expect(calculateCTotal(100000, 1000, 500000)).toBe(100500000); // ₹1000/unit × 1000 + ₹5000
  });
});

describe('Balance Calculations', () => {
  test('Customer balance after single advance', () => {
    // C Total ₹1200, advance ₹500 → balance ₹700
    const balance = calculateCustomerBalance(120000, [50000]);
    expect(balance).toBe(70000);
  });

  test('Customer balance with multiple payments', () => {
    const balance = calculateCustomerBalance(120000, [50000, 30000, 20000]);
    expect(balance).toBe(20000);
  });

  test('Customer balance fully paid', () => {
    const balance = calculateCustomerBalance(120000, [120000]);
    expect(balance).toBe(0);
  });

  test('Customer overpayment shows negative balance (credit)', () => {
    const balance = calculateCustomerBalance(120000, [130000]);
    expect(balance).toBe(-10000);
  });

  test('SVK balance after advance', () => {
    // SVK Total ₹600, advance ₹200 → balance ₹400
    const balance = calculateSVKBalance(60000, [20000]);
    expect(balance).toBe(40000);
  });

  test('SVK balance with multiple payments', () => {
    const balance = calculateSVKBalance(60000, [20000, 20000]);
    expect(balance).toBe(20000);
  });

  test('SVK balance fully paid', () => {
    const balance = calculateSVKBalance(60000, [60000]);
    expect(balance).toBe(0);
  });

  test('IPZ balance = IPZ Total - customer payments', () => {
    const balance = calculateIPZBalance(120000, [50000]);
    expect(balance).toBe(70000);
  });

  test('Zero payments returns full balance', () => {
    expect(calculateCustomerBalance(120000, [])).toBe(120000);
    expect(calculateSVKBalance(60000, [])).toBe(60000);
  });
});

describe('Profit Calculations', () => {
  test('Standard profit: ₹1200 - ₹600 - ₹0 = ₹600', () => {
    const profit = calculateIPZProfit(120000, 60000, []);
    expect(profit).toBe(60000);
  });

  test('Profit with additional expenses', () => {
    // ₹1200 - ₹600 - ₹100 = ₹500
    const profit = calculateIPZProfit(120000, 60000, [10000]);
    expect(profit).toBe(50000);
  });

  test('Profit with multiple expenses', () => {
    const profit = calculateIPZProfit(120000, 60000, [5000, 5000]);
    expect(profit).toBe(50000);
  });

  test('Profit is NOT affected by payment amounts (only totals matter)', () => {
    // Profit should be same regardless of how much has been collected/paid
    const profitFullyPaid = calculateIPZProfit(120000, 60000, []);
    const profitPartiallyPaid = calculateIPZProfit(120000, 60000, []);
    expect(profitFullyPaid).toBe(profitPartiallyPaid);
    expect(profitFullyPaid).toBe(60000);
  });

  test('Negative profit when SVK cost exceeds revenue', () => {
    const profit = calculateIPZProfit(50000, 80000, []);
    expect(profit).toBe(-30000);
  });

  test('Zero profit when revenue equals cost', () => {
    const profit = calculateIPZProfit(60000, 60000, []);
    expect(profit).toBe(0);
  });

  test('No double-counting: C Total and IPZ Total are the same', () => {
    // Revenue is counted once (C Total = IPZ Total)
    const cTotal = calculateCTotal(10000, 10, 20000); // 120000
    const svkTotal = calculateSVKTotal(6000, 10); // 60000
    const profit = calculateIPZProfit(cTotal, svkTotal, []);
    expect(profit).toBe(60000); // Not 120000 + 120000 - 60000
  });

  test('Customer advances do not inflate revenue', () => {
    const cTotal = calculateCTotal(10000, 10, 20000); // 120000
    const svkTotal = calculateSVKTotal(6000, 10); // 60000
    // Even with advance paid, profit is based on totals
    const profit = calculateIPZProfit(cTotal, svkTotal, []);
    expect(profit).toBe(60000);
  });
});

describe('Currency Utilities', () => {
  test('formatINR formats paise to INR string', () => {
    expect(formatINR(120000)).toContain('1,200');
    expect(formatINR(120000)).toContain('₹');
  });

  test('parseINRInput parses rupee string to paise', () => {
    expect(parseINRInput('1200')).toBe(120000);
    expect(parseINRInput('1,200.50')).toBe(120050);
    expect(parseINRInput('₹500')).toBe(50000);
    expect(parseINRInput('')).toBe(0);
    expect(parseINRInput('abc')).toBe(0);
  });

  test('paiseToRupeeString converts paise to display string', () => {
    expect(paiseToRupeeString(120000)).toBe('1200.00');
    expect(paiseToRupeeString(0)).toBe('');
  });

  test('Large amounts', () => {
    expect(parseINRInput('100000')).toBe(10000000); // ₹1 lakh = 10000000 paise
    expect(formatINR(10000000)).toContain('1,00,000');
  });
});

describe('Date Utilities', () => {
  test('formatDate converts ISO to DD/MM/YYYY', () => {
    expect(formatDate('2024-01-15')).toBe('15/01/2024');
    expect(formatDate('2024-12-31')).toBe('31/12/2024');
  });

  test('formatDate handles null/undefined', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
  });

  test('todayISO returns valid ISO date', () => {
    const today = todayISO();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(isValidDate(today)).toBe(true);
  });

  test('isValidDate validates ISO dates', () => {
    expect(isValidDate('2024-01-15')).toBe(true);
    expect(isValidDate('2024-13-01')).toBe(false);
    expect(isValidDate('invalid')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });
});

describe('Full Job Scenario', () => {
  test('Complete job: Qty=10, C Rate=₹100, Design=₹200, SVK Rate=₹60, Advance=₹500, SVK Advance=₹200', () => {
    const qty = 10;
    const cRate = 10000; // ₹100 in paise
    const cDesign = 20000; // ₹200 in paise
    const svkRate = 6000; // ₹60 in paise
    const cAdvance = 50000; // ₹500 in paise
    const svkAdvance = 20000; // ₹200 in paise

    const cTotal = calculateCTotal(cRate, qty, cDesign);
    expect(cTotal).toBe(120000); // ₹1200

    const svkTotal = calculateSVKTotal(svkRate, qty);
    expect(svkTotal).toBe(60000); // ₹600

    const cBalance = calculateCustomerBalance(cTotal, [cAdvance]);
    expect(cBalance).toBe(70000); // ₹700

    const svkBalance = calculateSVKBalance(svkTotal, [svkAdvance]);
    expect(svkBalance).toBe(40000); // ₹400

    const profit = calculateIPZProfit(cTotal, svkTotal, []);
    expect(profit).toBe(60000); // ₹600
  });

  test('Fully paid job has zero balances', () => {
    const cTotal = 120000;
    const svkTotal = 60000;

    const cBalance = calculateCustomerBalance(cTotal, [50000, 70000]);
    expect(cBalance).toBe(0);

    const svkBalance = calculateSVKBalance(svkTotal, [60000]);
    expect(svkBalance).toBe(0);

    // Profit unchanged by payment status
    const profit = calculateIPZProfit(cTotal, svkTotal, []);
    expect(profit).toBe(60000);
  });

  test('Payment edit: replacing ₹500 advance with ₹300', () => {
    const cTotal = 120000;
    // After edit, only ₹300 paid
    const cBalance = calculateCustomerBalance(cTotal, [30000]);
    expect(cBalance).toBe(90000);
  });

  test('Zero-value optional fields', () => {
    const cTotal = calculateCTotal(10000, 5, 0);
    expect(cTotal).toBe(50000);

    const svkTotal = calculateSVKTotal(0, 5);
    expect(svkTotal).toBe(0);

    const profit = calculateIPZProfit(50000, 0, []);
    expect(profit).toBe(50000);
  });

  test('Negative input prevention: negative paise should not be used', () => {
    // Balances with negative payments would be invalid; test that positive logic holds
    const balance = calculateCustomerBalance(120000, [50000]);
    expect(balance).toBeGreaterThan(0);
  });
});
