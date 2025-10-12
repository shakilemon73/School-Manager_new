import { Express, Request, Response } from 'express';
import { db } from './db';
import { 
  transactions, 
  budgets, 
  feeStructures, 
  studentFees,
  insertTransactionSchema,
  insertBudgetSchema,
  insertFeeStructureSchema,
  insertStudentFeeSchema
} from '../shared/financial-schema';
import { eq, and, desc, asc, gte, lte, sum, count } from 'drizzle-orm';
import { z } from 'zod';

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

export function registerFinancialRoutes(app: Express) {
  
  // Transaction routes
  app.get('/api/financial/transactions', requireAuth, async (req: Request, res: Response) => {
    try {
      const { type, category, startDate, endDate, limit = 50, offset = 0 } = req.query;
      
      let query = db.select().from(transactions).where(eq(transactions.schoolId, 1));
      
      if (type && type !== 'all') {
        query = query.where(eq(transactions.type, type as string));
      }
      
      if (category && category !== 'all') {
        query = query.where(eq(transactions.category, category as string));
      }
      
      if (startDate) {
        query = query.where(gte(transactions.transactionDate, startDate as string));
      }
      
      if (endDate) {
        query = query.where(lte(transactions.transactionDate, endDate as string));
      }
      
      const result = await query
        .orderBy(desc(transactions.transactionDate))
        .limit(Number(limit))
        .offset(Number(offset));
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  });

  app.post('/api/financial/transactions', requireAuth, async (req: Request, res: Response) => {
    try {
      // Get school ID from authenticated user
      const schoolId = req.user?.user_metadata?.school_id || req.user?.school_id || 1;
      
      const validatedData = insertTransactionSchema.parse({
        ...req.body,
        schoolId: schoolId,
        createdBy: req.user.id
      });
      
      const [newTransaction] = await db
        .insert(transactions)
        .values(validatedData)
        .returning();
      
      res.status(201).json(newTransaction);
    } catch (error) {
      console.error('Error creating transaction:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create transaction' });
    }
  });

  app.get('/api/financial/transactions/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(and(
          eq(transactions.id, Number(req.params.id)),
          eq(transactions.schoolId, 1)
        ));
      
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      res.json(transaction);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({ message: 'Failed to fetch transaction' });
    }
  });

  app.patch('/api/financial/transactions/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = insertTransactionSchema.partial().parse(req.body);
      
      const [updatedTransaction] = await db
        .update(transactions)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(and(
          eq(transactions.id, Number(req.params.id)),
          eq(transactions.schoolId, 1)
        ))
        .returning();
      
      if (!updatedTransaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      res.json(updatedTransaction);
    } catch (error) {
      console.error('Error updating transaction:', error);
      res.status(500).json({ message: 'Failed to update transaction' });
    }
  });

  app.delete('/api/financial/transactions/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const [deletedTransaction] = await db
        .delete(transactions)
        .where(and(
          eq(transactions.id, Number(req.params.id)),
          eq(transactions.schoolId, 1)
        ))
        .returning();
      
      if (!deletedTransaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      res.status(500).json({ message: 'Failed to delete transaction' });
    }
  });

  // Financial summary routes
  app.get('/api/financial/summary', requireAuth, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      let baseQuery = db.select().from(transactions).where(eq(transactions.schoolId, 1));
      
      if (startDate) {
        baseQuery = baseQuery.where(gte(transactions.transactionDate, startDate as string));
      }
      
      if (endDate) {
        baseQuery = baseQuery.where(lte(transactions.transactionDate, endDate as string));
      }
      
      // Get income summary
      const incomeResult = await db
        .select({
          total: sum(transactions.amount)
        })
        .from(transactions)
        .where(and(
          eq(transactions.schoolId, 1),
          eq(transactions.type, 'income'),
          startDate ? gte(transactions.transactionDate, startDate as string) : undefined,
          endDate ? lte(transactions.transactionDate, endDate as string) : undefined
        ));
      
      // Get expense summary
      const expenseResult = await db
        .select({
          total: sum(transactions.amount)
        })
        .from(transactions)
        .where(and(
          eq(transactions.schoolId, 1),
          eq(transactions.type, 'expense'),
          startDate ? gte(transactions.transactionDate, startDate as string) : undefined,
          endDate ? lte(transactions.transactionDate, endDate as string) : undefined
        ));
      
      // Get transaction count
      const countResult = await db
        .select({
          count: count()
        })
        .from(transactions)
        .where(and(
          eq(transactions.schoolId, 1),
          startDate ? gte(transactions.transactionDate, startDate as string) : undefined,
          endDate ? lte(transactions.transactionDate, endDate as string) : undefined
        ));
      
      const totalIncome = Number(incomeResult[0]?.total || 0);
      const totalExpense = Number(expenseResult[0]?.total || 0);
      const balance = totalIncome - totalExpense;
      const transactionCount = countResult[0]?.count || 0;
      
      res.json({
        totalIncome,
        totalExpense,
        balance,
        transactionCount
      });
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      res.status(500).json({ message: 'Failed to fetch financial summary' });
    }
  });

  // Budget routes
  app.get('/api/financial/budgets', requireAuth, async (req: Request, res: Response) => {
    try {
      const result = await db
        .select()
        .from(budgets)
        .where(eq(budgets.schoolId, 1))
        .orderBy(desc(budgets.createdAt));
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      res.status(500).json({ message: 'Failed to fetch budgets' });
    }
  });

  app.post('/api/financial/budgets', requireAuth, async (req: Request, res: Response) => {
    try {
      // Get school ID from authenticated user
      const schoolId = req.user?.user_metadata?.school_id || req.user?.school_id || 1;
      
      const validatedData = insertBudgetSchema.parse({
        ...req.body,
        schoolId: schoolId,
        createdBy: req.user.id
      });
      
      const [newBudget] = await db
        .insert(budgets)
        .values(validatedData)
        .returning();
      
      res.status(201).json(newBudget);
    } catch (error) {
      console.error('Error creating budget:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create budget' });
    }
  });

  // Fee structure routes
  app.get('/api/financial/fee-structures', requireAuth, async (req: Request, res: Response) => {
    try {
      const result = await db
        .select()
        .from(feeStructures)
        .where(eq(feeStructures.schoolId, 1))
        .orderBy(asc(feeStructures.className));
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching fee structures:', error);
      res.status(500).json({ message: 'Failed to fetch fee structures' });
    }
  });

  app.post('/api/financial/fee-structures', requireAuth, async (req: Request, res: Response) => {
    try {
      // Get school ID from authenticated user
      const schoolId = req.user?.user_metadata?.school_id || req.user?.school_id || 1;
      
      const validatedData = insertFeeStructureSchema.parse({
        ...req.body,
        schoolId: schoolId,
        createdBy: req.user.id
      });
      
      const [newFeeStructure] = await db
        .insert(feeStructures)
        .values(validatedData)
        .returning();
      
      res.status(201).json(newFeeStructure);
    } catch (error) {
      console.error('Error creating fee structure:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create fee structure' });
    }
  });

  // Student fees routes
  app.get('/api/financial/student-fees', requireAuth, async (req: Request, res: Response) => {
    try {
      const { studentId, status } = req.query;
      
      let query = db.select().from(studentFees).where(eq(studentFees.schoolId, 1));
      
      if (studentId) {
        query = query.where(eq(studentFees.studentId, Number(studentId)));
      }
      
      if (status && status !== 'all') {
        query = query.where(eq(studentFees.status, status as string));
      }
      
      const result = await query.orderBy(desc(studentFees.dueDate));
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching student fees:', error);
      res.status(500).json({ message: 'Failed to fetch student fees' });
    }
  });

  app.post('/api/financial/student-fees', requireAuth, async (req: Request, res: Response) => {
    try {
      // Get school ID from authenticated user
      const schoolId = req.user?.user_metadata?.school_id || req.user?.school_id || 1;
      
      const validatedData = insertStudentFeeSchema.parse({
        ...req.body,
        schoolId: schoolId,
        createdBy: req.user.id
      });
      
      const [newStudentFee] = await db
        .insert(studentFees)
        .values(validatedData)
        .returning();
      
      res.status(201).json(newStudentFee);
    } catch (error) {
      console.error('Error creating student fee:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create student fee' });
    }
  });
}