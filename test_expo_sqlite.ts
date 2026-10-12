import { getDB } from './src/database/db';
import { addJob, getDashboardStats, updateJob, deleteJob } from './src/database/jobsRepository';
import { createPayment, updatePayment, deletePayment, getSumByJobAndType } from './src/database/paymentsRepository';
import { createExpense, updateExpense, deleteExpense, getSumByJob } from './src/database/expensesRepository';
import { nowISO } from './src/utils/dates';

async function testCRUD() {
  console.log('Testing CRUD operations...');
  try {
    const db = await getDB();
    console.log('DB connected.');

    // 1. Create a Job
    console.log('1. Adding Job...');
    const jobId = await addJob({
      job_date: '2023-10-10',
      phone_number: '1234567890',
      client_name: 'Test Client',
      job_description: 'Test Job',
      quantity: 1,
      c_rate_paise: 10000,
      c_design_charge_paise: 0,
      c_total_paise: 10000,
      svk_rate_paise: 5000,
      svk_total_paise: 5000,
      ipz_total_paise: 10000,
      remarks: 'Test',
      expected_delivery_date: '2023-10-15',
      delivery_status: 'In Progress'
    });
    console.log('Job added with ID:', jobId);

    // 2. Update Job
    console.log('2. Updating Job...');
    await updateJob(jobId, { job_description: 'Updated Job' });
    console.log('Job updated.');

    // 3. Create Payment
    console.log('3. Adding Payment...');
    const paymentId = await createPayment({
      job_id: jobId,
      account_type: 'C',
      amount_paise: 5000,
      payment_date: '2023-10-11',
      payment_method: 'Cash'
    });
    console.log('Payment added with ID:', paymentId);

    // 4. Update Payment
    console.log('4. Updating Payment...');
    await updatePayment(paymentId, { amount_paise: 6000 });
    console.log('Payment updated.');

    // 5. Create Expense
    console.log('5. Adding Expense...');
    const expenseId = await createExpense({
      job_id: jobId,
      description: 'Test Expense',
      amount_paise: 2000,
      expense_date: '2023-10-12'
    });
    console.log('Expense added with ID:', expenseId);

    // 6. Update Expense
    console.log('6. Updating Expense...');
    await updateExpense(expenseId, { amount_paise: 3000 });
    console.log('Expense updated.');

    // 7. Get Dashboard Stats
    console.log('7. Getting Dashboard Stats...');
    const stats = await getDashboardStats();
    console.log('Stats:', stats);

    // 8. Delete everything
    console.log('8. Deleting records...');
    await deleteExpense(expenseId);
    await deletePayment(paymentId);
    await deleteJob(jobId);
    console.log('Records deleted successfully.');

    console.log('ALL CRUD OPERATIONS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error during CRUD test:', err);
  }
}

testCRUD();
