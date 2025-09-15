import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import { config } from 'dotenv';

// Load environment variables
config();

// Use environment variables for secure database connection
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

console.log('🔧 Using DATABASE_URL environment variable for secure connection');
console.log('🔍 Testing Supabase database connection...');
console.log('🔗 Connection format:', databaseUrl.substring(0, 50) + '...');

console.log('✅ Using Supabase PostgreSQL from DATABASE_URL');
console.log('🔄 Connecting to Supabase PostgreSQL...');
console.log('Database URL format:', databaseUrl.substring(0, 50) + '...');

// Optimized postgres client for Supabase with control plane error prevention
const client = postgres(databaseUrl, {
  // Core settings to prevent control plane requests
  prepare: false,
  fetch_types: false,
  publications: 'supabase_realtime',
  
  // Connection optimization for serverless/pooled connections
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: true } 
    : (process.env.ALLOW_INSECURE_DEV_SSL === 'true' ? { rejectUnauthorized: false } : 'require'),
  max: Number(process.env.PG_MAX || 3),
  idle_timeout: 20,
  connect_timeout: 10,
  keep_alive: 1,
  
  // Suppress verbose output that can trigger control plane calls
  debug: false,
  onnotice: () => {},
  onparameter: () => {},
  
  // Transform settings for compatibility
  transform: {
    undefined: null
  }
});

// Connection health tracking
let connectionHealthy = false;

const testConnection = async () => {
  try {
    // Simple test query that avoids control plane dependencies
    await client`SELECT 1`;
    connectionHealthy = true;
    console.log('✓ Supabase PostgreSQL connection verified');
  } catch (error: any) {
    console.log('⚠ Database connection issue:', error.message);
    connectionHealthy = false;
  }
};

// Enhanced query wrapper for safe database operations
export const safeDbQuery = async <T>(
  queryFn: () => Promise<T>,
  fallbackValue: T,
  queryDescription: string = 'query'
): Promise<T> => {
  try {
    return await queryFn();
  } catch (error: any) {
    console.log(`⚠ ${queryDescription} failed:`, error.message);
    throw error;
  }
};

// Initialize connection
testConnection();

export const db = drizzle(client, { schema });

// Create mock pool for session store compatibility
export const pool = {
  query: async (text: string, params?: any[]) => {
    if (!connectionHealthy) {
      throw new Error('Database connection not available');
    }
    const result = await client.unsafe(text, params);
    return { rows: result };
  },
  end: async () => client.end(),
  on: (event: string, callback: Function) => {},
  isHealthy: () => connectionHealthy
};

console.log('✓ Supabase PostgreSQL connection configured');