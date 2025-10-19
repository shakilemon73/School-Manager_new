import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import the app setup from server
let appPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    // Set NODE_ENV to production for serverless
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
    process.env.VERCEL = '1'; // Flag to indicate serverless environment
    
    // Import server/index.ts - Vercel will handle TypeScript compilation
    appPromise = import('../server/index.ts');
  }
  return appPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const module = await getApp();
    
    // The server/index.ts exports { app, handler }
    // We want the handler function which is the serverless wrapper
    if (module.handler) {
      return module.handler(req, res);
    }
    
    // Fallback if handler is not available
    console.error('Handler not found in server module');
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'Handler function not exported from server'
    });
  } catch (error: any) {
    console.error('API Handler Error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
