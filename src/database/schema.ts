export const DELIVERY_STATUSES = ['Pending', 'In Progress', 'Ready', 'Delivered'] as const;
export type DeliveryStatus = typeof DELIVERY_STATUSES[number];

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Other'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export const ACCOUNT_TYPES = ['C', 'SVK'] as const;
export type AccountType = typeof ACCOUNT_TYPES[number];

export interface Job {
  id: number;
  job_date: string;
  phone_number: string;
  client_name: string;
  job_description: string;
  quantity: number;
  c_rate_paise: number;
  c_design_charge_paise: number;
  c_total_paise: number;
  svk_rate_paise: number;
  svk_total_paise: number;
  ipz_total_paise: number;
  remarks: string;
  expected_delivery_date: string;
  actual_delivery_date: string;
  delivery_status: DeliveryStatus;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  job_id: number;
  account_type: AccountType;
  amount_paise: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number: string;
  notes: string;
  created_at: string;
}

export interface Expense {
  id: number;
  job_id: number;
  description: string;
  amount_paise: number;
  expense_date: string;
  notes: string;
  created_at: string;
}

export interface JobWithTotals extends Job {
  customer_paid_paise: number;
  svk_paid_paise: number;
  customer_balance_paise: number;
  svk_balance_paise: number;
  total_expenses_paise: number;
  ipz_profit_paise: number;
}
