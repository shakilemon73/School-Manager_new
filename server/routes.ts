// @ts-nocheck - Temporary fix during Supabase migration
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, seedDefaultAdminUser } from "./auth";
import { db } from "../db/index";
import * as schema from "@shared/schema";
import { eq, and, desc, asc, sql, count, isNull, not, or } from "drizzle-orm";
import { supabaseAuth, requireSchoolId, getSchoolId } from "./middleware/supabase-auth";

import { registerParentRoutes } from "./parent-routes";
import { registerPaymentRoutes } from "./payment-routes";
// import { registerNotificationRoutes } from "./notification-routes"; // Disabled - using Supabase
import { registerMeetingRoutes } from "./meeting-routes";
import { registerPortalRoutes } from "./portal-routes";
import { registerPublicWebsiteRoutes } from "./public-website-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Apply Supabase authentication middleware globally
  app.use(supabaseAuth);
  
  // Admin user creation disabled - use application registration instead
  
  // Register parent portal routes
  registerParentRoutes(app);
  
  // Register payment routes
  registerPaymentRoutes(app);
  
  // Register notification routes (disabled in favor of Supabase)
  // registerNotificationRoutes(app);
  
  // Register meeting routes
  registerMeetingRoutes(app);
  
  // Register portal authentication routes
  registerPortalRoutes(app);
  
  // Register public website routes
  registerPublicWebsiteRoutes(app);

  // Generic error handler function
  const handleError = (error: any, res: Response, operation: string) => {
    console.error(`Error ${operation}:`, error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  };

  // API routes grouped by module
  // =================================================================
  
  // DASHBOARD STATISTICS - REMOVED
  // Dashboard endpoints moved to dashboard-routes.ts with proper authentication and tenant scoping
  // =================================================================

  // DOCUMENT MANAGEMENT
  // =================================================================
  
  // Fee Receipts
  app.get('/api/fee-receipts', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const receipts = await db.query.feeReceipts.findMany({
        where: eq(schema.feeReceipts.schoolId, schoolId),
        with: {
          feeItems: true,
          student: true
        },
        orderBy: desc(schema.feeReceipts.createdAt)
      });
      return res.json(receipts);
    } catch (error) {
      return handleError(error, res, 'fetching fee receipts');
    }
  });

  app.get('/api/fee-receipts/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      const receipt = await db.query.feeReceipts.findFirst({
        where: and(
          eq(schema.feeReceipts.id, parseInt(id)),
          eq(schema.feeReceipts.schoolId, schoolId)
        ),
        with: {
          feeItems: true,
          student: true
        }
      });
      
      if (!receipt) {
        return res.status(404).json({ error: 'Receipt not found' });
      }
      
      return res.json(receipt);
    } catch (error) {
      return handleError(error, res, 'fetching fee receipt');
    }
  });

  app.post('/api/fee-receipts', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.feeReceiptInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newReceipt] = await db.insert(schema.feeReceipts)
        .values(validatedData)
        .returning();
      
      // If fee items are provided in the request
      if (req.body.feeItems && Array.isArray(req.body.feeItems)) {
        const feeItems = req.body.feeItems.map((item: any) => ({
          ...item,
          receiptId: newReceipt.id
        }));
        
        await db.insert(schema.feeItems)
          .values(feeItems);
      }
      
      const receiptWithItems = await db.query.feeReceipts.findFirst({
        where: eq(schema.feeReceipts.id, newReceipt.id),
        with: {
          feeItems: true,
          student: true
        }
      });
      
      return res.status(201).json(receiptWithItems);
    } catch (error) {
      return handleError(error, res, 'creating fee receipt');
    }
  });

  app.put('/api/fee-receipts/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      const receipt = await db.query.feeReceipts.findFirst({
        where: and(
          eq(schema.feeReceipts.id, parseInt(id)),
          eq(schema.feeReceipts.schoolId, schoolId)
        )
      });
      
      if (!receipt) {
        return res.status(404).json({ error: 'Receipt not found' });
      }
      
      const validatedData = schema.feeReceiptInsertSchema.partial().parse(req.body);
      
      await db.update(schema.feeReceipts)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(and(
          eq(schema.feeReceipts.id, parseInt(id)),
          eq(schema.feeReceipts.schoolId, schoolId)
        ));
      
      const updatedReceipt = await db.query.feeReceipts.findFirst({
        where: eq(schema.feeReceipts.id, parseInt(id)),
        with: {
          feeItems: true,
          student: true
        }
      });
      
      return res.json(updatedReceipt);
    } catch (error) {
      return handleError(error, res, 'updating fee receipt');
    }
  });

  app.delete('/api/fee-receipts/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      const receipt = await db.query.feeReceipts.findFirst({
        where: and(
          eq(schema.feeReceipts.id, parseInt(id)),
          eq(schema.feeReceipts.schoolId, schoolId)
        )
      });
      
      if (!receipt) {
        return res.status(404).json({ error: 'Receipt not found' });
      }
      
      // Delete all related fee items first
      await db.delete(schema.feeItems)
        .where(eq(schema.feeItems.receiptId, parseInt(id)));
        
      // Then delete the receipt
      await db.delete(schema.feeReceipts)
        .where(and(
          eq(schema.feeReceipts.id, parseInt(id)),
          eq(schema.feeReceipts.schoolId, schoolId)
        ));
      
      return res.status(200).json({ message: 'Receipt deleted successfully' });
    } catch (error) {
      return handleError(error, res, 'deleting fee receipt');
    }
  });

  // Testimonials
  app.get('/api/testimonials', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const testimonials = await db.query.testimonials.findMany({
        where: eq(schema.testimonials.schoolId, schoolId),
        with: {
          student: true,
          signedByTeacher: true
        },
        orderBy: desc(schema.testimonials.createdAt)
      });
      return res.json(testimonials);
    } catch (error) {
      return handleError(error, res, 'fetching testimonials');
    }
  });

  app.get('/api/testimonials/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      const testimonial = await db.query.testimonials.findFirst({
        where: and(
          eq(schema.testimonials.id, parseInt(id)),
          eq(schema.testimonials.schoolId, schoolId)
        ),
        with: {
          student: true,
          signedByTeacher: true,
          template: true
        }
      });
      
      if (!testimonial) {
        return res.status(404).json({ error: 'Testimonial not found' });
      }
      
      return res.json(testimonial);
    } catch (error) {
      return handleError(error, res, 'fetching testimonial');
    }
  });

  app.post('/api/testimonials', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.testimonialInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newTestimonial] = await db.insert(schema.testimonials)
        .values(validatedData)
        .returning();
      
      const testimonialWithRelations = await db.query.testimonials.findFirst({
        where: eq(schema.testimonials.id, newTestimonial.id),
        with: {
          student: true,
          signedByTeacher: true,
          template: true
        }
      });
      
      return res.status(201).json(testimonialWithRelations);
    } catch (error) {
      return handleError(error, res, 'creating testimonial');
    }
  });

  // Admission Forms
  app.get('/api/admission-forms', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const forms = await db.query.admissionForms.findMany({
        where: eq(schema.admissionForms.schoolId, schoolId),
        orderBy: desc(schema.admissionForms.createdAt)
      });
      return res.json(forms);
    } catch (error) {
      return handleError(error, res, 'fetching admission forms');
    }
  });

  app.get('/api/admission-forms/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      const form = await db.query.admissionForms.findFirst({
        where: and(
          eq(schema.admissionForms.id, parseInt(id)),
          eq(schema.admissionForms.schoolId, schoolId)
        )
      });
      
      if (!form) {
        return res.status(404).json({ error: 'Admission form not found' });
      }
      
      return res.json(form);
    } catch (error) {
      return handleError(error, res, 'fetching admission form');
    }
  });

  app.post('/api/admission-forms', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.admissionFormInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newForm] = await db.insert(schema.admissionForms)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newForm);
    } catch (error) {
      return handleError(error, res, 'creating admission form');
    }
  });

  app.put('/api/admission-forms/:id/status', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const schoolId = getSchoolId(req);
      
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      
      const form = await db.query.admissionForms.findFirst({
        where: and(
          eq(schema.admissionForms.id, parseInt(id)),
          eq(schema.admissionForms.schoolId, schoolId)
        )
      });
      
      if (!form) {
        return res.status(404).json({ error: 'Admission form not found' });
      }
      
      await db.update(schema.admissionForms)
        .set({
          status,
          updatedAt: new Date()
        })
        .where(and(
          eq(schema.admissionForms.id, parseInt(id)),
          eq(schema.admissionForms.schoolId, schoolId)
        ));
      
      const updatedForm = await db.query.admissionForms.findFirst({
        where: eq(schema.admissionForms.id, parseInt(id))
      });
      
      return res.json(updatedForm);
    } catch (error) {
      return handleError(error, res, 'updating admission form status');
    }
  });

  // STUDENT MANAGEMENT
  // =================================================================
  
  // Students
  app.get('/api/students', requireSchoolId, async (req, res) => {
    try {
      const { class: studentClass, status, search } = req.query;
      const schoolId = getSchoolId(req);
      
      let conditions = [eq(schema.students.schoolId, schoolId)];
      
      if (studentClass) {
        conditions.push(eq(schema.students.class, studentClass as string));
      }
      
      if (status) {
        conditions.push(eq(schema.students.status, status as string));
      }
      
      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(
          sql`${schema.students.name} ILIKE ${searchPattern} OR ${schema.students.studentId} ILIKE ${searchPattern}`
        );
      }
      
      const students = await db.select().from(schema.students)
        .where(and(...conditions));
      return res.json(students);
    } catch (error) {
      return handleError(error, res, 'fetching students');
    }
  });

  app.get('/api/students/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      const student = await db.query.students.findFirst({
        where: and(
          eq(schema.students.id, parseInt(id)),
          eq(schema.students.schoolId, schoolId)
        ),
        with: {
          feeReceipts: true
        }
      });
      
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      return res.json(student);
    } catch (error) {
      return handleError(error, res, 'fetching student');
    }
  });

  app.post('/api/students', requireSchoolId, async (req, res) => {
    try {
      const data = req.body;
      const schoolId = getSchoolId(req);
      
      // Clean up data - convert empty strings to null for date fields
      if (data.dateOfBirth === '') data.dateOfBirth = null;
      
      const validatedData = schema.studentInsertSchema.parse({
        ...data,
        schoolId
      });
      
      const [newStudent] = await db.insert(schema.students)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newStudent);
    } catch (error) {
      return handleError(error, res, 'creating student');
    }
  });

  app.put('/api/students/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      const student = await db.query.students.findFirst({
        where: and(
          eq(schema.students.id, parseInt(id)),
          eq(schema.students.schoolId, schoolId)
        )
      });
      
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      const validatedData = schema.studentInsertSchema.partial().parse(req.body);
      
      await db.update(schema.students)
        .set(validatedData)
        .where(and(
          eq(schema.students.id, parseInt(id)),
          eq(schema.students.schoolId, schoolId)
        ));
      
      const updatedStudent = await db.query.students.findFirst({
        where: eq(schema.students.id, parseInt(id))
      });
      
      return res.json(updatedStudent);
    } catch (error) {
      return handleError(error, res, 'updating student');
    }
  });

  // Also support PATCH method for partial updates
  app.patch('/api/students/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      const student = await db.query.students.findFirst({
        where: and(
          eq(schema.students.id, parseInt(id)),
          eq(schema.students.schoolId, schoolId)
        )
      });
      
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      const validatedData = schema.studentInsertSchema.partial().parse(req.body);
      
      await db.update(schema.students)
        .set(validatedData)
        .where(and(
          eq(schema.students.id, parseInt(id)),
          eq(schema.students.schoolId, schoolId)
        ));
      
      const updatedStudent = await db.query.students.findFirst({
        where: eq(schema.students.id, parseInt(id))
      });
      
      return res.json(updatedStudent);
    } catch (error) {
      return handleError(error, res, 'updating student');
    }
  });

  app.delete('/api/students/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const studentId = parseInt(id);
      const schoolId = getSchoolId(req);
      
      const student = await db.query.students.findFirst({
        where: and(
          eq(schema.students.id, studentId),
          eq(schema.students.schoolId, schoolId)
        )
      });
      
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      // Use database transaction to ensure all deletions succeed or fail together
      await db.transaction(async (tx) => {
        // 1. Get all fee receipts for this student
        const feeReceipts = await tx.select({ id: schema.feeReceipts.id })
          .from(schema.feeReceipts)
          .where(eq(schema.feeReceipts.studentId, studentId));
        
        // 2. Delete fee items for each receipt
        for (const receipt of feeReceipts) {
          await tx.delete(schema.feeItems)
            .where(eq(schema.feeItems.receiptId, receipt.id));
        }
        
        // 3. Delete fee receipts
        await tx.delete(schema.feeReceipts)
          .where(eq(schema.feeReceipts.studentId, studentId));
        
        // 4. Delete attendance records
        await tx.delete(schema.attendance)
          .where(eq(schema.attendance.studentId, studentId));
        
        // 5. Delete any other potential references using raw SQL for safety
        await tx.execute(sql`DELETE FROM parent_students WHERE student_id = ${studentId}`);
        
        // 6. Finally delete the student
        await tx.delete(schema.students)
          .where(and(
            eq(schema.students.id, studentId),
            eq(schema.students.schoolId, schoolId)
          ));
      });
      
      return res.status(200).json({ message: 'Student deleted successfully' });
    } catch (error) {
      console.error('Error deleting student:', error);
      return handleError(error, res, 'deleting student');
    }
  });

  // Attendance
  app.get('/api/attendance', requireSchoolId, async (req, res) => {
    try {
      const { date, classId, studentId } = req.query;
      const schoolId = getSchoolId(req);
      
      let conditions = [eq(schema.attendance.schoolId, schoolId)];
      
      if (date) {
        conditions.push(eq(schema.attendance.date, date as string));
      }
      
      if (classId) {
        conditions.push(eq(schema.attendance.classId, parseInt(classId as string)));
      }
      
      if (studentId) {
        conditions.push(eq(schema.attendance.studentId, parseInt(studentId as string)));
      }
      
      const attendanceRecords = await db.select().from(schema.attendance)
        .where(and(...conditions));
      return res.json(attendanceRecords);
    } catch (error) {
      return handleError(error, res, 'fetching attendance records');
    }
  });

  app.post('/api/attendance', requireSchoolId, async (req, res) => {
    try {
      const records = req.body;
      const schoolId = getSchoolId(req);
      
      if (!Array.isArray(records)) {
        return res.status(400).json({ error: 'Expected an array of attendance records' });
      }
      
      const validatedRecords = records.map(record => 
        schema.attendanceInsertSchema.parse({
          ...record,
          schoolId
        })
      );
      
      const insertedRecords = await db.insert(schema.attendance)
        .values(validatedRecords)
        .returning();
      
      return res.status(201).json(insertedRecords);
    } catch (error) {
      return handleError(error, res, 'creating attendance records');
    }
  });

  app.put('/api/attendance/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      const attendance = await db.query.attendance.findFirst({
        where: and(
          eq(schema.attendance.id, parseInt(id)),
          eq(schema.attendance.schoolId, schoolId)
        )
      });
      
      if (!attendance) {
        return res.status(404).json({ error: 'Attendance record not found' });
      }
      
      const validatedData = schema.attendanceInsertSchema.partial().parse(req.body);
      
      await db.update(schema.attendance)
        .set(validatedData)
        .where(and(
          eq(schema.attendance.id, parseInt(id)),
          eq(schema.attendance.schoolId, schoolId)
        ));
      
      const updatedAttendance = await db.query.attendance.findFirst({
        where: eq(schema.attendance.id, parseInt(id))
      });
      
      return res.json(updatedAttendance);
    } catch (error) {
      return handleError(error, res, 'updating attendance record');
    }
  });

  // TEACHER MANAGEMENT
  // =================================================================
  
  // Teachers
  app.get('/api/teachers', requireSchoolId, async (req, res) => {
    try {
      const { subject, status, search } = req.query;
      const schoolId = getSchoolId(req);
      
      let conditions = [eq(schema.teachers.schoolId, schoolId)];
      
      if (subject) {
        conditions.push(eq(schema.teachers.subject, subject as string));
      }
      
      if (status) {
        conditions.push(eq(schema.teachers.status, status as string));
      }
      
      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(
          sql`${schema.teachers.name} ILIKE ${searchPattern} OR ${schema.teachers.teacherId} ILIKE ${searchPattern}`
        );
      }
      
      const teachers = await db.select().from(schema.teachers)
        .where(and(...conditions));
      return res.json(teachers);
    } catch (error) {
      return handleError(error, res, 'fetching teachers');
    }
  });

  app.get('/api/teachers/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const teacherId = parseInt(id);
      const schoolId = getSchoolId(req);
      
      if (isNaN(teacherId)) {
        return res.status(400).json({ error: 'Invalid teacher ID' });
      }
      
      const teacher = await db.query.teachers.findFirst({
        where: and(
          eq(schema.teachers.id, teacherId),
          eq(schema.teachers.schoolId, schoolId)
        )
      });
      
      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }
      
      return res.json(teacher);
    } catch (error) {
      return handleError(error, res, 'fetching teacher');
    }
  });

  app.post('/api/teachers', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.teacherInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newTeacher] = await db.insert(schema.teachers)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newTeacher);
    } catch (error) {
      return handleError(error, res, 'creating teacher');
    }
  });

  app.put('/api/teachers/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const teacherId = parseInt(id);
      const schoolId = getSchoolId(req);
      
      if (isNaN(teacherId)) {
        return res.status(400).json({ error: 'Invalid teacher ID' });
      }
      
      const teacher = await db.query.teachers.findFirst({
        where: and(
          eq(schema.teachers.id, teacherId),
          eq(schema.teachers.schoolId, schoolId)
        )
      });
      
      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }
      
      const validatedData = schema.teacherInsertSchema.partial().parse(req.body);
      
      await db.update(schema.teachers)
        .set(validatedData)
        .where(and(
          eq(schema.teachers.id, teacherId),
          eq(schema.teachers.schoolId, schoolId)
        ));
      
      const updatedTeacher = await db.query.teachers.findFirst({
        where: eq(schema.teachers.id, teacherId)
      });
      
      return res.json(updatedTeacher);
    } catch (error) {
      return handleError(error, res, 'updating teacher');
    }
  });

  app.delete('/api/teachers/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const teacherId = parseInt(id);
      const schoolId = getSchoolId(req);
      
      if (isNaN(teacherId)) {
        return res.status(400).json({ error: 'Invalid teacher ID' });
      }
      
      console.log(`Attempting to delete teacher with ID: ${teacherId}`);
      
      // Check if teacher exists
      const teacher = await db.query.teachers.findFirst({
        where: and(
          eq(schema.teachers.id, teacherId),
          eq(schema.teachers.schoolId, schoolId)
        )
      });
      
      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }
      
      console.log(`Found teacher: ${teacher.name}, proceeding with deletion`);
      
      // Delete the teacher
      const deleteResult = await db.delete(schema.teachers)
        .where(and(
          eq(schema.teachers.id, teacherId),
          eq(schema.teachers.schoolId, schoolId)
        ));
      
      console.log('Teacher deletion completed successfully');
      
      return res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
      console.error('Error deleting teacher:', error);
      console.error('Error stack:', error.stack);
      return handleError(error, res, 'deleting teacher');
    }
  });

  // STAFF MANAGEMENT
  // =================================================================
  
  // Staff
  app.get('/api/staff', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const staff = await db.query.staff.findMany({
        where: eq(schema.staff.schoolId, schoolId),
        orderBy: [schema.staff.name]
      });
      return res.json(staff);
    } catch (error: any) {
      if (error.code === '42P01') {
        // Table doesn't exist, return empty array for now
        console.warn('Staff table does not exist, returning empty array');
        return res.json([]);
      }
      return handleError(error, res, 'fetching staff');
    }
  });

  app.get('/api/staff/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      const staffMember = await db.query.staff.findFirst({
        where: and(
          eq(schema.staff.id, parseInt(id)),
          eq(schema.staff.schoolId, schoolId)
        )
      });
      
      if (!staffMember) {
        return res.status(404).json({ error: 'Staff member not found' });
      }
      
      return res.json(staffMember);
    } catch (error: any) {
      if (error.code === '42P01') {
        return res.status(404).json({ error: 'Staff member not found' });
      }
      return handleError(error, res, 'fetching staff member');
    }
  });

  app.post('/api/staff', requireSchoolId, async (req, res) => {
    try {
      const staffData = req.body;
      const schoolId = getSchoolId(req);
      
      // Generate staff ID if not provided
      if (!staffData.staffId) {
        const timestamp = Date.now().toString().slice(-6);
        staffData.staffId = `STF-${timestamp}`;
      }
      
      // Validate using schema but make staffId optional since we generate it
      const validatedData = schema.staffInsertSchema.omit({ staffId: true }).parse(staffData);
      const finalData = { ...validatedData, staffId: staffData.staffId, schoolId };
      
      const newStaff = await db.insert(schema.staff)
        .values(finalData)
        .returning();
      
      return res.status(201).json(newStaff[0]);
    } catch (error: any) {
      if (error.code === '42P01') {
        return res.status(500).json({ error: 'Staff management not available' });
      }
      return handleError(error, res, 'creating staff member');
    }
  });

  app.patch('/api/staff/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const staffId = parseInt(id);
      const updateData = req.body;
      const schoolId = getSchoolId(req);
      
      if (isNaN(staffId)) {
        return res.status(400).json({ error: 'Invalid staff ID' });
      }
      
      const updatedStaff = await db.update(schema.staff)
        .set({ ...updateData, updatedAt: new Date() })
        .where(and(
          eq(schema.staff.id, staffId),
          eq(schema.staff.schoolId, schoolId)
        ))
        .returning();
      
      if (updatedStaff.length === 0) {
        return res.status(404).json({ error: 'Staff member not found' });
      }
      
      return res.json(updatedStaff[0]);
    } catch (error: any) {
      if (error.code === '42P01') {
        return res.status(404).json({ error: 'Staff member not found' });
      }
      return handleError(error, res, 'updating staff member');
    }
  });

  app.delete('/api/staff/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const staffId = parseInt(id);
      const schoolId = getSchoolId(req);
      
      if (isNaN(staffId)) {
        return res.status(400).json({ error: 'Invalid staff ID' });
      }
      
      // Check if staff member exists
      const staffMember = await db.query.staff.findFirst({
        where: and(
          eq(schema.staff.id, staffId),
          eq(schema.staff.schoolId, schoolId)
        )
      });
      
      if (!staffMember) {
        return res.status(404).json({ error: 'Staff member not found' });
      }
      
      // Delete the staff member
      await db.delete(schema.staff)
        .where(and(
          eq(schema.staff.id, staffId),
          eq(schema.staff.schoolId, schoolId)
        ));
      
      return res.json({ message: 'Staff member deleted successfully' });
    } catch (error: any) {
      if (error.code === '42P01') {
        return res.status(404).json({ error: 'Staff member not found' });
      }
      return handleError(error, res, 'deleting staff member');
    }
  });

  // PARENTS MANAGEMENT
  // =================================================================
  
  // Parents
  app.get('/api/parents', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const parents = await db.select().from(schema.parents)
        .where(eq(schema.parents.schoolId, schoolId))
        .orderBy(schema.parents.name);
      return res.json(parents);
    } catch (error) {
      return handleError(error, res, 'fetching parents');
    }
  });

  app.get('/api/parents/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      const parent = await db.select().from(schema.parents)
        .where(and(
          eq(schema.parents.id, parseInt(id)),
          eq(schema.parents.schoolId, schoolId)
        ))
        .limit(1);
      
      if (!parent || parent.length === 0) {
        return res.status(404).json({ error: 'Parent not found' });
      }
      
      return res.json(parent[0]);
    } catch (error) {
      return handleError(error, res, 'fetching parent');
    }
  });

  app.post('/api/parents', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.parentInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newParent] = await db.insert(schema.parents)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newParent);
    } catch (error) {
      return handleError(error, res, 'creating parent');
    }
  });

  app.patch('/api/parents/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      
      const parent = await db.query.parents.findFirst({
        where: and(
          eq(schema.parents.id, parseInt(id)),
          eq(schema.parents.schoolId, schoolId)
        )
      });
      
      if (!parent) {
        return res.status(404).json({ error: 'Parent not found' });
      }
      
      const validatedData = schema.parentInsertSchema.partial().parse(req.body);
      
      await db.update(schema.parents)
        .set(validatedData)
        .where(and(
          eq(schema.parents.id, parseInt(id)),
          eq(schema.parents.schoolId, schoolId)
        ));
      
      const updatedParent = await db.query.parents.findFirst({
        where: eq(schema.parents.id, parseInt(id))
      });
      
      return res.json(updatedParent);
    } catch (error) {
      return handleError(error, res, 'updating parent');
    }
  });

  app.delete('/api/parents/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      
      // Check if parent exists
      const parent = await db.query.parents.findFirst({
        where: and(
          eq(schema.parents.id, parseInt(id)),
          eq(schema.parents.schoolId, schoolId)
        )
      });
      
      if (!parent) {
        return res.status(404).json({ error: 'Parent not found' });
      }
      
      // Delete the parent
      await db.delete(schema.parents)
        .where(and(
          eq(schema.parents.id, parseInt(id)),
          eq(schema.parents.schoolId, schoolId)
        ));
      
      return res.json({ message: 'Parent deleted successfully' });
    } catch (error) {
      return handleError(error, res, 'deleting parent');
    }
  });

  // CLASS MANAGEMENT
  // =================================================================
  
  // Classes
  app.get('/api/classes', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const classes = await db.query.classes.findMany({
        where: eq(schema.classes.schoolId, schoolId),
        with: {
          teacher: true
        }
      });
      return res.json(classes);
    } catch (error) {
      return handleError(error, res, 'fetching classes');
    }
  });

  app.get('/api/classes/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      const classData = await db.query.classes.findFirst({
        where: and(
          eq(schema.classes.id, parseInt(id)),
          eq(schema.classes.schoolId, schoolId)
        ),
        with: {
          teacher: true
        }
      });
      
      if (!classData) {
        return res.status(404).json({ error: 'Class not found' });
      }
      
      return res.json(classData);
    } catch (error) {
      return handleError(error, res, 'fetching class');
    }
  });

  app.post('/api/classes', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.classInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newClass] = await db.insert(schema.classes)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newClass);
    } catch (error) {
      return handleError(error, res, 'creating class');
    }
  });

  // Class Routines (Periods)
  app.get('/api/periods', requireSchoolId, async (req, res) => {
    try {
      const { classId, dayOfWeek } = req.query;
      const schoolId = getSchoolId(req);
      
      let conditions = [eq(schema.periods.schoolId, schoolId)];
      
      if (classId) {
        conditions.push(eq(schema.periods.classId, parseInt(classId as string)));
      }
      
      if (dayOfWeek) {
        conditions.push(eq(schema.periods.dayOfWeek, dayOfWeek as string));
      }
      
      const periods = await db.select().from(schema.periods)
        .where(and(...conditions));
      return res.json(periods);
    } catch (error) {
      return handleError(error, res, 'fetching periods');
    }
  });

  app.post('/api/periods', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.periodInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newPeriod] = await db.insert(schema.periods)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newPeriod);
    } catch (error) {
      return handleError(error, res, 'creating period');
    }
  });

  // EXAM MANAGEMENT
  // =================================================================
  
  // Academic Years
  app.get('/api/academic-years', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const academicYears = await db.query.academicYears.findMany({
        where: eq(schema.academicYears.schoolId, schoolId),
        orderBy: desc(schema.academicYears.startDate)
      });
      return res.json(academicYears);
    } catch (error) {
      return handleError(error, res, 'fetching academic years');
    }
  });

  app.post('/api/academic-years', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.academicYearInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      // If setting this as current, unset any existing current years for this school
      if (validatedData.isCurrent) {
        await db.update(schema.academicYears)
          .set({ isCurrent: false })
          .where(and(
            eq(schema.academicYears.isCurrent, true),
            eq(schema.academicYears.schoolId, schoolId)
          ));
      }
      
      const [newAcademicYear] = await db.insert(schema.academicYears)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newAcademicYear);
    } catch (error) {
      return handleError(error, res, 'creating academic year');
    }
  });

  // Exams
  app.get('/api/exams', requireSchoolId, async (req, res) => {
    try {
      const { academicYearId } = req.query;
      const schoolId = getSchoolId(req);
      
      let conditions = [eq(schema.exams.schoolId, schoolId)];
      
      if (academicYearId) {
        conditions.push(eq(schema.exams.academicYearId, parseInt(academicYearId as string)));
      }
      
      const exams = await db.query.exams.findMany({
        where: and(...conditions),
        with: {
          academicYear: true
        },
        orderBy: desc(schema.exams.startDate)
      });
      
      return res.json(exams);
    } catch (error) {
      return handleError(error, res, 'fetching exams');
    }
  });

  app.get('/api/exams/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      const exam = await db.query.exams.findFirst({
        where: and(
          eq(schema.exams.id, parseInt(id)),
          eq(schema.exams.schoolId, schoolId)
        ),
        with: {
          academicYear: true,
          schedules: true
        }
      });
      
      if (!exam) {
        return res.status(404).json({ error: 'Exam not found' });
      }
      
      return res.json(exam);
    } catch (error) {
      return handleError(error, res, 'fetching exam');
    }
  });

  app.post('/api/exams', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.examInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newExam] = await db.insert(schema.exams)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newExam);
    } catch (error) {
      return handleError(error, res, 'creating exam');
    }
  });

  // Exam Schedules
  app.get('/api/exam-schedules', requireSchoolId, async (req, res) => {
    try {
      const { examId, classId } = req.query;
      const schoolId = getSchoolId(req);
      
      let conditions = [eq(schema.examSchedules.schoolId, schoolId)];
      
      if (examId) {
        conditions.push(eq(schema.examSchedules.examId, parseInt(examId as string)));
      }
      
      if (classId) {
        conditions.push(eq(schema.examSchedules.classId, parseInt(classId as string)));
      }
      
      const schedules = await db.select().from(schema.examSchedules)
        .where(and(...conditions));
      return res.json(schedules);
    } catch (error) {
      return handleError(error, res, 'fetching exam schedules');
    }
  });

  app.post('/api/exam-schedules', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.examScheduleInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newSchedule] = await db.insert(schema.examSchedules)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newSchedule);
    } catch (error) {
      return handleError(error, res, 'creating exam schedule');
    }
  });

  // Exam Results
  app.get('/api/exam-results', requireSchoolId, async (req, res) => {
    try {
      const { examId, studentId } = req.query;
      const schoolId = getSchoolId(req);
      
      let conditions = [eq(schema.examResults.schoolId, schoolId)];
      
      if (examId) {
        conditions.push(eq(schema.examResults.examId, parseInt(examId as string)));
      }
      
      if (studentId) {
        conditions.push(eq(schema.examResults.studentId, parseInt(studentId as string)));
      }
      
      const results = await db.select().from(schema.examResults)
        .where(and(...conditions));
      return res.json(results);
    } catch (error) {
      return handleError(error, res, 'fetching exam results');
    }
  });

  app.post('/api/exam-results', requireSchoolId, async (req, res) => {
    try {
      const records = req.body;
      const schoolId = getSchoolId(req);
      
      if (!Array.isArray(records)) {
        return res.status(400).json({ error: 'Expected an array of exam results' });
      }
      
      const validatedRecords = records.map(record => 
        schema.examResultInsertSchema.parse({
          ...record,
          schoolId
        })
      );
      
      const insertedRecords = await db.insert(schema.examResults)
        .values(validatedRecords)
        .returning();
      
      return res.status(201).json(insertedRecords);
    } catch (error) {
      return handleError(error, res, 'creating exam results');
    }
  });

  // LIBRARY MANAGEMENT
  // =================================================================
  
  // Books
  app.get('/api/books', requireSchoolId, async (req, res) => {
    try {
      const { category, search } = req.query;
      const schoolId = getSchoolId(req);
      
      let conditions = [eq(schema.books.schoolId, schoolId)];
      
      if (category) {
        conditions.push(eq(schema.books.category, category as string));
      }
      
      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(
          sql`${schema.books.title} ILIKE ${searchPattern} OR ${schema.books.author} ILIKE ${searchPattern} OR ${schema.books.isbn} ILIKE ${searchPattern}`
        );
      }
      
      const books = await db.select().from(schema.books)
        .where(and(...conditions));
      return res.json(books);
    } catch (error) {
      return handleError(error, res, 'fetching books');
    }
  });

  app.get('/api/books/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      const book = await db.query.books.findFirst({
        where: and(
          eq(schema.books.id, parseInt(id)),
          eq(schema.books.schoolId, schoolId)
        )
      });
      
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }
      
      return res.json(book);
    } catch (error) {
      return handleError(error, res, 'fetching book');
    }
  });

  app.post('/api/books', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.bookInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newBook] = await db.insert(schema.books)
        .values({
          ...validatedData,
          availableCopies: validatedData.copies
        })
        .returning();
      
      return res.status(201).json(newBook);
    } catch (error) {
      return handleError(error, res, 'creating book');
    }
  });

  // Book Issues
  app.get('/api/book-issues', requireSchoolId, async (req, res) => {
    try {
      const { status, studentId, bookId } = req.query;
      const schoolId = getSchoolId(req);
      
      let conditions = [eq(schema.bookIssues.schoolId, schoolId)];
      
      if (status) {
        conditions.push(eq(schema.bookIssues.status, status as string));
      }
      
      if (studentId) {
        conditions.push(eq(schema.bookIssues.studentId, parseInt(studentId as string)));
      }
      
      if (bookId) {
        conditions.push(eq(schema.bookIssues.bookId, parseInt(bookId as string)));
      }
      
      const bookIssues = await db.select().from(schema.bookIssues)
        .where(and(...conditions));
      return res.json(bookIssues);
    } catch (error) {
      return handleError(error, res, 'fetching book issues');
    }
  });

  app.post('/api/book-issues', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.bookIssueInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      // Check if book is available
      const book = await db.query.books.findFirst({
        where: and(
          eq(schema.books.id, validatedData.bookId),
          eq(schema.books.schoolId, schoolId)
        )
      });
      
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }
      
      if (book.availableCopies < 1) {
        return res.status(400).json({ error: 'Book is not available for issue' });
      }
      
      // Start a transaction
      const [newIssue] = await db.insert(schema.bookIssues)
        .values({
          ...validatedData,
          status: 'issued'
        })
        .returning();
      
      // Update available copies
      await db.update(schema.books)
        .set({
          availableCopies: book.availableCopies - 1
        })
        .where(and(
          eq(schema.books.id, validatedData.bookId),
          eq(schema.books.schoolId, schoolId)
        ));
      
      return res.status(201).json(newIssue);
    } catch (error) {
      return handleError(error, res, 'creating book issue');
    }
  });

  app.put('/api/book-issues/:id/return', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const { returnDate, fine } = req.body;
      const schoolId = getSchoolId(req);
      
      const issue = await db.query.bookIssues.findFirst({
        where: and(
          eq(schema.bookIssues.id, parseInt(id)),
          eq(schema.bookIssues.schoolId, schoolId)
        )
      });
      
      if (!issue) {
        return res.status(404).json({ error: 'Book issue not found' });
      }
      
      if (issue.status === 'returned') {
        return res.status(400).json({ error: 'Book already returned' });
      }
      
      // Update issue status
      await db.update(schema.bookIssues)
        .set({
          status: 'returned',
          returnDate: returnDate || new Date(),
          fine: fine || 0,
          updatedAt: new Date()
        })
        .where(and(
          eq(schema.bookIssues.id, parseInt(id)),
          eq(schema.bookIssues.schoolId, schoolId)
        ));
      
      // Update book available copies
      const book = await db.query.books.findFirst({
        where: and(
          eq(schema.books.id, issue.bookId),
          eq(schema.books.schoolId, schoolId)
        )
      });
      
      if (book) {
        await db.update(schema.books)
          .set({
            availableCopies: book.availableCopies + 1
          })
          .where(and(
            eq(schema.books.id, issue.bookId),
            eq(schema.books.schoolId, schoolId)
          ));
      }
      
      const updatedIssue = await db.query.bookIssues.findFirst({
        where: eq(schema.bookIssues.id, parseInt(id))
      });
      
      return res.json(updatedIssue);
    } catch (error) {
      return handleError(error, res, 'updating book return');
    }
  });

  // INVENTORY MANAGEMENT
  // =================================================================
  
  // Inventory Categories
  app.get('/api/inventory-categories', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const categories = await db.query.inventoryCategories.findMany({
        where: eq(schema.inventoryCategories.schoolId, schoolId)
      });
      return res.json(categories);
    } catch (error) {
      return handleError(error, res, 'fetching inventory categories');
    }
  });

  app.post('/api/inventory-categories', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.inventoryCategoryInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newCategory] = await db.insert(schema.inventoryCategories)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newCategory);
    } catch (error) {
      return handleError(error, res, 'creating inventory category');
    }
  });

  // Inventory Items
  app.get('/api/inventory-items', requireSchoolId, async (req, res) => {
    try {
      const { categoryId, search } = req.query;
      const schoolId = getSchoolId(req);
      
      let conditions = [eq(schema.inventoryItems.schoolId, schoolId)];
      
      if (categoryId) {
        conditions.push(eq(schema.inventoryItems.categoryId, parseInt(categoryId as string)));
      }
      
      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(sql`${schema.inventoryItems.name} ILIKE ${searchPattern}`);
      }
      
      const items = await db.query.inventoryItems.findMany({
        where: and(...conditions),
        with: {
          category: true
        }
      });
      
      return res.json(items);
    } catch (error) {
      return handleError(error, res, 'fetching inventory items');
    }
  });

  app.post('/api/inventory-items', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.inventoryItemInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newItem] = await db.insert(schema.inventoryItems)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newItem);
    } catch (error) {
      return handleError(error, res, 'creating inventory item');
    }
  });

  app.put('/api/inventory-items/:id/quantity', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity, operation = 'set' } = req.body;
      const schoolId = getSchoolId(req);
      
      if (typeof quantity !== 'number' || quantity < 0) {
        return res.status(400).json({ error: 'Invalid quantity value' });
      }
      
      const item = await db.query.inventoryItems.findFirst({
        where: and(
          eq(schema.inventoryItems.id, parseInt(id)),
          eq(schema.inventoryItems.schoolId, schoolId)
        )
      });
      
      if (!item) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }
      
      let newQuantity = quantity;
      if (operation === 'add') {
        newQuantity = item.quantity + quantity;
      } else if (operation === 'subtract') {
        newQuantity = Math.max(0, item.quantity - quantity);
      }
      
      await db.update(schema.inventoryItems)
        .set({
          quantity: newQuantity,
          updatedAt: new Date()
        })
        .where(and(
          eq(schema.inventoryItems.id, parseInt(id)),
          eq(schema.inventoryItems.schoolId, schoolId)
        ));
      
      const updatedItem = await db.query.inventoryItems.findFirst({
        where: eq(schema.inventoryItems.id, parseInt(id))
      });
      
      return res.json(updatedItem);
    } catch (error) {
      return handleError(error, res, 'updating inventory item quantity');
    }
  });

  // TRANSPORT MANAGEMENT
  // =================================================================
  
  // Vehicles
  app.get('/api/vehicles', requireSchoolId, async (req, res) => {
    try {
      const { status, type } = req.query;
      const schoolId = getSchoolId(req);
      
      let conditions = [eq(schema.vehicles.schoolId, schoolId)];
      
      if (status) {
        conditions.push(eq(schema.vehicles.status, status as string));
      }
      
      if (type) {
        conditions.push(eq(schema.vehicles.type, type as string));
      }
      
      const vehicles = await db.select().from(schema.vehicles)
        .where(and(...conditions));
      return res.json(vehicles);
    } catch (error) {
      return handleError(error, res, 'fetching vehicles');
    }
  });

  app.post('/api/vehicles', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.vehicleInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newVehicle] = await db.insert(schema.vehicles)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newVehicle);
    } catch (error) {
      return handleError(error, res, 'creating vehicle');
    }
  });

  // Transport Routes
  app.get('/api/transport-routes', requireSchoolId, async (req, res) => {
    try {
      const { vehicleId } = req.query;
      const schoolId = getSchoolId(req);
      
      let conditions = [eq(schema.transportRoutes.schoolId, schoolId)];
      
      if (vehicleId) {
        conditions.push(eq(schema.transportRoutes.vehicleId, parseInt(vehicleId as string)));
      }
      
      const routes = await db.query.transportRoutes.findMany({
        where: and(...conditions),
        with: {
          vehicle: true
        }
      });
      
      return res.json(routes);
    } catch (error) {
      return handleError(error, res, 'fetching transport routes');
    }
  });

  app.post('/api/transport-routes', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.transportRouteInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newRoute] = await db.insert(schema.transportRoutes)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newRoute);
    } catch (error) {
      return handleError(error, res, 'creating transport route');
    }
  });

  // Transport Assignments
  app.get('/api/transport-assignments', requireSchoolId, async (req, res) => {
    try {
      const { routeId, studentId, status } = req.query;
      const schoolId = getSchoolId(req);
      
      let conditions = [eq(schema.transportAssignments.schoolId, schoolId)];
      
      if (routeId) {
        conditions.push(eq(schema.transportAssignments.routeId, parseInt(routeId as string)));
      }
      
      if (studentId) {
        conditions.push(eq(schema.transportAssignments.studentId, parseInt(studentId as string)));
      }
      
      if (status) {
        conditions.push(eq(schema.transportAssignments.status, status as string));
      }
      
      const assignments = await db.query.transportAssignments.findMany({
        where: and(...conditions),
        with: {
          student: true,
          route: {
            with: {
              vehicle: true
            }
          }
        }
      });
      
      return res.json(assignments);
    } catch (error) {
      return handleError(error, res, 'fetching transport assignments');
    }
  });

  app.post('/api/transport-assignments', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.transportAssignmentInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newAssignment] = await db.insert(schema.transportAssignments)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newAssignment);
    } catch (error) {
      return handleError(error, res, 'creating transport assignment');
    }
  });

  // CALENDAR & EVENTS
  // =================================================================
  
  app.get('/api/events', requireSchoolId, async (req, res) => {
    try {
      const { startDate, endDate, eventType } = req.query;
      const schoolId = getSchoolId(req);
      
      let conditions = [eq(schema.events.schoolId, schoolId)];
      
      if (startDate && endDate) {
        conditions.push(
          sql`${schema.events.startDate} >= ${startDate}`,
          sql`${schema.events.startDate} <= ${endDate}`
        );
      }
      
      if (eventType) {
        conditions.push(eq(schema.events.eventType, eventType as string));
      }
      
      const events = await db.select().from(schema.events)
        .where(and(...conditions))
        .orderBy(asc(schema.events.startDate));
      return res.json(events);
    } catch (error) {
      return handleError(error, res, 'fetching events');
    }
  });

  app.post('/api/events', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.eventInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newEvent] = await db.insert(schema.events)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newEvent);
    } catch (error) {
      return handleError(error, res, 'creating event');
    }
  });

  // NOTIFICATIONS
  // =================================================================
  
  app.get('/api/notifications', requireSchoolId, async (req, res) => {
    try {
      const { userId, read } = req.query;
      const schoolId = getSchoolId(req);
      
      let conditions = [eq(schema.notifications.schoolId, schoolId)];
      
      if (userId) {
        conditions.push(
          or(
            eq(schema.notifications.targetUserId, parseInt(userId as string)),
            isNull(schema.notifications.targetUserId)
          )
        );
      }
      
      if (read !== undefined) {
        conditions.push(eq(schema.notifications.read, read === 'true'));
      }
      
      const notifications = await db.select().from(schema.notifications)
        .where(and(...conditions))
        .orderBy(desc(schema.notifications.createdAt));
      return res.json(notifications);
    } catch (error) {
      return handleError(error, res, 'fetching notifications');
    }
  });

  app.post('/api/notifications', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.notificationInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newNotification] = await db.insert(schema.notifications)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newNotification);
    } catch (error) {
      return handleError(error, res, 'creating notification');
    }
  });

  app.put('/api/notifications/:id/read', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      
      const notification = await db.query.notifications.findFirst({
        where: and(
          eq(schema.notifications.id, parseInt(id)),
          eq(schema.notifications.schoolId, schoolId)
        )
      });
      
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      await db.update(schema.notifications)
        .set({
          read: true
        })
        .where(and(
          eq(schema.notifications.id, parseInt(id)),
          eq(schema.notifications.schoolId, schoolId)
        ));
      
      const updatedNotification = await db.query.notifications.findFirst({
        where: eq(schema.notifications.id, parseInt(id))
      });
      
      return res.json(updatedNotification);
    } catch (error) {
      return handleError(error, res, 'updating notification');
    }
  });

  // FINANCIAL MANAGEMENT
  // =================================================================
  
  app.get('/api/financial-transactions', requireSchoolId, async (req, res) => {
    try {
      const { transactionType, category, startDate, endDate } = req.query;
      const schoolId = getSchoolId(req);
      
      let conditions = [eq(schema.financialTransactions.schoolId, schoolId)];
      
      if (transactionType) {
        conditions.push(eq(schema.financialTransactions.transactionType, transactionType as string));
      }
      
      if (category) {
        conditions.push(eq(schema.financialTransactions.category, category as string));
      }
      
      if (startDate && endDate) {
        conditions.push(
          sql`${schema.financialTransactions.date} >= ${startDate}`,
          sql`${schema.financialTransactions.date} <= ${endDate}`
        );
      }
      
      const transactions = await db.select().from(schema.financialTransactions)
        .where(and(...conditions))
        .orderBy(desc(schema.financialTransactions.date));
      return res.json(transactions);
    } catch (error) {
      return handleError(error, res, 'fetching financial transactions');
    }
  });

  app.post('/api/financial-transactions', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.financialTransactionInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      const [newTransaction] = await db.insert(schema.financialTransactions)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newTransaction);
    } catch (error) {
      return handleError(error, res, 'creating financial transaction');
    }
  });
  
  // TEMPLATE MANAGEMENT
  // =================================================================
  
  app.get('/api/templates', requireSchoolId, async (req, res) => {
    try {
      const { type, isDefault } = req.query;
      const schoolId = getSchoolId(req);
      
      let conditions = [eq(schema.templates.schoolId, schoolId)];
      
      if (type) {
        conditions.push(eq(schema.templates.type, type as string));
      }
      
      if (isDefault !== undefined) {
        conditions.push(eq(schema.templates.isDefault, isDefault === 'true'));
      }
      
      const templates = await db.select().from(schema.templates)
        .where(and(...conditions));
      return res.json(templates);
    } catch (error) {
      return handleError(error, res, 'fetching templates');
    }
  });

  app.get('/api/templates/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      const template = await db.query.templates.findFirst({
        where: and(
          eq(schema.templates.id, parseInt(id)),
          eq(schema.templates.schoolId, schoolId)
        )
      });
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      return res.json(template);
    } catch (error) {
      return handleError(error, res, 'fetching template');
    }
  });

  app.post('/api/templates', requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const validatedData = schema.templateInsertSchema.parse({
        ...req.body,
        schoolId
      });
      
      // If setting as default, unset any existing default templates of the same type for this school
      if (validatedData.isDefault) {
        await db.update(schema.templates)
          .set({ isDefault: false })
          .where(
            and(
              eq(schema.templates.type, validatedData.type),
              eq(schema.templates.isDefault, true),
              eq(schema.templates.schoolId, schoolId)
            )
          );
      }
      
      const [newTemplate] = await db.insert(schema.templates)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newTemplate);
    } catch (error) {
      return handleError(error, res, 'creating template');
    }
  });

  app.put('/api/templates/:id', requireSchoolId, async (req, res) => {
    try {
      const { id } = req.params;
      const schoolId = getSchoolId(req);
      const template = await db.query.templates.findFirst({
        where: and(
          eq(schema.templates.id, parseInt(id)),
          eq(schema.templates.schoolId, schoolId)
        )
      });
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      const validatedData = schema.templateInsertSchema.partial().parse(req.body);
      
      // If setting as default, unset any existing default templates of the same type for this school
      if (validatedData.isDefault) {
        await db.update(schema.templates)
          .set({ isDefault: false })
          .where(
            and(
              eq(schema.templates.type, template.type),
              eq(schema.templates.isDefault, true),
              eq(schema.templates.schoolId, schoolId),
              not(eq(schema.templates.id, parseInt(id)))
            )
          );
      }
      
      await db.update(schema.templates)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(and(
          eq(schema.templates.id, parseInt(id)),
          eq(schema.templates.schoolId, schoolId)
        ));
      
      const updatedTemplate = await db.query.templates.findFirst({
        where: eq(schema.templates.id, parseInt(id))
      });
      
      return res.json(updatedTemplate);
    } catch (error) {
      return handleError(error, res, 'updating template');
    }
  });

  // Complete our API routes list by adding the closing for the server
  const httpServer = createServer(app);
  return httpServer;
}
