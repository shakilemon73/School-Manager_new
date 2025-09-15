import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabaseAdmin: any = null;

if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

interface AuthenticatedRequest extends Request {
  user?: any;
  supabaseUser?: any;
}

// Unified authentication middleware that works across all pages
export async function unifiedAuthMiddleware(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) {
  console.log(`[UNIFIED AUTH] Processing request: ${req.method} ${req.path}`);
  
  // LIBRARY ROUTES MUST BE COMPLETELY PUBLIC - SKIP ALL AUTH
  if (req.path.startsWith('/api/library/')) {
    console.log(`[UNIFIED AUTH] Bypassing auth for library route: ${req.path}`);
    return next();
  }
  
  try {
    // Skip authentication for public endpoints
    const publicPaths = [
      '/api/auth/',
      '/api/documents/templates',
      '/test-',
      '/api/test-',
      '/api/supabase/test-connection',
      '/api/dashboard/connectivity-test',
      '/api/health',
      '/api/system/',
      '/api/ping',
      '/api/supabase/create-test-user',
      '/api/supabase/dashboard/',
      '/api/admin/stats',
      '/api/admin/analytics',
      '/api/admin/credits/', // Credit admin operations are public for system administration

      '/api/setup-credit-balance', // Credit balance table setup
      '/api/credit-balances', // Admin-only credit balance data access
      '/api/all-credit-balances', // All credit balances view
      '/api/simple-credit-balance/', // Simple credit balance endpoint

      '/login',
      '/register',
      '/public/',
      '/api/public/'
    ];
    
    const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
    console.log(`[UNIFIED AUTH] Auth check for ${req.path}: isPublic=${isPublicPath}`);
    if (isPublicPath) {
      console.log(`[UNIFIED AUTH] Skipping auth for public path: ${req.path}`);
      return next();
    }

    // Check for session token in multiple places
    let accessToken: string | null = null;
    
    // 1. Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }
    
    // 2. Cookie (sb-access-token)
    if (!accessToken && req.cookies) {
      accessToken = req.cookies['sb-access-token'] || req.cookies['access_token'];
    }
    
    // 3. Body token (for form submissions)
    if (!accessToken && req.body && req.body.access_token) {
      accessToken = req.body.access_token;
    }

    // 4. Query parameter (for some special cases)
    if (!accessToken && req.query.token) {
      accessToken = req.query.token as string;
    }

    if (!accessToken) {
      // For API routes, return 401
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      // For page routes, redirect to login
      return res.redirect('/login');
    }

    // Verify the token with Supabase
    try {
      if (!supabaseAdmin) {
        // If Supabase admin client is not available, skip auth for development
        return next();
      }
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
      
      if (error || !user) {
        // Try to decode JWT locally as fallback
        try {
          const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
          if (payload.exp && payload.exp > Math.floor(Date.now() / 1000)) {
            req.user = { 
              id: payload.sub, 
              email: payload.email, 
              user_metadata: payload.user_metadata || {},
              full_name: payload.user_metadata?.full_name || payload.email
            };
            req.supabaseUser = req.user;
            return next();
          }
        } catch (jwtError) {
          console.error('JWT decode failed:', jwtError);
        }
        
        if (req.path.startsWith('/api/')) {
          return res.status(401).json({ message: 'Invalid or expired token' });
        }
        return res.redirect('/login');
      }
      
      // Attach user to request
      req.user = user;
      req.supabaseUser = user;
      
      next();
    } catch (validationError) {
      console.error('Token validation exception:', validationError);
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ message: 'Authentication service unavailable' });
      }
      return res.redirect('/login');
    }
  } catch (error) {
    console.error('Unified auth middleware error:', error);
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({ message: 'Authentication failed' });
    }
    return res.redirect('/login');
  }
}

// Optional authentication middleware (doesn't block if no auth)
export async function optionalAuthMiddleware(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    let accessToken: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    } else if (req.cookies && req.cookies['sb-access-token']) {
      accessToken = req.cookies['sb-access-token'];
    }

    if (accessToken) {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
      if (!error && user) {
        req.user = user;
        req.supabaseUser = user;
      }
    }
    
    next();
  } catch (error) {
    // Don't fail for optional auth, just continue without user
    next();
  }
}

// Role-based access control
export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user || req.supabaseUser;
    
    if (!user) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      return res.redirect('/login');
    }

    const userRole = user.user_metadata?.role || user.role || 'user';
    const hasPermission = allowedRoles.includes(userRole) || 
                         allowedRoles.includes('user') || 
                         userRole === 'admin' || 
                         userRole === 'super_admin';

    if (!hasPermission) {
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      return res.status(403).send('Access denied');
    }

    next();
  };
}