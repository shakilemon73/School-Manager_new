import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_ANON_KEY; // This is actually the service key

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTables() {
  console.log('📊 Checking existing tables in Supabase...');

  try {
    // Check what tables exist by trying to query them
    const tablesToCheck = [
      'students',
      'teachers', 
      'library_books',
      'library_borrowed_books',
      'credit_balances',
      'credit_transactions',
      'notifications',
      'document_templates',
      'calendar_events',
      'schools'
    ];

    const results = {};

    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          results[table] = `❌ ${error.message}`;
        } else {
          results[table] = `✅ EXISTS (${data?.length || 0} records found)`;
        }
      } catch (err) {
        results[table] = `❌ ${err.message}`;
      }
    }

    console.log('\nTable Status:');
    console.log('='.repeat(50));
    for (const [table, status] of Object.entries(results)) {
      console.log(`${table}: ${status}`);
    }

  } catch (error) {
    console.error('❌ Error checking tables:', error);
  }
}

checkTables();