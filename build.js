#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting production build...');

// Set production environment
process.env.NODE_ENV = 'production';

try {
  // Build the client
  console.log('📦 Building client...');
  execSync('vite build', { stdio: 'inherit' });
  
  // Check if build was successful (vite outputs to /public)
  const distPath = path.resolve('public');
  if (!fs.existsSync(distPath)) {
    throw new Error('Build failed - public directory not found');
  }
  
  console.log('✅ Client build completed successfully');
  
  // Push database schema
  console.log('🗄️  Pushing database schema...');
  execSync('npm run db:push', { stdio: 'inherit' });
  
  console.log('✅ Production build completed successfully');
  console.log('🌐 Ready for deployment!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}