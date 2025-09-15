import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import the app setup from server
let appPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = import('../server/index.js');
  }
  return appPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { handler } = await getApp();
    return handler(req, res);
  } catch (error) {
    console.error('API Handler Error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error : 'Something went wrong'
    });
  }
}