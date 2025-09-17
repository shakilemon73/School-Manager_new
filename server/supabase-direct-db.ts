import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Create a compatible database interface using Supabase
export const supabaseDb = {
  // Users operations
  async getUser(username: string) {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username)
      .single();
    return data;
  },

  async createUser(user: any) {
    const { data, error } = await supabase
      .from('app_users')
      .insert(user)
      .select()
      .single();
    return data;
  },

  async getAllSchoolInstances() {
    const { data, error } = await supabase
      .from('school_instances')
      .select('*');
    return data || [];
  },

  async initializeDefaultPlans() {
    // Default plans data
    const defaultPlans = [
      {
        plan_id: 'basic',
        name: 'Basic Plan',
        description: 'Perfect for small schools',
        price: 99.00,
        billing_cycle: 'monthly',
        features: JSON.stringify(['Basic Features']),
        limits: JSON.stringify({ students: 100, teachers: 10 }),
        is_active: true
      }
    ];

    for (const plan of defaultPlans) {
      const { error } = await supabase
        .from('subscription_plans')
        .upsert(plan, { onConflict: 'plan_id' });
    }
  }
};

console.log('✓ Supabase direct database interface initialized');