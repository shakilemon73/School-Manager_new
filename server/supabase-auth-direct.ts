// Load environment variables
import { config } from 'dotenv';
config();

import { Express, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration with fallback
const getSupabaseConfig = () => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  // Use service role key for server-side operations, anon key as fallback
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  console.log('Server-side Supabase config:', {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'Found' : 'Missing',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'Found' : 'Missing',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'Found' : 'Missing'
  });
  
  return { url, key };
};

let supabaseAdmin: any = null;

export function registerSupabaseAuthRoutes(app: Express) {
  // Initialize Supabase client when needed
  const initSupabase = () => {
    if (!supabaseAdmin) {
      const { url, key } = getSupabaseConfig();
      if (url && key) {
        supabaseAdmin = createClient(url, key, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });
        console.log('✓ Supabase admin client initialized for authentication');
      }
    }
    return supabaseAdmin;
  };

  // Direct user registration endpoint
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const client = initSupabase();
      if (!client) {
        return res.status(500).json({ error: 'Supabase not configured' });
      }

      const { email, password, userData } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      // Generate unique tracking ID
      const userTrackingId = `USER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const enhancedUserData = {
        ...userData,
        user_tracking_id: userTrackingId,
        registration_date: new Date().toISOString(),
        status: 'active',
        language: userData?.language || 'bn'
      };

      console.log('Creating user with regular signup to trigger confirmation email:', { email, userData: enhancedUserData });

      // Use admin createUser to bypass email confirmation for demo
      const { data, error } = await client.auth.admin.createUser({
        email,
        password,
        user_metadata: enhancedUserData,
        email_confirm: true // Auto-confirm email for demo accounts
      });

      if (error) {
        console.error('Supabase admin create user error:', error);
        return res.status(400).json({ error: error.message });
      }

      console.log('User created successfully with tracking ID:', userTrackingId);
      
      const needsConfirmation = !data.user?.email_confirmed_at;

      res.json({
        success: true,
        user: data.user,
        trackingId: userTrackingId,
        needsConfirmation: needsConfirmation,
        message: needsConfirmation 
          ? 'Registration successful. Please check your email for confirmation link.' 
          : 'Registration and email confirmation completed successfully'
      });

    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ error: error.message || 'Registration failed' });
    }
  });

  // Direct user login endpoint
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const client = initSupabase();
      if (!client) {
        return res.status(500).json({ error: 'Supabase not configured' });
      }

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      console.log('Attempting login for:', email);

      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        return res.status(400).json({ error: error.message });
      }

      console.log('Login successful for:', email);

      // Set session cookie for subsequent requests
      if (data.session?.access_token) {
        res.cookie('sb-access-token', data.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: data.session.expires_in * 1000 // Convert to milliseconds
        });
      }

      res.json({
        success: true,
        user: data.user,
        session: data.session,
        message: 'Login successful'
      });

    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: error.message || 'Login failed' });
    }
  });

  // Get all users for admin management
  app.get('/api/auth/users', async (req: Request, res: Response) => {
    try {
      const client = initSupabase();
      if (!client) {
        return res.status(500).json({ error: 'Supabase not configured' });
      }

      const { data, error } = await client.auth.admin.listUsers();

      if (error) {
        console.error('List users error:', error);
        return res.status(400).json({ error: error.message });
      }

      const users = data.users.map(user => ({
        id: user.id,
        email: user.email,
        trackingId: user.user_metadata?.user_tracking_id,
        registrationDate: user.user_metadata?.registration_date,
        status: user.user_metadata?.status,
        language: user.user_metadata?.language,
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
        emailConfirmed: user.email_confirmed_at !== null
      }));

      res.json({ users });

    } catch (error: any) {
      console.error('List users error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch users' });
    }
  });

  // Update user status
  app.patch('/api/auth/users/:id/status', async (req: Request, res: Response) => {
    try {
      const client = initSupabase();
      if (!client) {
        return res.status(500).json({ error: 'Supabase not configured' });
      }

      const { id } = req.params;
      const { status } = req.body;

      const { data, error } = await client.auth.admin.updateUserById(id, {
        user_metadata: { status }
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ success: true, user: data.user });

    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update user' });
    }
  });

  // Delete user
  app.delete('/api/auth/users/:id', async (req: Request, res: Response) => {
    try {
      const client = initSupabase();
      if (!client) {
        return res.status(500).json({ error: 'Supabase not configured' });
      }

      const { id } = req.params;

      const { error } = await client.auth.admin.deleteUser(id);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ success: true, message: 'User deleted successfully' });

    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete user' });
    }
  });

  // Resend confirmation email
  app.post('/api/auth/resend-confirmation', async (req: Request, res: Response) => {
    try {
      const client = initSupabase();
      if (!client) {
        return res.status(500).json({ error: 'Supabase not configured' });
      }

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const { data, error } = await client.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        console.error('Resend confirmation error:', error);
        return res.status(400).json({ error: error.message });
      }

      res.json({ 
        success: true, 
        message: 'Confirmation email sent successfully' 
      });

    } catch (error: any) {
      console.error('Resend confirmation error:', error);
      res.status(500).json({ error: error.message || 'Failed to resend confirmation email' });
    }
  });
}