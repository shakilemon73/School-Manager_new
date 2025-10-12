import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db } from "./db.js";
import { idCards, idCardTemplates, students, schools } from "../shared/schema.js";
import { eq, desc, and, count, gte } from "drizzle-orm";

const idCardSchema = z.object({
  // Student Information
  studentName: z.string().min(1),
  studentNameBn: z.string().min(1),
  studentId: z.string().min(1),
  rollNumber: z.string().min(1),
  className: z.string().min(1),
  section: z.string().min(1),
  session: z.string().min(1),
  bloodGroup: z.string().min(1),
  dateOfBirth: z.string().min(1),
  
  // Parent Information
  fatherName: z.string().min(1),
  motherName: z.string().min(1),
  guardianPhone: z.string().min(1),
  
  // Address
  address: z.string().min(1),
  
  // School Information  
  schoolName: z.string().min(1),
  schoolAddress: z.string().min(1),
  eiin: z.string().min(1),
  
  // Template Settings
  template: z.string().default("modern"),
  primaryColor: z.string().default("#1e40af"),
  
  // Optional photo
  photo: z.string().optional(),
});

export function registerIdCardRoutes(app: Express) {
  // Generate ID Card
  app.post("/api/id-cards/generate", async (req: Request, res: Response) => {
    try {
      const data = idCardSchema.parse(req.body);
      
      // Generate unique card number
      const cardNumber = `IDC-${Date.now()}-${nanoid(6)}`;
      
      // Check if student exists, if not create
      let student = await db.query.students.findFirst({
        where: eq(students.studentId, data.studentId)
      });
      
      // Get school ID from authenticated user
      const schoolId = (req as any).user?.user_metadata?.school_id || (req as any).user?.school_id || 1;
      
      if (!student) {
        const [newStudent] = await db.insert(students).values({
          name: data.studentName,
          nameInBangla: data.studentNameBn,
          studentId: data.studentId,
          rollNumber: data.rollNumber,
          class: data.className,
          section: data.section,
          dateOfBirth: data.dateOfBirth,
          bloodGroup: data.bloodGroup,
          fatherName: data.fatherName,
          motherName: data.motherName,
          guardianPhone: data.guardianPhone,
          presentAddress: data.address,
          photo: data.photo,
          schoolId: schoolId
        }).returning();
        
        student = newStudent;
      }

      // Generate ID card record
      const [idCard] = await db.insert(idCards).values({
        studentId: student.id,
        cardNumber,
        studentName: data.studentName,
        studentNameBn: data.studentNameBn,
        studentPhoto: data.photo,
        rollNumber: data.rollNumber,
        className: data.className,
        section: data.section,
        session: data.session,
        dateOfBirth: data.dateOfBirth,
        bloodGroup: data.bloodGroup,
        fatherName: data.fatherName,
        motherName: data.motherName,
        guardianPhone: data.guardianPhone,
        address: data.address,
        schoolName: data.schoolName,
        schoolAddress: data.schoolAddress,
        eiin: data.eiin,
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        schoolId: schoolId,
        generatedBy: 1
      }).returning();
      
      res.json({
        success: true,
        message: "ID card generated successfully",
        cardId: idCard.id,
        cardNumber: cardNumber,
        downloadUrl: `/api/id-cards/download/${idCard.id}`,
        data: idCard
      });
    } catch (error) {
      console.error("ID Card generation error:", error);
      res.status(400).json({
        success: false,
        message: error instanceof z.ZodError 
          ? "Invalid data provided" 
          : "Failed to generate ID card"
      });
    }
  });

  // Download ID Card PDF
  app.get("/api/id-cards/download/:cardId", async (req: Request, res: Response) => {
    try {
      const cardId = parseInt(req.params.cardId);
      
      // Get ID card from database
      const idCard = await db.query.idCards.findFirst({
        where: eq(idCards.id, cardId),
        with: {
          student: true
        }
      });
      
      if (!idCard) {
        return res.status(404).json({
          success: false,
          message: "ID card not found"
        });
      }
      
      // In a real implementation, generate PDF here
      // For now, return card data
      res.json({
        success: true,
        message: "ID card ready for download",
        data: idCard
      });
    } catch (error) {
      console.error("ID Card download error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to download ID card"
      });
    }
  });

  // Get ID Card Statistics
  app.get("/api/id-cards/stats", async (req: Request, res: Response) => {
    try {
      // Get real statistics from database
      const [totalGenerated] = await db.select({ count: count() }).from(idCards);
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const [monthlyGenerated] = await db
        .select({ count: count() })
        .from(idCards)
        .where(gte(idCards.createdAt, thisMonth));
      
      const stats = {
        totalGenerated: totalGenerated.count || 0,
        thisMonth: monthlyGenerated.count || 0,
        templates: {
          modern: 0,
          classic: 0,
          minimal: 0
        }
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch ID card stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch statistics"
      });
    }
  });

  // Get Recent ID Cards
  app.get("/api/id-cards/recent", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Get recent ID cards from database with student data
      const recentCards = await db.query.idCards.findMany({
        limit,
        orderBy: desc(idCards.createdAt),
        with: {
          student: true
        }
      });
      
      const formattedCards = recentCards.map(card => ({
        id: card.id,
        studentName: card.studentName,
        studentId: card.student?.studentId || 'N/A',
        className: card.className,
        section: card.section,
        cardNumber: card.cardNumber,
        status: card.status,
        generatedAt: card.createdAt.toISOString()
      }));
      
      res.json(formattedCards);
    } catch (error) {
      console.error("Failed to fetch recent ID cards:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch recent cards"
      });
    }
  });
}