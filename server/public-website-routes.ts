import { Express, Request, Response } from "express";
import { db } from "./db";
import { schoolSettings, students, teachers, notifications, calendarEvents } from "../shared/schema";
import { count, desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireSchoolId, getSchoolId } from "./middleware/supabase-auth";

// Schema for admission applications
const admissionApplicationSchema = z.object({
  studentName: z.string().min(2),
  studentNameBn: z.string().min(2),
  dateOfBirth: z.string(),
  gender: z.string(),
  class: z.string(),
  fatherName: z.string().min(2),
  motherName: z.string().min(2),
  guardianPhone: z.string().min(11),
  address: z.string().min(10),
  previousSchool: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

// Schema for contact messages
const contactMessageSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(11),
  subject: z.string().min(5),
  message: z.string().min(10),
});

export function registerPublicWebsiteRoutes(app: Express) {
  // Get school basic information
  app.get("/api/public/school-info", requireSchoolId, async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id || 1;
      const schoolInfo = await db
        .select({
          schoolName: schoolSettings.schoolName,
          schoolNameBn: schoolSettings.schoolNameBn,
          address: schoolSettings.address,
          addressBn: schoolSettings.addressBn,
          email: schoolSettings.email,
          phone: schoolSettings.phone,
          website: schoolSettings.website,
          principalName: schoolSettings.principalName,
          establishmentYear: schoolSettings.establishmentYear,
          description: schoolSettings.description,
          descriptionBn: schoolSettings.descriptionBn,
          motto: schoolSettings.motto,
          mottoBn: schoolSettings.mottoBn,
          logo: schoolSettings.logo,
        })
        .from(schoolSettings)
        .where(eq(schoolSettings.id, schoolId))
        .limit(1);

      if (schoolInfo.length === 0) {
        // Return default school information if none exists
        return res.json({
          schoolName: "মডেল স্কুল অ্যান্ড কলেজ",
          schoolNameBn: "মডেল স্কুল অ্যান্ড কলেজ",
          address: "ঢাকা, বাংলাদেশ",
          addressBn: "ঢাকা, বাংলাদেশ",
          email: "info@modelschool.edu.bd",
          phone: "০১৭১২-৩৪৫৬৭৮",
          website: "www.modelschool.edu.bd",
          principalName: "প্রধান শিক্ষক",
          establishmentYear: 1985,
          description: "Quality education for a better future",
          descriptionBn: "উন্নত ভবিষ্যতের জন্য মানসম্পন্ন শিক্ষা",
          motto: "Knowledge is power",
          mottoBn: "জ্ঞানই শক্তি",
          logo: null
        });
      }

      res.json(schoolInfo[0]);
    } catch (error) {
      console.error("Error fetching school info:", error);
      res.status(500).json({ error: "Failed to fetch school information" });
    }
  });

  // Get school statistics
  app.get("/api/public/school-stats", requireSchoolId, async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id || 1;
      const [studentCount] = await db
        .select({ count: count() })
        .from(students)
        .where(and(
          eq(students.status, "active"),
          eq(students.schoolId, schoolId)
        ));

      const [teacherCount] = await db
        .select({ count: count() })
        .from(teachers)
        .where(and(
          eq(teachers.status, "active"),
          eq(teachers.schoolId, schoolId)
        ));

      const schoolInfo = await db
        .select({
          establishmentYear: schoolSettings.establishmentYear,
        })
        .from(schoolSettings)
        .where(eq(schoolSettings.id, schoolId))
        .limit(1);

      res.json({
        totalStudents: studentCount.count,
        totalTeachers: teacherCount.count,
        totalClasses: 10, // Can be calculated from student class distribution
        establishmentYear: schoolInfo[0]?.establishmentYear || 1985,
      });
    } catch (error) {
      console.error("Error fetching school stats:", error);
      res.status(500).json({ error: "Failed to fetch school statistics" });
    }
  });

  // Get upcoming events
  app.get("/api/public/upcoming-events", requireSchoolId, async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id || 1;
      const events = await db
        .select({
          id: calendarEvents.id,
          title: calendarEvents.title,
          description: calendarEvents.description,
          startDate: calendarEvents.startDate,
          endDate: calendarEvents.endDate,
          type: calendarEvents.type,
        })
        .from(calendarEvents)
        .where(eq(calendarEvents.schoolId, schoolId))
        .orderBy(calendarEvents.startDate)
        .limit(5);

      res.json(events);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      res.json([]); // Return empty array if no events table exists
    }
  });

  // Get latest news/notifications
  app.get("/api/public/latest-news", requireSchoolId, async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id || 1;
      const news = await db
        .select({
          id: notifications.id,
          title: notifications.title,
          titleBn: notifications.titleBn,
          message: notifications.message,
          messageBn: notifications.messageBn,
          type: notifications.type,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(and(
          eq(notifications.isLive, true),
          eq(notifications.schoolId, schoolId)
        ))
        .orderBy(desc(notifications.createdAt))
        .limit(5);

      res.json(news);
    } catch (error) {
      console.error("Error fetching latest news:", error);
      res.json([]); // Return empty array if no notifications
    }
  });

  // Get faculty information
  app.get("/api/public/faculty", requireSchoolId, async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id || 1;
      const faculty = await db
        .select({
          id: teachers.id,
          name: teachers.name,
          qualification: teachers.qualification,
          subject: teachers.subject,
          photo: teachers.photo,
        })
        .from(teachers)
        .where(and(
          eq(teachers.status, "active"),
          eq(teachers.schoolId, schoolId)
        ))
        .limit(10);

      res.json(faculty);
    } catch (error) {
      console.error("Error fetching faculty:", error);
      res.json([]);
    }
  });

  // Submit admission application
  app.post("/api/public/admission-applications", requireSchoolId, async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id || 1;
      const validatedData = admissionApplicationSchema.parse(req.body);
      
      // For now, we'll just log the admission application
      // In a real system, you'd save this to a dedicated admissions table
      console.log("New admission application received:", validatedData);
      
      // You could save to a notifications table or dedicated admissions table
      await db.insert(notifications).values({
        title: `New Admission Application: ${validatedData.studentName}`,
        titleBn: `নতুন ভর্তির আবেদন: ${validatedData.studentNameBn}`,
        message: `Admission application received for ${validatedData.studentName} (${validatedData.class})`,
        messageBn: `${validatedData.studentNameBn} (${validatedData.class}) এর ভর্তির আবেদন পেয়েছি`,
        type: "admission",
        priority: "high",
        category: "admissions",
        recipientType: "admin",
        isActive: true,
        isPublic: false,
        schoolId: schoolId,
      });

      res.json({ 
        success: true, 
        message: "Admission application submitted successfully",
        applicationId: Date.now() // Simple ID for demo
      });
    } catch (error) {
      console.error("Error submitting admission application:", error);
      res.status(400).json({ error: "Failed to submit admission application" });
    }
  });

  // Submit contact message
  app.post("/api/public/contact-messages", requireSchoolId, async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id || 1;
      const validatedData = contactMessageSchema.parse(req.body);
      
      // Save contact message as a notification
      await db.insert(notifications).values({
        title: `Contact Message: ${validatedData.subject}`,
        titleBn: `যোগাযোগ বার্তা: ${validatedData.subject}`,
        message: `From: ${validatedData.name} (${validatedData.email}, ${validatedData.phone})\n\n${validatedData.message}`,
        messageBn: `প্রেরক: ${validatedData.name} (${validatedData.email}, ${validatedData.phone})\n\n${validatedData.message}`,
        type: "contact",
        priority: "medium",
        category: "contact",
        recipientType: "admin",
        isActive: true,
        isPublic: false,
        schoolId: schoolId,
      });

      res.json({ 
        success: true, 
        message: "Contact message sent successfully" 
      });
    } catch (error) {
      console.error("Error submitting contact message:", error);
      res.status(400).json({ error: "Failed to submit contact message" });
    }
  });

  // Get academic programs/classes offered
  app.get("/api/public/academic-programs", requireSchoolId, async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id || 1;
      // Get unique classes from students table
      const programs = await db
        .selectDistinct({
          class: students.class,
        })
        .from(students)
        .where(and(
          eq(students.status, "active"),
          eq(students.schoolId, schoolId)
        ));

      const academicPrograms = [
        {
          level: "প্রাথমিক",
          classes: ["প্রথম", "দ্বিতীয়", "তৃতীয়", "চতুর্থ", "পঞ্চম"],
          description: "প্রাথমিক শিক্ষার মৌলিক ভিত্তি"
        },
        {
          level: "মাধ্যমিক",
          classes: ["ষষ্ঠ", "সপ্তম", "অষ্টম", "নবম", "দশম"],
          description: "মাধ্যমিক শিক্ষা ও দক্ষতা উন্নয়ন"
        }
      ];

      res.json(academicPrograms);
    } catch (error) {
      console.error("Error fetching academic programs:", error);
      res.json([]);
    }
  });

  // Get school facilities
  app.get("/api/public/facilities", requireSchoolId, async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id || 1;
      const facilities = [
        {
          name: "আধুনিক শ্রেণীকক্ষ",
          nameBn: "আধুনিক শ্রেণীকক্ষ",
          description: "প্রযুক্তি সহায়তায় সুসজ্জিত শ্রেণীকক্ষ",
          icon: "BookOpen"
        },
        {
          name: "কম্পিউটার ল্যাব",
          nameBn: "কম্পিউটার ল্যাব",
          description: "আধুনিক কম্পিউটার ও ইন্টারনেট সুবিধা",
          icon: "Monitor"
        },
        {
          name: "গ্রন্থাগার",
          nameBn: "গ্রন্থাগার",
          description: "বিস্তৃত বই ও গবেষণা সামগ্রী",
          icon: "Library"
        },
        {
          name: "খেলার মাঠ",
          nameBn: "খেলার মাঠ",
          description: "খেলাধুলা ও শারীরিক শিক্ষার জন্য",
          icon: "Playground"
        },
        {
          name: "বিজ্ঞান গবেষণাগার",
          nameBn: "বিজ্ঞান গবেষণাগার",
          description: "পদার্থ, রসায়ন ও জীববিজ্ঞান ল্যাব",
          icon: "Flask"
        },
        {
          name: "পরিবহন সুবিধা",
          nameBn: "পরিবহন সুবিধা",
          description: "নিরাপদ স্কুল বাস সেবা",
          icon: "Bus"
        }
      ];

      res.json(facilities);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      res.json([]);
    }
  });
}