import type { Express, Request, Response } from "express";
import { supabaseSessionMiddleware } from "./session-middleware";
import { db } from "./db";
import * as schema from "@shared/schema";
import { count, eq } from "drizzle-orm";

interface AuthenticatedRequest extends Request {
  user?: any;
  session?: any;
}

export function registerDashboardRoutes(app: Express) {
  
  // Dashboard stats endpoint - SECURED with tenant scoping
  app.get('/api/dashboard/stats', supabaseSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get user's school_id for tenant scoping - CRITICAL for security
      const schoolId = req.user?.schoolId || req.user?.user_metadata?.school_id || 1;
      
      console.log('Dashboard stats request for school_id:', schoolId, 'user:', req.user?.email);
      
      // Get tenant-scoped statistics from database with proper filtering
      const [studentsCount] = await db.select({ count: count() })
        .from(schema.students)
        .where(eq(schema.students.schoolId, schoolId));
        
      const [teachersCount] = await db.select({ count: count() })
        .from(schema.teachers)
        .where(eq(schema.teachers.schoolId, schoolId));
        
      const [classesCount] = await db.select({ count: count() })
        .from(schema.classes)
        .where(eq(schema.classes.schoolId, schoolId));
      
      // Calculate monthly income from fee receipts - TENANT SCOPED
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const monthlyIncomeResult = await db.execute({
        sql: `SELECT COALESCE(SUM(total_amount), 0) as income FROM fee_receipts 
              WHERE EXTRACT(MONTH FROM created_at) = $1 
              AND EXTRACT(YEAR FROM created_at) = $2
              AND school_id = $3`,
        args: [currentMonth, currentYear, schoolId]
      });

      const stats = {
        students: studentsCount.count || 0,
        teachers: teachersCount.count || 0,
        classes: classesCount.count || 0,
        monthlyIncome: monthlyIncomeResult.rows[0]?.income || 0
      };

      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
  });

  // Dashboard activities endpoint - SECURED with tenant scoping
  app.get('/api/dashboard/activities', supabaseSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get user's school_id for tenant scoping - CRITICAL for security
      const schoolId = req.user?.schoolId || req.user?.user_metadata?.school_id || 1;
      
      console.log('Dashboard activities request for school_id:', schoolId, 'user:', req.user?.email);
      
      // Get recent activities from database - TENANT SCOPED
      const recentStudents = await db.query.students.findMany({
        where: eq(schema.students.schoolId, schoolId),
        limit: 5,
        orderBy: (students, { desc }) => [desc(students.createdAt)]
      });

      const recentFeeReceipts = await db.query.feeReceipts.findMany({
        where: eq(schema.feeReceipts.schoolId, schoolId),
        limit: 3,
        orderBy: (feeReceipts, { desc }) => [desc(feeReceipts.createdAt)],
        with: {
          student: true
        }
      });

      const activities = [
        ...recentStudents.map(student => ({
          type: 'student_registration',
          title: `নতুন শিক্ষার্থী নিবন্ধন`,
          subtitle: student.name,
          time: new Date(student.createdAt).toLocaleString('bn-BD'),
          id: student.id
        })),
        ...recentFeeReceipts.map(receipt => ({
          type: 'fee_payment',
          title: `ফি পেমেন্ট`,
          subtitle: receipt.student?.name || 'Unknown Student',
          time: new Date(receipt.createdAt).toLocaleString('bn-BD'),
          amount: receipt.totalAmount,
          id: receipt.id
        }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);

      res.json(activities);
    } catch (error) {
      console.error('Dashboard activities error:', error);
      res.status(500).json({ error: 'Failed to fetch activities' });
    }
  });

  // Dashboard documents endpoint - SECURED with tenant scoping
  app.get('/api/dashboard/documents', supabaseSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get user's school_id for tenant scoping - CRITICAL for security
      const schoolId = req.user?.schoolId || req.user?.user_metadata?.school_id || 1;
      
      console.log('Dashboard documents request for school_id:', schoolId, 'user:', req.user?.email);
      
      // Get recent documents from different sources - TENANT SCOPED
      const recentAdmitCards = await db.query.admitCards.findMany({
        where: eq(schema.admitCards.schoolId, schoolId),
        limit: 3,
        orderBy: (admitCards, { desc }) => [desc(admitCards.createdAt)],
        with: {
          student: true
        }
      });

      const recentIdCards = await db.query.idCards.findMany({
        where: eq(schema.idCards.schoolId, schoolId),
        limit: 3,
        orderBy: (idCards, { desc }) => [desc(idCards.createdAt)],
        with: {
          student: true
        }
      });

      const documents = [
        ...recentAdmitCards.map(card => ({
          type: 'admit_card',
          title: 'প্রবেশপত্র',
          subtitle: card.student?.name || 'Unknown Student',
          status: card.status,
          time: new Date(card.createdAt).toLocaleString('bn-BD'),
          id: card.id
        })),
        ...recentIdCards.map(card => ({
          type: 'id_card',
          title: 'পরিচয়পত্র',
          subtitle: card.student?.name || 'Unknown Student',
          status: card.status,
          time: new Date(card.createdAt).toLocaleString('bn-BD'),
          id: card.id
        }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

      res.json(documents);
    } catch (error) {
      console.error('Dashboard documents error:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });
}