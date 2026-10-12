const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  // 1. Run migrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_date TEXT NOT NULL,
      phone_number TEXT NOT NULL DEFAULT '',
      client_name TEXT NOT NULL,
      job_description TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      c_rate_paise INTEGER NOT NULL DEFAULT 0,
      c_design_charge_paise INTEGER NOT NULL DEFAULT 0,
      c_total_paise INTEGER NOT NULL DEFAULT 0,
      svk_rate_paise INTEGER NOT NULL DEFAULT 0,
      svk_total_paise INTEGER NOT NULL DEFAULT 0,
      ipz_total_paise INTEGER NOT NULL DEFAULT 0,
      remarks TEXT NOT NULL DEFAULT '',
      expected_delivery_date TEXT NOT NULL DEFAULT '',
      actual_delivery_date TEXT NOT NULL DEFAULT '',
      delivery_status TEXT NOT NULL DEFAULT 'Pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      account_type TEXT NOT NULL CHECK(account_type IN ('C','SVK')),
      amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
      payment_date TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      reference_number TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      amount_paise INTEGER NOT NULL CHECK(amount_paise >= 0),
      expense_date TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );
  `);

  console.log("Database initialized successfully.");

  // Add Job
  const now = new Date().toISOString();
  db.run(`INSERT INTO jobs (job_date, phone_number, client_name, job_description, quantity,
      c_rate_paise, c_design_charge_paise, c_total_paise,
      svk_rate_paise, svk_total_paise, ipz_total_paise,
      remarks, expected_delivery_date, actual_delivery_date, delivery_status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'',?,?,?)`, 
     ['2023-10-10', '1234567890', 'Client A', 'Posters', 10, 1000, 0, 10000, 500, 5000, 10000, 'Urgent', '2023-10-15', 'Pending', now, now], 
     function(err) {
       if (err) throw err;
       const jobId = this.lastID;
       console.log("Job ADDED successfully, ID: " + jobId);

       // Add Payment
       db.run(`INSERT INTO payments (job_id, account_type, amount_paise, payment_date, payment_method, reference_number, notes, created_at)
         VALUES (?,?,?,?,?,?,?,?)`, 
         [jobId, 'C', 5000, '2023-10-10', 'Cash', '', '', now], function(err) {
           if (err) throw err;
           const paymentId = this.lastID;
           console.log("Payment ADDED successfully, ID: " + paymentId);

           // Add Expense
           db.run(`INSERT INTO expenses (job_id, description, amount_paise, expense_date, notes, created_at)
             VALUES (?,?,?,?,?,?)`, 
             [jobId, 'Transportation', 1000, '2023-10-10', '', now], function(err) {
               if (err) throw err;
               const expenseId = this.lastID;
               console.log("Expense ADDED successfully, ID: " + expenseId);

               // Test Dashboard Query (the one we fixed)
               const dateFilter = '';
               db.get(`
                SELECT
                  COUNT(*) AS totalJobs,
                  SUM(j.c_total_paise) AS totalCustomerBilling,
                  COALESCE((SELECT SUM(p.amount_paise) FROM payments p
                    INNER JOIN jobs jj ON jj.id = p.job_id
                    ${dateFilter ? dateFilter.replace('j.', 'jj.') + ' AND' : 'WHERE'} p.account_type = 'C'), 0) AS totalCustomerCollected
                FROM jobs j
                ${dateFilter}
               `, (err, row) => {
                 if (err) throw err;
                 console.log("Dashboard GET successfully:", row);

                 // Update Job
                 db.run(`UPDATE jobs SET delivery_status = ?, updated_at = ? WHERE id = ?`, ['Delivered', now, jobId], function(err) {
                   if (err) throw err;
                   console.log("Job UPDATED successfully (Status changed to Delivered)");

                   // Delete Expense
                   db.run('DELETE FROM expenses WHERE id = ?', [expenseId], function(err) {
                     if (err) throw err;
                     console.log("Expense DELETED successfully");

                     // Delete Job
                     db.run('DELETE FROM jobs WHERE id = ?', [jobId], function(err) {
                       if (err) throw err;
                       console.log("Job DELETED successfully");

                       console.log("ALL DB OPERATIONS COMPLETED FLAWLESSLY!");
                     });
                   });
                 });
               });
           });
       });
  });
});
