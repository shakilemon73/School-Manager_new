import { Request, Response, Express } from "express";
import { db } from "./db";
import { financialTransactions, feeItems } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { requireSchoolId, getSchoolId } from "./middleware/supabase-auth";

interface PaymentRequest {
  method: string;
  amount: number;
  phoneNumber?: string;
  feeIds: number[];
  userId: number;
}

export function registerPaymentRoutes(app: Express) {
  
  // Process payment for fees
  app.post("/api/payments/process", requireSchoolId, async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id;
      const { method, amount, phoneNumber, feeIds, userId }: PaymentRequest = req.body;

      // Validate required fields
      if (!method || !amount || !feeIds || feeIds.length === 0 || !userId) {
        return res.status(400).json({
          success: false,
          message: "অনুগ্রহ করে সব তথ্য পূরণ করুন। Please fill all required fields."
        });
      }

      // Validate mobile banking methods require phone number
      if (['bkash', 'nagad', 'rocket'].includes(method) && !phoneNumber) {
        return res.status(400).json({
          success: false,
          message: "মোবাইল ব্যাংকিং এর জন্য ফোন নম্বর প্রয়োজন। Phone number required for mobile banking."
        });
      }

      // For demo purposes, we'll simulate payment processing
      // In production, you would integrate with actual payment gateways
      
      let transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let status = 'success'; // Simulating successful payment
      
      // Simulate different payment methods with their specific handling
      let gatewayResponse: any = {};
      
      switch (method) {
        case 'bkash':
          // In production: integrate with bKash Payment Gateway API
          gatewayResponse = {
            gateway: 'bKash',
            transactionId: `BK${transactionId}`,
            fees: Math.round(amount * 0.0185), // 1.85% fee
            status: 'completed'
          };
          break;
          
        case 'nagad':
          // In production: integrate with Nagad Payment Gateway API
          gatewayResponse = {
            gateway: 'Nagad',
            transactionId: `NG${transactionId}`,
            fees: Math.round(amount * 0.0199), // 1.99% fee
            status: 'completed'
          };
          break;
          
        case 'rocket':
          // In production: integrate with Rocket Payment Gateway API
          gatewayResponse = {
            gateway: 'Rocket',
            transactionId: `RK${transactionId}`,
            fees: Math.round(amount * 0.0180), // 1.80% fee
            status: 'completed'
          };
          break;
          
        case 'bank':
          // In production: integrate with Bank Transfer API
          gatewayResponse = {
            gateway: 'Bank Transfer',
            transactionId: `BT${transactionId}`,
            fees: 0, // No fees for bank transfer
            status: 'pending' // Bank transfers usually take time
          };
          status = 'pending';
          break;
          
        case 'card':
          // In production: integrate with Card Payment Gateway (SSLCommerz, etc.)
          gatewayResponse = {
            gateway: 'Card Payment',
            transactionId: `CD${transactionId}`,
            fees: Math.round(amount * 0.029), // 2.9% fee
            status: 'completed'
          };
          break;
          
        default:
          return res.status(400).json({
            success: false,
            message: "অসমর্থিত পেমেন্ট পদ্ধতি। Unsupported payment method."
          });
      }

      // Record the financial transaction
      const [transaction] = await db.insert(financialTransactions).values({
        schoolId: schoolId,
        transactionType: 'income',
        category: 'fee_payment',
        amount: amount.toString(),
        description: `Fee payment via ${method}`,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: method,
        referenceNumber: gatewayResponse.transactionId,
        createdBy: userId
      }).returning();

      // Mark fee items as paid (if payment is successful)
      if (status === 'success') {
        // In a real application, you would update the fee_items table
        // For demo, we'll just log it
        console.log(`Marking fee IDs ${feeIds.join(', ')} as paid for transaction ${transaction.id}`);
      }

      return res.json({
        success: true,
        message: status === 'success' 
          ? "পেমেন্ট সফল হয়েছে! Payment successful!"
          : "পেমেন্ট প্রক্রিয়াকরণ হচ্ছে! Payment processing!",
        data: {
          transactionId: transaction.id,
          gatewayTransactionId: gatewayResponse.transactionId,
          amount: amount,
          fees: gatewayResponse.fees,
          status: status,
          method: method,
          timestamp: transaction.createdAt
        }
      });

    } catch (error) {
      console.error('Payment processing error:', error);
      return res.status(500).json({
        success: false,
        message: "পেমেন্ট প্রক্রিয়াকরণে ত্রুটি। Payment processing error."
      });
    }
  });

  // Get payment history for a user
  app.get("/api/payments/history", requireSchoolId, async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "অননুমোদিত। Unauthorized."
        });
      }

      const transactions = await db.select().from(financialTransactions)
        .where(and(
          eq(financialTransactions.createdBy, userId),
          eq(financialTransactions.category, 'fee_payment'),
          eq(financialTransactions.schoolId, schoolId)
        ))
        .orderBy(financialTransactions.createdAt);

      return res.json({
        success: true,
        data: transactions.map(txn => ({
          id: txn.id,
          amount: txn.amount,
          method: txn.paymentMethod,
          description: txn.description,
          date: txn.date,
          referenceNumber: txn.referenceNumber
        }))
      });

    } catch (error) {
      console.error('Payment history error:', error);
      return res.status(500).json({
        success: false,
        message: "পেমেন্ট ইতিহাস লোড করতে ত্রুটি। Error loading payment history."
      });
    }
  });

  // Get pending fees for a user/student
  app.get("/api/payments/pending-fees", requireSchoolId, async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "অননুমোদিত। Unauthorized."
        });
      }

      // For demo purposes, return mock pending fees
      // In production, you would query actual fee data from the database with schoolId filtering
      const pendingFees = [
        {
          id: 1,
          description: "Monthly Tuition Fee - February 2025",
          descriptionBn: "মাসিক বেতন - ফেব্রুয়ারি ২০২৫",
          amount: 3500,
          dueDate: "2025-02-05",
          status: "pending"
        },
        {
          id: 2,
          description: "Transportation Fee - February 2025",
          descriptionBn: "পরিবহন ফি - ফেব্রুয়ারি ২০২৫",
          amount: 800,
          dueDate: "2025-02-05",
          status: "pending"
        },
        {
          id: 3,
          description: "Laboratory Fee - Semester 1",
          descriptionBn: "গবেষণাগার ফি - ১ম সেমিস্টার",
          amount: 1200,
          dueDate: "2025-02-15",
          status: "pending"
        }
      ];

      return res.json({
        success: true,
        data: pendingFees
      });

    } catch (error) {
      console.error('Pending fees error:', error);
      return res.status(500).json({
        success: false,
        message: "বকেয়া ফি লোড করতে ত্রুটি। Error loading pending fees."
      });
    }
  });

  // Verify payment status (for polling)
  app.get("/api/payments/verify/:transactionId", requireSchoolId, async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id;
      const { transactionId } = req.params;
      
      const transaction = await db.select().from(financialTransactions)
        .where(and(
          eq(financialTransactions.id, parseInt(transactionId)),
          eq(financialTransactions.schoolId, schoolId)
        ))
        .limit(1);

      if (transaction.length === 0) {
        return res.status(404).json({
          success: false,
          message: "লেনদেন খুঁজে পাওয়া যায়নি। Transaction not found."
        });
      }

      return res.json({
        success: true,
        data: {
          amount: transaction[0].amount,
          referenceNumber: transaction[0].referenceNumber,
          date: transaction[0].date
        }
      });

    } catch (error) {
      console.error('Payment verification error:', error);
      return res.status(500).json({
        success: false,
        message: "পেমেন্ট যাচাইকরণে ত্রুটি। Payment verification error."
      });
    }
  });
}