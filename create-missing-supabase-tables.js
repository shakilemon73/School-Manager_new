import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_ANON_KEY; // This is actually the service key

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  console.error('SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createMissingTables() {
  console.log('🔄 Creating missing tables in Supabase...');

  try {
    // Create library_borrowed_books table (this was missing and causing the error)
    const borrowedBooksSQL = `
      CREATE TABLE IF NOT EXISTS library_borrowed_books (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        borrow_date DATE DEFAULT CURRENT_DATE,
        due_date DATE NOT NULL,
        return_date DATE NULL,
        status TEXT DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'overdue')),
        fine_amount DECIMAL(10,2) DEFAULT 0,
        notes TEXT,
        school_id INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES library_books(id) ON DELETE CASCADE
      );
    `;

    // Create credit system tables
    const creditBalancesSQL = `
      CREATE TABLE IF NOT EXISTS credit_balances (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        school_id INTEGER NOT NULL DEFAULT 1,
        credits INTEGER DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, school_id)
      );
    `;

    const creditTransactionsSQL = `
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        school_id INTEGER NOT NULL DEFAULT 1,
        amount INTEGER NOT NULL,
        transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'bonus')),
        description TEXT,
        payment_method TEXT,
        payment_reference TEXT,
        status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Execute the SQL commands
    console.log('Creating library_borrowed_books table...');
    const { error: borrowedError } = await supabase.rpc('exec_sql', { sql: borrowedBooksSQL });
    if (borrowedError) console.log('Note: library_borrowed_books table creation:', borrowedError.message);
    else console.log('✓ library_borrowed_books table created');

    console.log('Creating credit_balances table...');
    const { error: balanceError } = await supabase.rpc('exec_sql', { sql: creditBalancesSQL });
    if (balanceError) console.log('Note: credit_balances table creation:', balanceError.message);
    else console.log('✓ credit_balances table created');

    console.log('Creating credit_transactions table...');
    const { error: transactionError } = await supabase.rpc('exec_sql', { sql: creditTransactionsSQL });
    if (transactionError) console.log('Note: credit_transactions table creation:', transactionError.message);
    else console.log('✓ credit_transactions table created');

    console.log('🎉 Missing tables creation completed!');

    // Test the relationship that was failing
    console.log('Testing library borrowed books relationship...');
    const { data: testData, error: testError } = await supabase
      .from('library_borrowed_books')
      .select('id, student_id, students(name)')
      .limit(1);
    
    if (testError) {
      console.log('⚠️ Relationship test result:', testError.message);
    } else {
      console.log('✅ Library borrowed books relationship is working!');
    }

  } catch (error) {
    console.error('❌ Error creating tables:', error);
  }
}

createMissingTables();