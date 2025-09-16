// @ts-nocheck - Temporary fix during Supabase migration
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, seedDefaultAdminUser } from "./auth";
import { db } from "../db/index";
import * as schema from "@shared/schema";
import { eq, and, desc, asc, sql, count, isNull, not, or } from "drizzle-orm";

import { registerParentRoutes } from "./parent-routes";
import { registerPaymentRoutes } from "./payment-routes";
// import { registerNotificationRoutes } from "./notification-routes"; // Disabled - using Supabase
import { registerMeetingRoutes } from "./meeting-routes";
import { registerPortalRoutes } from "./portal-routes";
import { registerPublicWebsiteRoutes } from "./public-website-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
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
  app.get('/api/fee-receipts', async (req, res) => {
    try {
      const receipts = await db.query.feeReceipts.findMany({
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

  app.get('/api/fee-receipts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const receipt = await db.query.feeReceipts.findFirst({
        where: eq(schema.feeReceipts.id, parseInt(id)),
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

  app.post('/api/fee-receipts', async (req, res) => {
    try {
      const validatedData = schema.feeReceiptInsertSchema.parse(req.body);
      
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

  app.put('/api/fee-receipts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const receipt = await db.query.feeReceipts.findFirst({
        where: eq(schema.feeReceipts.id, parseInt(id))
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
        .where(eq(schema.feeReceipts.id, parseInt(id)));
      
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

  app.delete('/api/fee-receipts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const receipt = await db.query.feeReceipts.findFirst({
        where: eq(schema.feeReceipts.id, parseInt(id))
      });
      
      if (!receipt) {
        return res.status(404).json({ error: 'Receipt not found' });
      }
      
      // Delete all related fee items first
      await db.delete(schema.feeItems)
        .where(eq(schema.feeItems.receiptId, parseInt(id)));
        
      // Then delete the receipt
      await db.delete(schema.feeReceipts)
        .where(eq(schema.feeReceipts.id, parseInt(id)));
      
      return res.status(200).json({ message: 'Receipt deleted successfully' });
    } catch (error) {
      return handleError(error, res, 'deleting fee receipt');
    }
  });

  // Testimonials
  app.get('/api/testimonials', async (req, res) => {
    try {
      const testimonials = await db.query.testimonials.findMany({
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

  app.get('/api/testimonials/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const testimonial = await db.query.testimonials.findFirst({
        where: eq(schema.testimonials.id, parseInt(id)),
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

  app.post('/api/testimonials', async (req, res) => {
    try {
      const validatedData = schema.testimonialInsertSchema.parse(req.body);
      
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
  app.get('/api/admission-forms', async (req, res) => {
    try {
      const forms = await db.query.admissionForms.findMany({
        orderBy: desc(schema.admissionForms.createdAt)
      });
      return res.json(forms);
    } catch (error) {
      return handleError(error, res, 'fetching admission forms');
    }
  });

  app.get('/api/admission-forms/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const form = await db.query.admissionForms.findFirst({
        where: eq(schema.admissionForms.id, parseInt(id))
      });
      
      if (!form) {
        return res.status(404).json({ error: 'Admission form not found' });
      }
      
      return res.json(form);
    } catch (error) {
      return handleError(error, res, 'fetching admission form');
    }
  });

  app.post('/api/admission-forms', async (req, res) => {
    try {
      const validatedData = schema.admissionFormInsertSchema.parse(req.body);
      
      const [newForm] = await db.insert(schema.admissionForms)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newForm);
    } catch (error) {
      return handleError(error, res, 'creating admission form');
    }
  });

  app.put('/api/admission-forms/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      
      const form = await db.query.admissionForms.findFirst({
        where: eq(schema.admissionForms.id, parseInt(id))
      });
      
      if (!form) {
        return res.status(404).json({ error: 'Admission form not found' });
      }
      
      await db.update(schema.admissionForms)
        .set({
          status,
          updatedAt: new Date()
        })
        .where(eq(schema.admissionForms.id, parseInt(id)));
      
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
  app.get('/api/students', async (req, res) => {
    try {
      const { class: studentClass, status, search } = req.query;
      
      let query = db.select().from(schema.students);
      
      if (studentClass) {
        query = query.where(eq(schema.students.class, studentClass as string));
      }
      
      if (status) {
        query = query.where(eq(schema.students.status, status as string));
      }
      
      if (search) {
        const searchPattern = `%${search}%`;
        query = query.where(
          sql`${schema.students.name} ILIKE ${searchPattern} OR ${schema.students.studentId} ILIKE ${searchPattern}`
        );
      }
      
      const students = await query;
      return res.json(students);
    } catch (error) {
      return handleError(error, res, 'fetching students');
    }
  });

  app.get('/api/students/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const student = await db.query.students.findFirst({
        where: eq(schema.students.id, parseInt(id)),
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

  app.post('/api/students', async (req, res) => {
    try {
      const data = req.body;
      
      // Clean up data - convert empty strings to null for date fields
      if (data.dateOfBirth === '') data.dateOfBirth = null;
      
      const validatedData = schema.studentInsertSchema.parse(data);
      
      const [newStudent] = await db.insert(schema.students)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newStudent);
    } catch (error) {
      return handleError(error, res, 'creating student');
    }
  });

  app.put('/api/students/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const student = await db.query.students.findFirst({
        where: eq(schema.students.id, parseInt(id))
      });
      
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      const validatedData = schema.studentInsertSchema.partial().parse(req.body);
      
      await db.update(schema.students)
        .set(validatedData)
        .where(eq(schema.students.id, parseInt(id)));
      
      const updatedStudent = await db.query.students.findFirst({
        where: eq(schema.students.id, parseInt(id))
      });
      
      return res.json(updatedStudent);
    } catch (error) {
      return handleError(error, res, 'updating student');
    }
  });

  // Also support PATCH method for partial updates
  app.patch('/api/students/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const student = await db.query.students.findFirst({
        where: eq(schema.students.id, parseInt(id))
      });
      
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      const validatedData = schema.studentInsertSchema.partial().parse(req.body);
      
      await db.update(schema.students)
        .set(validatedData)
        .where(eq(schema.students.id, parseInt(id)));
      
      const updatedStudent = await db.query.students.findFirst({
        where: eq(schema.students.id, parseInt(id))
      });
      
      return res.json(updatedStudent);
    } catch (error) {
      return handleError(error, res, 'updating student');
    }
  });

  app.delete('/api/students/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const studentId = parseInt(id);
      
      const student = await db.query.students.findFirst({
        where: eq(schema.students.id, studentId)
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
          .where(eq(schema.students.id, studentId));
      });
      
      return res.status(200).json({ message: 'Student deleted successfully' });
    } catch (error) {
      console.error('Error deleting student:', error);
      return handleError(error, res, 'deleting student');
    }
  });

  // Attendance
  app.get('/api/attendance', async (req, res) => {
    try {
      const { date, classId, studentId } = req.query;
      
      let query = db.select().from(schema.attendance);
      
      if (date) {
        query = query.where(eq(schema.attendance.date, date as string));
      }
      
      if (classId) {
        query = query.where(eq(schema.attendance.classId, parseInt(classId as string)));
      }
      
      if (studentId) {
        query = query.where(eq(schema.attendance.studentId, parseInt(studentId as string)));
      }
      
      const attendanceRecords = await query;
      return res.json(attendanceRecords);
    } catch (error) {
      return handleError(error, res, 'fetching attendance records');
    }
  });

  app.post('/api/attendance', async (req, res) => {
    try {
      const records = req.body;
      
      if (!Array.isArray(records)) {
        return res.status(400).json({ error: 'Expected an array of attendance records' });
      }
      
      const validatedRecords = records.map(record => 
        schema.attendanceInsertSchema.parse(record)
      );
      
      const insertedRecords = await db.insert(schema.attendance)
        .values(validatedRecords)
        .returning();
      
      return res.status(201).json(insertedRecords);
    } catch (error) {
      return handleError(error, res, 'creating attendance records');
    }
  });

  app.put('/api/attendance/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const attendance = await db.query.attendance.findFirst({
        where: eq(schema.attendance.id, parseInt(id))
      });
      
      if (!attendance) {
        return res.status(404).json({ error: 'Attendance record not found' });
      }
      
      const validatedData = schema.attendanceInsertSchema.partial().parse(req.body);
      
      await db.update(schema.attendance)
        .set(validatedData)
        .where(eq(schema.attendance.id, parseInt(id)));
      
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
  app.get('/api/teachers', async (req, res) => {
    try {
      const { subject, status, search } = req.query;
      
      let query = db.select().from(schema.teachers);
      
      if (subject) {
        query = query.where(eq(schema.teachers.subject, subject as string));
      }
      
      if (status) {
        query = query.where(eq(schema.teachers.status, status as string));
      }
      
      if (search) {
        const searchPattern = `%${search}%`;
        query = query.where(
          sql`${schema.teachers.name} ILIKE ${searchPattern} OR ${schema.teachers.teacherId} ILIKE ${searchPattern}`
        );
      }
      
      const teachers = await query;
      return res.json(teachers);
    } catch (error) {
      return handleError(error, res, 'fetching teachers');
    }
  });

  app.get('/api/teachers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const teacherId = parseInt(id);
      
      if (isNaN(teacherId)) {
        return res.status(400).json({ error: 'Invalid teacher ID' });
      }
      
      const teacher = await db.query.teachers.findFirst({
        where: eq(schema.teachers.id, teacherId)
      });
      
      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }
      
      return res.json(teacher);
    } catch (error) {
      return handleError(error, res, 'fetching teacher');
    }
  });

  app.post('/api/teachers', async (req, res) => {
    try {
      const validatedData = schema.teacherInsertSchema.parse(req.body);
      
      const [newTeacher] = await db.insert(schema.teachers)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newTeacher);
    } catch (error) {
      return handleError(error, res, 'creating teacher');
    }
  });

  app.put('/api/teachers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const teacherId = parseInt(id);
      
      if (isNaN(teacherId)) {
        return res.status(400).json({ error: 'Invalid teacher ID' });
      }
      
      const teacher = await db.query.teachers.findFirst({
        where: eq(schema.teachers.id, teacherId)
      });
      
      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }
      
      const validatedData = schema.teacherInsertSchema.partial().parse(req.body);
      
      await db.update(schema.teachers)
        .set(validatedData)
        .where(eq(schema.teachers.id, teacherId));
      
      const updatedTeacher = await db.query.teachers.findFirst({
        where: eq(schema.teachers.id, teacherId)
      });
      
      return res.json(updatedTeacher);
    } catch (error) {
      return handleError(error, res, 'updating teacher');
    }
  });

  app.delete('/api/teachers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const teacherId = parseInt(id);
      
      if (isNaN(teacherId)) {
        return res.status(400).json({ error: 'Invalid teacher ID' });
      }
      
      console.log(`Attempting to delete teacher with ID: ${teacherId}`);
      
      // Check if teacher exists
      const teacher = await db.query.teachers.findFirst({
        where: eq(schema.teachers.id, teacherId)
      });
      
      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }
      
      console.log(`Found teacher: ${teacher.name}, proceeding with deletion`);
      
      // Delete the teacher
      const deleteResult = await db.delete(schema.teachers)
        .where(eq(schema.teachers.id, teacherId));
      
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
  app.get('/api/staff', async (req, res) => {
    try {
      const staff = await db.query.staff.findMany({
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

  app.get('/api/staff/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const staffMember = await db.query.staff.findFirst({
        where: eq(schema.staff.id, parseInt(id))
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

  app.post('/api/staff', async (req, res) => {
    try {
      const staffData = req.body;
      
      // Generate staff ID if not provided
      if (!staffData.staffId) {
        const timestamp = Date.now().toString().slice(-6);
        staffData.staffId = `STF-${timestamp}`;
      }
      
      // Validate using schema but make staffId optional since we generate it
      const validatedData = schema.staffInsertSchema.omit({ staffId: true }).parse(staffData);
      const finalData = { ...validatedData, staffId: staffData.staffId };
      
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

  app.patch('/api/staff/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const staffId = parseInt(id);
      const updateData = req.body;
      
      if (isNaN(staffId)) {
        return res.status(400).json({ error: 'Invalid staff ID' });
      }
      
      const updatedStaff = await db.update(schema.staff)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(schema.staff.id, staffId))
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

  app.delete('/api/staff/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const staffId = parseInt(id);
      
      if (isNaN(staffId)) {
        return res.status(400).json({ error: 'Invalid staff ID' });
      }
      
      // Check if staff member exists
      const staffMember = await db.query.staff.findFirst({
        where: eq(schema.staff.id, staffId)
      });
      
      if (!staffMember) {
        return res.status(404).json({ error: 'Staff member not found' });
      }
      
      // Delete the staff member
      await db.delete(schema.staff)
        .where(eq(schema.staff.id, staffId));
      
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
  app.get('/api/parents', async (req, res) => {
    try {
      const parents = await db.select().from(schema.parents).orderBy(schema.parents.name);
      return res.json(parents);
    } catch (error) {
      return handleError(error, res, 'fetching parents');
    }
  });

  app.get('/api/parents/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const parent = await db.select().from(schema.parents)
        .where(eq(schema.parents.id, parseInt(id)))
        .limit(1);
      
      if (!parent || parent.length === 0) {
        return res.status(404).json({ error: 'Parent not found' });
      }
      
      return res.json(parent[0]);
    } catch (error) {
      return handleError(error, res, 'fetching parent');
    }
  });

  app.post('/api/parents', async (req, res) => {
    try {
      const validatedData = schema.parentInsertSchema.parse(req.body);
      
      const [newParent] = await db.insert(schema.parents)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newParent);
    } catch (error) {
      return handleError(error, res, 'creating parent');
    }
  });

  app.patch('/api/parents/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const parent = await db.query.parents.findFirst({
        where: eq(schema.parents.id, parseInt(id))
      });
      
      if (!parent) {
        return res.status(404).json({ error: 'Parent not found' });
      }
      
      const validatedData = schema.parentInsertSchema.partial().parse(req.body);
      
      await db.update(schema.parents)
        .set(validatedData)
        .where(eq(schema.parents.id, parseInt(id)));
      
      const updatedParent = await db.query.parents.findFirst({
        where: eq(schema.parents.id, parseInt(id))
      });
      
      return res.json(updatedParent);
    } catch (error) {
      return handleError(error, res, 'updating parent');
    }
  });

  app.delete('/api/parents/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if parent exists
      const parent = await db.query.parents.findFirst({
        where: eq(schema.parents.id, parseInt(id))
      });
      
      if (!parent) {
        return res.status(404).json({ error: 'Parent not found' });
      }
      
      // Delete the parent
      await db.delete(schema.parents)
        .where(eq(schema.parents.id, parseInt(id)));
      
      return res.json({ message: 'Parent deleted successfully' });
    } catch (error) {
      return handleError(error, res, 'deleting parent');
    }
  });

  // CLASS MANAGEMENT
  // =================================================================
  
  // Classes
  app.get('/api/classes', async (req, res) => {
    try {
      const classes = await db.query.classes.findMany({
        with: {
          teacher: true
        }
      });
      return res.json(classes);
    } catch (error) {
      return handleError(error, res, 'fetching classes');
    }
  });

  app.get('/api/classes/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const classData = await db.query.classes.findFirst({
        where: eq(schema.classes.id, parseInt(id)),
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

  app.post('/api/classes', async (req, res) => {
    try {
      const validatedData = schema.classInsertSchema.parse(req.body);
      
      const [newClass] = await db.insert(schema.classes)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newClass);
    } catch (error) {
      return handleError(error, res, 'creating class');
    }
  });

  // Class Routines (Periods)
  app.get('/api/periods', async (req, res) => {
    try {
      const { classId, dayOfWeek } = req.query;
      
      let query = db.select().from(schema.periods);
      
      if (classId) {
        query = query.where(eq(schema.periods.classId, parseInt(classId as string)));
      }
      
      if (dayOfWeek) {
        query = query.where(eq(schema.periods.dayOfWeek, dayOfWeek as string));
      }
      
      const periods = await query;
      return res.json(periods);
    } catch (error) {
      return handleError(error, res, 'fetching periods');
    }
  });

  app.post('/api/periods', async (req, res) => {
    try {
      const validatedData = schema.periodInsertSchema.parse(req.body);
      
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
  app.get('/api/academic-years', async (req, res) => {
    try {
      const academicYears = await db.query.academicYears.findMany({
        orderBy: desc(schema.academicYears.startDate)
      });
      return res.json(academicYears);
    } catch (error) {
      return handleError(error, res, 'fetching academic years');
    }
  });

  app.post('/api/academic-years', async (req, res) => {
    try {
      const validatedData = schema.academicYearInsertSchema.parse(req.body);
      
      // If setting this as current, unset any existing current years
      if (validatedData.isCurrent) {
        await db.update(schema.academicYears)
          .set({ isCurrent: false })
          .where(eq(schema.academicYears.isCurrent, true));
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
  app.get('/api/exams', async (req, res) => {
    try {
      const { academicYearId } = req.query;
      
      let query = db.query.exams.findMany({
        with: {
          academicYear: true
        },
        orderBy: desc(schema.exams.startDate)
      });
      
      if (academicYearId) {
        query = db.query.exams.findMany({
          where: eq(schema.exams.academicYearId, parseInt(academicYearId as string)),
          with: {
            academicYear: true
          },
          orderBy: desc(schema.exams.startDate)
        });
      }
      
      const exams = await query;
      return res.json(exams);
    } catch (error) {
      return handleError(error, res, 'fetching exams');
    }
  });

  app.get('/api/exams/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const exam = await db.query.exams.findFirst({
        where: eq(schema.exams.id, parseInt(id)),
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

  app.post('/api/exams', async (req, res) => {
    try {
      const validatedData = schema.examInsertSchema.parse(req.body);
      
      const [newExam] = await db.insert(schema.exams)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newExam);
    } catch (error) {
      return handleError(error, res, 'creating exam');
    }
  });

  // Exam Schedules
  app.get('/api/exam-schedules', async (req, res) => {
    try {
      const { examId, classId } = req.query;
      
      let query = db.select().from(schema.examSchedules);
      
      if (examId) {
        query = query.where(eq(schema.examSchedules.examId, parseInt(examId as string)));
      }
      
      if (classId) {
        query = query.where(eq(schema.examSchedules.classId, parseInt(classId as string)));
      }
      
      const schedules = await query;
      return res.json(schedules);
    } catch (error) {
      return handleError(error, res, 'fetching exam schedules');
    }
  });

  app.post('/api/exam-schedules', async (req, res) => {
    try {
      const validatedData = schema.examScheduleInsertSchema.parse(req.body);
      
      const [newSchedule] = await db.insert(schema.examSchedules)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newSchedule);
    } catch (error) {
      return handleError(error, res, 'creating exam schedule');
    }
  });

  // Exam Results
  app.get('/api/exam-results', async (req, res) => {
    try {
      const { examId, studentId } = req.query;
      
      let query = db.select().from(schema.examResults);
      
      if (examId) {
        query = query.where(eq(schema.examResults.examId, parseInt(examId as string)));
      }
      
      if (studentId) {
        query = query.where(eq(schema.examResults.studentId, parseInt(studentId as string)));
      }
      
      const results = await query;
      return res.json(results);
    } catch (error) {
      return handleError(error, res, 'fetching exam results');
    }
  });

  app.post('/api/exam-results', async (req, res) => {
    try {
      const records = req.body;
      
      if (!Array.isArray(records)) {
        return res.status(400).json({ error: 'Expected an array of exam results' });
      }
      
      const validatedRecords = records.map(record => 
        schema.examResultInsertSchema.parse(record)
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
  app.get('/api/books', async (req, res) => {
    try {
      const { category, search } = req.query;
      
      let query = db.select().from(schema.books);
      
      if (category) {
        query = query.where(eq(schema.books.category, category as string));
      }
      
      if (search) {
        const searchPattern = `%${search}%`;
        query = query.where(
          sql`${schema.books.title} ILIKE ${searchPattern} OR ${schema.books.author} ILIKE ${searchPattern} OR ${schema.books.isbn} ILIKE ${searchPattern}`
        );
      }
      
      const books = await query;
      return res.json(books);
    } catch (error) {
      return handleError(error, res, 'fetching books');
    }
  });

  app.get('/api/books/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, parseInt(id))
      });
      
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }
      
      return res.json(book);
    } catch (error) {
      return handleError(error, res, 'fetching book');
    }
  });

  app.post('/api/books', async (req, res) => {
    try {
      const validatedData = schema.bookInsertSchema.parse(req.body);
      
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
  app.get('/api/book-issues', async (req, res) => {
    try {
      const { status, studentId, bookId } = req.query;
      
      let query = db.select().from(schema.bookIssues);
      
      if (status) {
        query = query.where(eq(schema.bookIssues.status, status as string));
      }
      
      if (studentId) {
        query = query.where(eq(schema.bookIssues.studentId, parseInt(studentId as string)));
      }
      
      if (bookId) {
        query = query.where(eq(schema.bookIssues.bookId, parseInt(bookId as string)));
      }
      
      const bookIssues = await query;
      return res.json(bookIssues);
    } catch (error) {
      return handleError(error, res, 'fetching book issues');
    }
  });

  app.post('/api/book-issues', async (req, res) => {
    try {
      const validatedData = schema.bookIssueInsertSchema.parse(req.body);
      
      // Check if book is available
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, validatedData.bookId)
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
        .where(eq(schema.books.id, validatedData.bookId));
      
      return res.status(201).json(newIssue);
    } catch (error) {
      return handleError(error, res, 'creating book issue');
    }
  });

  app.put('/api/book-issues/:id/return', async (req, res) => {
    try {
      const { id } = req.params;
      const { returnDate, fine } = req.body;
      
      const issue = await db.query.bookIssues.findFirst({
        where: eq(schema.bookIssues.id, parseInt(id))
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
        .where(eq(schema.bookIssues.id, parseInt(id)));
      
      // Update book available copies
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, issue.bookId)
      });
      
      if (book) {
        await db.update(schema.books)
          .set({
            availableCopies: book.availableCopies + 1
          })
          .where(eq(schema.books.id, issue.bookId));
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
  app.get('/api/inventory-categories', async (req, res) => {
    try {
      const categories = await db.query.inventoryCategories.findMany();
      return res.json(categories);
    } catch (error) {
      return handleError(error, res, 'fetching inventory categories');
    }
  });

  app.post('/api/inventory-categories', async (req, res) => {
    try {
      const validatedData = schema.inventoryCategoryInsertSchema.parse(req.body);
      
      const [newCategory] = await db.insert(schema.inventoryCategories)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newCategory);
    } catch (error) {
      return handleError(error, res, 'creating inventory category');
    }
  });

  // Inventory Items
  app.get('/api/inventory-items', async (req, res) => {
    try {
      const { categoryId, search } = req.query;
      
      let query = db.query.inventoryItems.findMany({
        with: {
          category: true
        }
      });
      
      if (categoryId) {
        query = db.query.inventoryItems.findMany({
          where: eq(schema.inventoryItems.categoryId, parseInt(categoryId as string)),
          with: {
            category: true
          }
        });
      }
      
      if (search) {
        const searchPattern = `%${search}%`;
        query = db.query.inventoryItems.findMany({
          where: sql`${schema.inventoryItems.name} ILIKE ${searchPattern}`,
          with: {
            category: true
          }
        });
      }
      
      const items = await query;
      return res.json(items);
    } catch (error) {
      return handleError(error, res, 'fetching inventory items');
    }
  });

  app.post('/api/inventory-items', async (req, res) => {
    try {
      const validatedData = schema.inventoryItemInsertSchema.parse(req.body);
      
      const [newItem] = await db.insert(schema.inventoryItems)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newItem);
    } catch (error) {
      return handleError(error, res, 'creating inventory item');
    }
  });

  app.put('/api/inventory-items/:id/quantity', async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity, operation = 'set' } = req.body;
      
      if (typeof quantity !== 'number' || quantity < 0) {
        return res.status(400).json({ error: 'Invalid quantity value' });
      }
      
      const item = await db.query.inventoryItems.findFirst({
        where: eq(schema.inventoryItems.id, parseInt(id))
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
        .where(eq(schema.inventoryItems.id, parseInt(id)));
      
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
  app.get('/api/vehicles', async (req, res) => {
    try {
      const { status, type } = req.query;
      
      let query = db.select().from(schema.vehicles);
      
      if (status) {
        query = query.where(eq(schema.vehicles.status, status as string));
      }
      
      if (type) {
        query = query.where(eq(schema.vehicles.type, type as string));
      }
      
      const vehicles = await query;
      return res.json(vehicles);
    } catch (error) {
      return handleError(error, res, 'fetching vehicles');
    }
  });

  app.post('/api/vehicles', async (req, res) => {
    try {
      const validatedData = schema.vehicleInsertSchema.parse(req.body);
      
      const [newVehicle] = await db.insert(schema.vehicles)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newVehicle);
    } catch (error) {
      return handleError(error, res, 'creating vehicle');
    }
  });

  // Transport Routes
  app.get('/api/transport-routes', async (req, res) => {
    try {
      const { vehicleId } = req.query;
      
      let query = db.query.transportRoutes.findMany({
        with: {
          vehicle: true
        }
      });
      
      if (vehicleId) {
        query = db.query.transportRoutes.findMany({
          where: eq(schema.transportRoutes.vehicleId, parseInt(vehicleId as string)),
          with: {
            vehicle: true
          }
        });
      }
      
      const routes = await query;
      return res.json(routes);
    } catch (error) {
      return handleError(error, res, 'fetching transport routes');
    }
  });

  app.post('/api/transport-routes', async (req, res) => {
    try {
      const validatedData = schema.transportRouteInsertSchema.parse(req.body);
      
      const [newRoute] = await db.insert(schema.transportRoutes)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newRoute);
    } catch (error) {
      return handleError(error, res, 'creating transport route');
    }
  });

  // Transport Assignments
  app.get('/api/transport-assignments', async (req, res) => {
    try {
      const { routeId, studentId, status } = req.query;
      
      let query = db.query.transportAssignments.findMany({
        with: {
          student: true,
          route: {
            with: {
              vehicle: true
            }
          }
        }
      });
      
      if (routeId) {
        query = db.query.transportAssignments.findMany({
          where: eq(schema.transportAssignments.routeId, parseInt(routeId as string)),
          with: {
            student: true,
            route: {
              with: {
                vehicle: true
              }
            }
          }
        });
      }
      
      if (studentId) {
        query = db.query.transportAssignments.findMany({
          where: eq(schema.transportAssignments.studentId, parseInt(studentId as string)),
          with: {
            student: true,
            route: {
              with: {
                vehicle: true
              }
            }
          }
        });
      }
      
      if (status) {
        query = db.query.transportAssignments.findMany({
          where: eq(schema.transportAssignments.status, status as string),
          with: {
            student: true,
            route: {
              with: {
                vehicle: true
              }
            }
          }
        });
      }
      
      const assignments = await query;
      return res.json(assignments);
    } catch (error) {
      return handleError(error, res, 'fetching transport assignments');
    }
  });

  app.post('/api/transport-assignments', async (req, res) => {
    try {
      const validatedData = schema.transportAssignmentInsertSchema.parse(req.body);
      
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
  
  app.get('/api/events', async (req, res) => {
    try {
      const { startDate, endDate, eventType } = req.query;
      
      let query = db.select().from(schema.events);
      
      if (startDate && endDate) {
        query = query.where(
          and(
            sql`${schema.events.startDate} >= ${startDate}`,
            sql`${schema.events.startDate} <= ${endDate}`
          )
        );
      }
      
      if (eventType) {
        query = query.where(eq(schema.events.eventType, eventType as string));
      }
      
      const events = await query.orderBy(asc(schema.events.startDate));
      return res.json(events);
    } catch (error) {
      return handleError(error, res, 'fetching events');
    }
  });

  app.post('/api/events', async (req, res) => {
    try {
      const validatedData = schema.eventInsertSchema.parse(req.body);
      
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
  
  app.get('/api/notifications', async (req, res) => {
    try {
      const { userId, read } = req.query;
      
      let query = db.select().from(schema.notifications);
      
      if (userId) {
        query = query.where(
          or(
            eq(schema.notifications.targetUserId, parseInt(userId as string)),
            isNull(schema.notifications.targetUserId)
          )
        );
      }
      
      if (read !== undefined) {
        query = query.where(eq(schema.notifications.read, read === 'true'));
      }
      
      const notifications = await query.orderBy(desc(schema.notifications.createdAt));
      return res.json(notifications);
    } catch (error) {
      return handleError(error, res, 'fetching notifications');
    }
  });

  app.post('/api/notifications', async (req, res) => {
    try {
      const validatedData = schema.notificationInsertSchema.parse(req.body);
      
      const [newNotification] = await db.insert(schema.notifications)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newNotification);
    } catch (error) {
      return handleError(error, res, 'creating notification');
    }
  });

  app.put('/api/notifications/:id/read', async (req, res) => {
    try {
      const { id } = req.params;
      
      const notification = await db.query.notifications.findFirst({
        where: eq(schema.notifications.id, parseInt(id))
      });
      
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      await db.update(schema.notifications)
        .set({
          read: true
        })
        .where(eq(schema.notifications.id, parseInt(id)));
      
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
  
  app.get('/api/financial-transactions', async (req, res) => {
    try {
      const { transactionType, category, startDate, endDate } = req.query;
      
      let query = db.select().from(schema.financialTransactions);
      
      if (transactionType) {
        query = query.where(eq(schema.financialTransactions.transactionType, transactionType as string));
      }
      
      if (category) {
        query = query.where(eq(schema.financialTransactions.category, category as string));
      }
      
      if (startDate && endDate) {
        query = query.where(
          and(
            sql`${schema.financialTransactions.date} >= ${startDate}`,
            sql`${schema.financialTransactions.date} <= ${endDate}`
          )
        );
      }
      
      const transactions = await query.orderBy(desc(schema.financialTransactions.date));
      return res.json(transactions);
    } catch (error) {
      return handleError(error, res, 'fetching financial transactions');
    }
  });

  app.post('/api/financial-transactions', async (req, res) => {
    try {
      const validatedData = schema.financialTransactionInsertSchema.parse(req.body);
      
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
  
  app.get('/api/templates', async (req, res) => {
    try {
      const { type, isDefault } = req.query;
      
      let query = db.select().from(schema.templates);
      
      if (type) {
        query = query.where(eq(schema.templates.type, type as string));
      }
      
      if (isDefault !== undefined) {
        query = query.where(eq(schema.templates.isDefault, isDefault === 'true'));
      }
      
      const templates = await query;
      return res.json(templates);
    } catch (error) {
      return handleError(error, res, 'fetching templates');
    }
  });

  app.get('/api/templates/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const template = await db.query.templates.findFirst({
        where: eq(schema.templates.id, parseInt(id))
      });
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      return res.json(template);
    } catch (error) {
      return handleError(error, res, 'fetching template');
    }
  });

  app.post('/api/templates', async (req, res) => {
    try {
      const validatedData = schema.templateInsertSchema.parse(req.body);
      
      // If setting as default, unset any existing default templates of the same type
      if (validatedData.isDefault) {
        await db.update(schema.templates)
          .set({ isDefault: false })
          .where(
            and(
              eq(schema.templates.type, validatedData.type),
              eq(schema.templates.isDefault, true)
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

  app.put('/api/templates/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const template = await db.query.templates.findFirst({
        where: eq(schema.templates.id, parseInt(id))
      });
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      const validatedData = schema.templateInsertSchema.partial().parse(req.body);
      
      // If setting as default, unset any existing default templates of the same type
      if (validatedData.isDefault) {
        await db.update(schema.templates)
          .set({ isDefault: false })
          .where(
            and(
              eq(schema.templates.type, template.type),
              eq(schema.templates.isDefault, true),
              not(eq(schema.templates.id, parseInt(id)))
            )
          );
      }
      
      await db.update(schema.templates)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(schema.templates.id, parseInt(id)));
      
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
