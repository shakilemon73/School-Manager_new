import type { Express, Request, Response } from "express";

interface AuthenticatedRequest extends Request {
  user?: any;
  session?: any;
}

export function registerDashboardRoutes(app: Express) {
  
  // Dashboard stats endpoint - DEPRECATED: Use direct Supabase calls from frontend
  app.get('/api/dashboard/stats', async (req: AuthenticatedRequest, res: Response) => {
    res.status(410).json({ 
      error: 'This endpoint is deprecated. Use direct Supabase calls with RLS policies.' 
    });
  });

  // Dashboard activities endpoint - DEPRECATED: Use direct Supabase calls from frontend
  app.get('/api/dashboard/activities', async (req: AuthenticatedRequest, res: Response) => {
    res.status(410).json({ 
      error: 'This endpoint is deprecated. Use direct Supabase calls with RLS policies.' 
    });
  });

  // Dashboard documents endpoint - DEPRECATED: Use direct Supabase calls from frontend
  app.get('/api/dashboard/documents', async (req: AuthenticatedRequest, res: Response) => {
    res.status(410).json({ 
      error: 'This endpoint is deprecated. Use direct Supabase calls with RLS policies.' 
    });
  });
}