import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Supabase credentials not configured for backend middleware');
}

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Extend Express Request to include user school ID
declare global {
  namespace Express {
    interface Request {
      userSchoolId?: number;
      supabaseUser?: any;
    }
  }
}

/**
 * Middleware to extract and validate Supabase authentication from request
 * Populates req.userSchoolId and req.supabaseUser
 */
export async function supabaseAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No Supabase auth header - skip for now (for backward compatibility)
      return next();
    }

    if (!supabase) {
      console.error('Supabase client not initialized');
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Invalid Supabase token:', error);
      return next();
    }

    // Extract school_id from user metadata
    const schoolId = user.user_metadata?.school_id || user.app_metadata?.school_id;
    
    if (schoolId) {
      req.userSchoolId = parseInt(schoolId);
      req.supabaseUser = user;
      
      // Populate req.user for backward compatibility with Passport-based routes
      if (!req.user) {
        req.user = {
          id: user.id,
          email: user.email,
          school_id: parseInt(schoolId),
          schoolId: parseInt(schoolId),
          role: user.user_metadata?.role || user.app_metadata?.role || 'user',
          ...user.user_metadata
        } as any;
      }
      
      console.log(`✅ Authenticated user: ${user.email}, school_id: ${req.userSchoolId}`);
    } else {
      console.warn(`⚠️ User ${user.email} has no school_id in metadata`);
    }

    next();
  } catch (error) {
    console.error('Supabase auth middleware error:', error);
    next(); // Continue even if auth fails (for backward compatibility)
  }
}

/**
 * Middleware to require school isolation - blocks request if no school_id
 */
export function requireSchoolId(req: Request, res: Response, next: NextFunction) {
  if (!req.userSchoolId) {
    return res.status(403).json({ 
      error: 'School access required',
      message: 'You must be authenticated with a valid school_id to access this resource'
    });
  }
  next();
}

/**
 * Helper function to get school ID from request (with fallback for old auth)
 */
export function getSchoolId(req: Request): number | undefined {
  // Try Supabase auth first
  if (req.userSchoolId) {
    return req.userSchoolId;
  }
  
  // Fallback to old passport auth if available
  if (req.user && (req.user as any).schoolId) {
    return (req.user as any).schoolId;
  }
  
  return undefined;
}
