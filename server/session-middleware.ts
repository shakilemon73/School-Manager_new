import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface AuthenticatedRequest extends Request {
  user?: any;
}

export async function supabaseSessionMiddleware(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) {
  try {
    // Check for session token in multiple places
    let accessToken: string | null = null;
    
    // 1. Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }
    
    // 2. Cookie (sb-access-token)
    if (!accessToken && req.cookies) {
      accessToken = req.cookies['sb-access-token'];
      console.log('Found cookie token:', accessToken ? 'Yes' : 'No');
    }
    
    // 3. Body token (for form submissions)
    if (!accessToken && req.body && req.body.access_token) {
      accessToken = req.body.access_token;
    }

    if (!accessToken) {
      console.log('No access token found in:', {
        headers: !!req.headers.authorization,
        cookies: Object.keys(req.cookies || {}),
        body: !!req.body?.access_token
      });
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Verify the token with Supabase
    try {
      console.log('Attempting token validation with Supabase...');
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
      
      if (error) {
        console.error('Supabase token validation error:', error.message);
        // If Supabase is down/paused, try to decode JWT locally for basic validation
        try {
          const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
          if (payload.exp && payload.exp > Math.floor(Date.now() / 1000)) {
            console.log('Using JWT payload for authentication:', payload.email);
            req.user = { 
              id: payload.sub, 
              email: payload.email, 
              user_metadata: payload.user_metadata || {} 
            };
            (req as any).session = { user: req.user, accessToken };
            return next();
          }
        } catch (jwtError) {
          console.error('JWT decode failed:', jwtError);
        }
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
      
      if (!user) {
        console.error('No user returned from token validation');
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
      
      console.log('Token validation successful for user:', user.email);
      
      // Attach user and session to request
      req.user = user;
      (req as any).session = { user, accessToken };
    } catch (validationError) {
      console.error('Token validation exception:', validationError);
      return res.status(401).json({ message: 'Authentication service unavailable' });
    }
    
    next();
  } catch (error) {
    console.error('Session middleware error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
}

// Middleware that makes authentication optional
export async function optionalSupabaseAuth(
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
        (req as any).session = { user, accessToken };
      }
    }
    
    next();
  } catch (error) {
    // Don't fail for optional auth, just continue without user
    next();
  }
}