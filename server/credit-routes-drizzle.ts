import { Express, Request, Response } from "express";
import { db } from "../db/index";
import { creditPackages, creditTransactions, creditUsageLogs, users, documentTemplates } from "../shared/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { z } from 'zod';

// Validation schemas
const purchaseCreditsSchema = z.object({
  packageId: z.number(),
  paymentMethod: z.string(),
  paymentNumber: z.string().optional(),
  transactionId: z.string().optional(),
});

const useCreditsSchema = z.object({
  feature: z.string(),
  credits: z.number().positive(),
  description: z.string(),
  documentId: z.number().optional(),
});

export function registerCreditRoutes(app: Express) {
  
  // Get unified credit stats (combines credit_balance table with transactions)
  app.get("/api/credit-stats", async (req: Request, res: Response) => {
    try {
      // Extract user from Supabase token
      let userId = null;
      let userEmail = null;
      
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.VITE_SUPABASE_URL!,
            process.env.VITE_SUPABASE_ANON_KEY!
          );
          
          const { data: { user }, error } = await supabase.auth.getUser(
            authHeader.split(' ')[1]
          );
          
          if (user && !error) {
            userId = user.id;
            userEmail = user.email;
          }
        } catch (authError) {
          console.error('Auth error:', authError);
        }
      }
      
      // Fallback to middleware user
      if (!userId) {
        userId = (req as any).user?.id || (req as any).supabaseUser?.id;
        userEmail = (req as any).user?.email || (req as any).supabaseUser?.email;
      }
      
      console.log('Credit stats request - User ID:', userId, 'Email:', userEmail);
      
      if (!userId) {
        console.log('No user ID found in request');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get or create user's credit balance
      let balance = await db.execute(sql`
        SELECT current_credits, bonus_credits, used_credits 
        FROM credit_balance 
        WHERE user_id = ${userId}::uuid;
      `);

      if (balance.length === 0) {
        console.log('Creating new credit balance for user:', userId);
        
        // Create credit balance for user if doesn't exist
        const username = userEmail ? userEmail.split('@')[0] : 'user';
        
        await db.execute(sql`
          INSERT INTO credit_balance (
            user_id, username, email, full_name, current_credits
          ) VALUES (
            ${userId}::uuid, ${username}, ${userEmail}, ${username}, 500
          );
        `);

        balance = await db.execute(sql`
          SELECT current_credits, bonus_credits, used_credits 
          FROM credit_balance 
          WHERE user_id = ${userId}::uuid;
        `);
      }

      const userBalance = balance[0] as any;
      console.log('User balance found:', userBalance);

      // Get recent transactions
      const recentTransactions = await db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, userId))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(5);

      // Get usage logs
      const recentUsage = await db
        .select()
        .from(creditUsageLogs)
        .where(eq(creditUsageLogs.userId, userId))
        .orderBy(desc(creditUsageLogs.createdAt))
        .limit(5);

      const response = {
        currentCredits: userBalance.current_credits || 0,
        bonusCredits: userBalance.bonus_credits || 0,
        usedCredits: userBalance.used_credits || 0,
        recentTransactions,
        recentUsage,
        totalTransactions: recentTransactions.length,
        totalUsage: recentUsage.length
      };

      console.log('Sending credit stats response:', response);
      res.json(response);

    } catch (error) {
      console.error('Error fetching credit stats:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });
  
  // Get credit packages
  app.get("/api/credit-packages", async (req: Request, res: Response) => {
    try {
      const packages = await db
        .select()
        .from(creditPackages)
        .where(eq(creditPackages.isActive, true))
        .orderBy(creditPackages.credits);

      res.json(packages);
    } catch (error) {
      console.error('Database credit packages error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get user's credit transactions
  app.get("/api/credit-transactions", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || (req as any).supabaseUser?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const transactions = await db
        .select({
          id: creditTransactions.id,
          userId: creditTransactions.userId,
          packageId: creditTransactions.packageId,
          type: creditTransactions.type,
          credits: creditTransactions.credits,
          amount: creditTransactions.amount,
          paymentMethod: creditTransactions.paymentMethod,
          status: creditTransactions.status,
          description: creditTransactions.description,
          createdAt: creditTransactions.createdAt,
          packageName: creditPackages.name,
        })
        .from(creditTransactions)
        .leftJoin(creditPackages, eq(creditTransactions.packageId, creditPackages.id))
        .where(eq(creditTransactions.userId, userId))
        .orderBy(desc(creditTransactions.createdAt));

      res.json(transactions);
    } catch (error) {
      console.error('Database credit transactions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get user's credit usage logs
  app.get("/api/credit-usage", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || (req as any).supabaseUser?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const usageLogs = await db
        .select()
        .from(creditUsageLogs)
        .where(eq(creditUsageLogs.userId, userId))
        .orderBy(desc(creditUsageLogs.createdAt))
        .limit(50);

      res.json(usageLogs);
    } catch (error) {
      console.error('Database credit usage error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Purchase credits
  app.post("/api/credit-purchase", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || (req as any).supabaseUser?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const validatedData = purchaseCreditsSchema.parse(req.body);

      // Get package details
      const [creditPackage] = await db
        .select()
        .from(creditPackages)
        .where(eq(creditPackages.id, validatedData.packageId));

      if (!creditPackage) {
        return res.status(404).json({ error: 'Package not found' });
      }

      // Check if user already claimed free package this month
      if (parseFloat(creditPackage.price) === 0) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const existingFreeTransaction = await db
          .select()
          .from(creditTransactions)
          .where(and(
            eq(creditTransactions.userId, userId),
            eq(creditTransactions.packageId, validatedData.packageId),
            eq(creditTransactions.status, 'completed'),
            gte(creditTransactions.createdAt, startOfMonth)
          ));

        if (existingFreeTransaction.length > 0) {
          return res.status(400).json({ 
            error: 'এই মাসে ইতিমধ্যে ফ্রি প্যাকেজ নিয়েছেন',
            message: 'প্রতি মাসে একবার ফ্রি প্যাকেজ নিতে পারবেন'
          });
        }
      }

      // Only require payment verification for paid packages with non-cash methods
      const isFreePakage = parseFloat(creditPackage.price) === 0;
      const isPaidCashMethod = parseFloat(creditPackage.price) > 0 && validatedData.paymentMethod === 'cash';
      const isPaidNonCashMethod = parseFloat(creditPackage.price) > 0 && validatedData.paymentMethod !== 'cash';
      
      if (isPaidNonCashMethod) {
        if (!validatedData.paymentNumber || !validatedData.transactionId) {
          return res.status(400).json({ 
            error: 'পেমেন্ট যাচাইকরণ প্রয়োজন',
            message: 'পেমেন্ট নম্বর ও ট্রানজেকশন আইডি প্রদান করুন'
          });
        }
      }

      // Determine transaction status based on payment method and amount
      let transactionStatus = 'pending';
      let shouldAddCredits = false;

      if (parseFloat(creditPackage.price) === 0) {
        // Free package - auto-approve
        transactionStatus = 'completed';
        shouldAddCredits = true;
      } else if (validatedData.paymentMethod === 'cash') {
        // Cash payment - requires admin approval
        transactionStatus = 'pending';
        shouldAddCredits = false;
      } else {
        // Mobile payment - requires verification
        transactionStatus = 'pending';
        shouldAddCredits = false;
      }

      // Create transaction
      const [transaction] = await db
        .insert(creditTransactions)
        .values({
          userId,
          packageId: validatedData.packageId,
          type: 'purchase',
          credits: creditPackage.credits,
          amount: creditPackage.price,
          paymentMethod: validatedData.paymentMethod,
          paymentNumber: validatedData.paymentNumber,
          transactionId: validatedData.transactionId,
          status: transactionStatus,
          description: `ক্রেডিট ক্রয় - ${creditPackage.name}`,
          notes: transactionStatus === 'pending' ? 'পেমেন্ট যাচাইয়ের অপেক্ষায়' : null
        })
        .returning();

      // Only add credits for completed transactions
      if (shouldAddCredits) {
        await db
          .update(users)
          .set({ 
            credits: sql`${users.credits} + ${creditPackage.credits}`,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
      }

      const responseMessage = shouldAddCredits 
        ? `${creditPackage.credits} ক্রেডিট সফলভাবে যোগ করা হয়েছে`
        : 'আপনার পেমেন্ট যাচাইয়ের জন্য জমা দেওয়া হয়েছে। অ্যাডমিন অনুমোদনের পর ক্রেডিট যোগ হবে।';

      res.json({ 
        success: true, 
        transaction,
        creditsAdded: shouldAddCredits,
        status: transactionStatus,
        message: responseMessage
      });
    } catch (error) {
      console.error('Credit purchase error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Use credits for document generation
  app.post("/api/credit-use", async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const validatedData = useCreditsSchema.parse(req.body);

      // Check user's current credits
      const [user] = await db
        .select({ credits: users.credits })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if ((user.credits || 0) < validatedData.credits) {
        return res.status(400).json({ 
          error: 'পর্যাপ্ত ক্রেডিট নেই',
          required: validatedData.credits,
          available: user.credits || 0
        });
      }

      // Create usage log
      const [usageLog] = await db
        .insert(creditUsageLogs)
        .values({
          userId,
          feature: validatedData.feature,
          credits: validatedData.credits,
          description: validatedData.description,
        })
        .returning();

      // Deduct credits from user
      await db
        .update(users)
        .set({ 
          credits: sql`${users.credits} - ${validatedData.credits}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      res.json({ 
        success: true, 
        usageLog,
        remainingCredits: (user.credits || 0) - validatedData.credits,
        message: `${validatedData.credits} ক্রেডিট ব্যবহার করা হয়েছে` 
      });
    } catch (error) {
      console.error('Credit usage error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin: Approve/Reject payment
  app.post("/api/admin/payment/verify", async (req: Request, res: Response) => {
    try {
      const { transactionId, action, adminNotes } = req.body;
      
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      // Get transaction details
      const [transaction] = await db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.id, transactionId));

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (transaction.status !== 'pending') {
        return res.status(400).json({ error: 'Transaction already processed' });
      }

      if (action === 'approve') {
        // Approve payment and add credits
        await db
          .update(creditTransactions)
          .set({ 
            status: 'completed',
            notes: adminNotes || 'অ্যাডমিন কর্তৃক অনুমোদিত'
          })
          .where(eq(creditTransactions.id, transactionId));

        // Add credits to user account
        await db
          .update(users)
          .set({ 
            credits: sql`${users.credits} + ${transaction.credits}`,
            updatedAt: new Date()
          })
          .where(eq(users.id, transaction.userId));

        res.json({ 
          success: true, 
          message: 'পেমেন্ট অনুমোদিত হয়েছে এবং ক্রেডিট যোগ করা হয়েছে'
        });
      } else {
        // Reject payment
        await db
          .update(creditTransactions)
          .set({ 
            status: 'rejected',
            notes: adminNotes || 'অ্যাডমিন কর্তৃক প্রত্যাখ্যাত'
          })
          .where(eq(creditTransactions.id, transactionId));

        res.json({ 
          success: true, 
          message: 'পেমেন্ট প্রত্যাখ্যান করা হয়েছে'
        });
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get pending payments for admin
  app.get("/api/admin/payments/pending", async (req: Request, res: Response) => {
    try {
      const pendingPayments = await db
        .select({
          id: creditTransactions.id,
          userId: creditTransactions.userId,
          packageName: creditPackages.name,
          credits: creditTransactions.credits,
          amount: creditTransactions.amount,
          paymentMethod: creditTransactions.paymentMethod,
          paymentNumber: creditTransactions.paymentNumber,
          transactionId: creditTransactions.transactionId,
          description: creditTransactions.description,
          createdAt: creditTransactions.createdAt,
          userName: users.name
        })
        .from(creditTransactions)
        .leftJoin(creditPackages, eq(creditTransactions.packageId, creditPackages.id))
        .leftJoin(users, eq(creditTransactions.userId, users.id))
        .where(eq(creditTransactions.status, 'pending'))
        .orderBy(desc(creditTransactions.createdAt));

      res.json(pendingPayments);
    } catch (error) {
      console.error('Pending payments fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get credit statistics for dashboard
  app.get("/api/credit-stats", async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get current user credits
      const [user] = await db
        .select({ credits: users.credits })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(500).json({ error: 'User not found' });
      }

      // Get total purchased credits
      const purchases = await db
        .select({ credits: creditTransactions.credits })
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.userId, userId),
            eq(creditTransactions.type, 'purchase'),
            eq(creditTransactions.status, 'completed')
          )
        );

      // Get total used credits
      const usage = await db
        .select({ credits: creditUsageLogs.credits })
        .from(creditUsageLogs)
        .where(eq(creditUsageLogs.userId, userId));

      // Get this month's usage
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      const monthlyUsage = await db
        .select({ credits: creditUsageLogs.credits })
        .from(creditUsageLogs)
        .where(
          and(
            eq(creditUsageLogs.userId, userId),
            gte(creditUsageLogs.createdAt, startOfMonth)
          )
        );

      const totalPurchased = purchases.reduce((sum, p) => sum + (p.credits || 0), 0);
      const totalUsed = usage.reduce((sum, u) => sum + (u.credits || 0), 0);
      const thisMonthUsage = monthlyUsage.reduce((sum, u) => sum + (u.credits || 0), 0);

      const stats = {
        currentBalance: user.credits || 0,
        totalPurchased,
        totalUsed,
        thisMonthUsage,
        efficiency: totalPurchased > 0 ? Math.round((totalUsed / totalPurchased) * 100) : 0,
      };

      res.json(stats);
    } catch (error) {
      console.error('Credit stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get document generation costs
  app.get("/api/document-costs", async (req: Request, res: Response) => {
    try {
      const documentTypes = await db
        .select({
          id: documentTemplates.id,
          name: documentTemplates.name,
          nameBn: documentTemplates.nameBn,
          requiredCredits: documentTemplates.requiredCredits,
          category: documentTemplates.category,
          description: documentTemplates.description,
        })
        .from(documentTemplates)
        .where(eq(documentTemplates.isActive, true))
        .orderBy(documentTemplates.requiredCredits);

      res.json(documentTypes);
    } catch (error) {
      console.error('Document costs error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Track document generation for credit integration
  app.post("/api/document-generate", async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { documentType, studentIds, templateId, metadata } = req.body;

      // Get document template to determine credit cost
      const [template] = await db
        .select({
          requiredCredits: documentTemplates.requiredCredits,
          name: documentTemplates.name,
          nameBn: documentTemplates.nameBn,
        })
        .from(documentTemplates)
        .where(eq(documentTemplates.id, templateId));

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const creditsNeeded = (template.requiredCredits || 0) * (Array.isArray(studentIds) ? studentIds.length : 1);

      // Check user's current credits
      const [user] = await db
        .select({ credits: users.credits })
        .from(users)
        .where(eq(users.id, userId));

      if (!user || (user.credits || 0) < creditsNeeded) {
        return res.status(400).json({ 
          error: 'পর্যাপ্ত ক্রেডিট নেই',
          required: creditsNeeded,
          available: user?.credits || 0
        });
      }

      // Create usage log
      await db
        .insert(creditUsageLogs)
        .values({
          userId,
          feature: documentType,
          credits: creditsNeeded,
          description: `${template.nameBn || template.name} তৈরি - ${Array.isArray(studentIds) ? studentIds.length : 1}টি ডকুমেন্ট`,
          documentId: templateId,
        });

      // Deduct credits
      await db
        .update(users)
        .set({ 
          credits: sql`${users.credits} - ${creditsNeeded}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      res.json({
        success: true,
        creditsUsed: creditsNeeded,
        remainingCredits: (user.credits || 0) - creditsNeeded,
        message: `ডকুমেন্ট সফলভাবে তৈরি হয়েছে। ${creditsNeeded} ক্রেডিট ব্যবহার করা হয়েছে।`
      });
    } catch (error) {
      console.error('Document generation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}