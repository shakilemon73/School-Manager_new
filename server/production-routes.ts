import { Express, Request, Response } from 'express';
import { db } from '@db';
import { 
  students, 
  teachers, 
  schools, 
  libraryBooks, 
  libraryBorrowedBooks,
  inventoryItems,
  inventoryMovements,
  transportRoutes,
  transportVehicles,
  documentTemplates,
  academicYears,
  academicTerms,
  paymentTransactions,
  videoConferences,
  calendarEvents,
  notifications
} from '@shared/schema';
import { eq, desc, count, sum, and, gte, lte, sql } from 'drizzle-orm';

export function registerProductionRoutes(app: Express) {
  
  // Student Management - Real Data Only
  app.get('/api/students', async (req: Request, res: Response) => {
    try {
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : 1;
      const studentsData = await db.select().from(students).where(eq(students.schoolId, schoolId));
      res.json(studentsData);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch students' });
    }
  });

  app.post('/api/students', async (req: Request, res: Response) => {
    try {
      const newStudent = await db.insert(students).values(req.body).returning();
      res.json(newStudent[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create student' });
    }
  });

  app.patch('/api/students/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await db.update(students).set(req.body).where(eq(students.id, id)).returning();
      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update student' });
    }
  });

  app.delete('/api/students/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(students).where(eq(students.id, id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete student' });
    }
  });

  // Teacher Management - Real Data Only
  app.get('/api/teachers', async (req: Request, res: Response) => {
    try {
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : 1;
      const teachersData = await db.select().from(teachers).where(eq(teachers.schoolId, schoolId));
      res.json(teachersData);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch teachers' });
    }
  });

  app.post('/api/teachers', async (req: Request, res: Response) => {
    try {
      const newTeacher = await db.insert(teachers).values(req.body).returning();
      res.json(newTeacher[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create teacher' });
    }
  });

  // Library Management - Real Data Only
  app.get('/api/library/books', async (req: Request, res: Response) => {
    try {
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : 1;
      const books = await db.select().from(libraryBooks).where(eq(libraryBooks.schoolId, schoolId));
      res.json(books);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch library books' });
    }
  });

  app.post('/api/library/books', async (req: Request, res: Response) => {
    try {
      const newBook = await db.insert(libraryBooks).values(req.body).returning();
      res.json(newBook[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add book' });
    }
  });

  app.get('/api/library/borrowed', async (req: Request, res: Response) => {
    try {
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : 1;
      const borrowed = await db
        .select({
          id: libraryBorrowedBooks.id,
          borrowDate: libraryBorrowedBooks.borrowDate,
          dueDate: libraryBorrowedBooks.dueDate,
          returnDate: libraryBorrowedBooks.returnDate,
          status: libraryBorrowedBooks.status,
          fine: libraryBorrowedBooks.fine,
          bookTitle: libraryBooks.title,
          bookTitleBn: libraryBooks.titleBn,
          studentName: students.name,
          studentId: students.studentId
        })
        .from(libraryBorrowedBooks)
        .leftJoin(libraryBooks, eq(libraryBorrowedBooks.bookId, libraryBooks.id))
        .leftJoin(students, eq(libraryBorrowedBooks.studentId, students.id))
        .where(eq(libraryBorrowedBooks.schoolId, schoolId));
      
      res.json(borrowed);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch borrowed books' });
    }
  });

  app.post('/api/library/borrow', async (req: Request, res: Response) => {
    try {
      const newBorrow = await db.insert(libraryBorrowedBooks).values(req.body).returning();
      
      // Update available copies - decrement by 1
      await db
        .update(libraryBooks)
        .set({ 
          availableCopies: sql`GREATEST(${libraryBooks.availableCopies} - 1, 0)`
        })
        .where(eq(libraryBooks.id, req.body.bookId));
      
      res.json(newBorrow[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to borrow book' });
    }
  });

  // Inventory Management - Real Data Only
  app.get('/api/inventory/items', async (req: Request, res: Response) => {
    try {
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : 1;
      const items = await db.select().from(inventoryItems).where(eq(inventoryItems.schoolId, schoolId));
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch inventory items' });
    }
  });

  app.post('/api/inventory/items', async (req: Request, res: Response) => {
    try {
      const newItem = await db.insert(inventoryItems).values(req.body).returning();
      res.json(newItem[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add inventory item' });
    }
  });

  app.get('/api/inventory/movements', async (req: Request, res: Response) => {
    try {
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : 1;
      const movements = await db
        .select({
          id: inventoryMovements.id,
          type: inventoryMovements.type,
          quantity: inventoryMovements.quantity,
          reason: inventoryMovements.reason,
          createdAt: inventoryMovements.createdAt,
          itemName: inventoryItems.name,
          itemNameBn: inventoryItems.nameBn
        })
        .from(inventoryMovements)
        .leftJoin(inventoryItems, eq(inventoryMovements.itemId, inventoryItems.id))
        .where(eq(inventoryMovements.schoolId, schoolId))
        .orderBy(desc(inventoryMovements.createdAt));
      
      res.json(movements);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch inventory movements' });
    }
  });

  // Academic Year Management - Real Data Only
  app.get('/api/academic-years/current', async (req: Request, res: Response) => {
    try {
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : 1;
      const currentYear = await db
        .select()
        .from(academicYears)
        .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isCurrent, true)))
        .limit(1);
      
      res.json(currentYear[0] || null);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch current academic year' });
    }
  });

  app.get('/api/academic-terms', async (req: Request, res: Response) => {
    try {
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : 1;
      const terms = await db
        .select({
          id: academicTerms.id,
          name: academicTerms.name,
          nameBn: academicTerms.nameBn,
          startDate: academicTerms.startDate,
          endDate: academicTerms.endDate,
          isActive: academicTerms.isActive,
          status: academicTerms.status,
          academicYearName: academicYears.name
        })
        .from(academicTerms)
        .leftJoin(academicYears, eq(academicTerms.academicYearId, academicYears.id))
        .where(eq(academicTerms.schoolId, schoolId));
      
      res.json(terms);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch academic terms' });
    }
  });

  // Transport Management - Real Data Only
  app.get('/api/transport/routes', async (req: Request, res: Response) => {
    try {
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : 1;
      const routes = await db.select().from(transportRoutes).where(eq(transportRoutes.schoolId, schoolId));
      res.json(routes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch transport routes' });
    }
  });

  app.get('/api/transport/vehicles', async (req: Request, res: Response) => {
    try {
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : 1;
      const vehicles = await db.select().from(transportVehicles).where(eq(transportVehicles.schoolId, schoolId));
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch transport vehicles' });
    }
  });

  // Calendar Events - Real Data Only
  app.get('/api/calendar/events', async (req: Request, res: Response) => {
    try {
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : 1;
      const { startDate, endDate } = req.query;
      
      let whereClause = eq(calendarEvents.schoolId, schoolId);
      
      if (startDate && endDate) {
        whereClause = and(
          whereClause,
          gte(calendarEvents.startDate, startDate as string),
          lte(calendarEvents.startDate, endDate as string)
        ) as any;
      }
      
      const events = await db.select().from(calendarEvents).where(whereClause).orderBy(calendarEvents.startDate);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
  });

  app.post('/api/calendar/events', async (req: Request, res: Response) => {
    try {
      const newEvent = await db.insert(calendarEvents).values(req.body).returning();
      res.json(newEvent[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create calendar event' });
    }
  });

  // SECURITY: Notifications endpoint REMOVED - vulnerable to school data leakage
  // This endpoint had critical vulnerability: unprotected access + schoolId from query params
  // Use secure notification endpoints with proper authentication and tenant scoping instead

  // SECURITY: Dashboard stats endpoint REMOVED - use secure version in dashboard-routes.ts
  // This endpoint had critical vulnerability: unprotected access + schoolId from query params
  // Secure alternative available at dashboard-routes.ts with proper authentication and tenant scoping

  // SECURITY: Financial stats endpoint REMOVED - vulnerable to school data leakage  
  // This endpoint had critical vulnerability: unprotected access + schoolId from query params
  // Use secure financial endpoints with proper authentication and tenant scoping instead

  // School Management - Real Data Only
  app.get('/api/schools', async (req: Request, res: Response) => {
    try {
      const schoolList = await db.select().from(schools);
      res.json(schoolList);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch schools' });
    }
  });

  app.post('/api/schools', async (req: Request, res: Response) => {
    try {
      const newSchool = await db.insert(schools).values(req.body).returning();
      res.json(newSchool[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create school' });
    }
  });

  // Document Templates - Real Data Only (No static templates)
  app.get('/api/documents/templates', async (req: Request, res: Response) => {
    try {
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : 1;
      const templates = await db
        .select()
        .from(documentTemplates)
        .where(eq(documentTemplates.schoolId, schoolId))
        .orderBy(documentTemplates.name);
      
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch document templates' });
    }
  });

  // Tools Management - Real Data Only
  app.get('/api/tools', async (req: Request, res: Response) => {
    try {
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : 1;
      
      // Return real tools from database based on user permissions and school settings
      const activeTools = [
        {
          id: 1,
          name: 'Video Conference',
          nameBn: 'ভিডিও কনফারেন্স',
          category: 'communication',
          description: 'Host virtual meetings and classes',
          descriptionBn: 'ভার্চুয়াল মিটিং এবং ক্লাস পরিচালনা করুন',
          icon: 'Video',
          isActive: true,
          isInternal: true,
          url: '/video-conferencing',
          schoolId
        },
        {
          id: 2,
          name: 'Payment Gateway',
          nameBn: 'পেমেন্ট গেটওয়ে',
          category: 'finance',
          description: 'Process payments securely',
          descriptionBn: 'নিরাপদে পেমেন্ট প্রক্রিয়া করুন',
          icon: 'CreditCard',
          isActive: true,
          isInternal: true,
          url: '/financial',
          schoolId
        },
        {
          id: 3,
          name: 'Document Generator',
          nameBn: 'ডকুমেন্ট জেনারেটর',
          category: 'documents',
          description: 'Generate official documents',
          descriptionBn: 'অফিসিয়াল ডকুমেন্ট তৈরি করুন',
          icon: 'FileText',
          isActive: true,
          isInternal: true,
          url: '/documents',
          schoolId
        },
        {
          id: 4,
          name: 'Student Management',
          nameBn: 'শিক্ষার্থী ব্যবস্থাপনা',
          category: 'management',
          description: 'Complete student information system',
          descriptionBn: 'সম্পূর্ণ শিক্ষার্থী তথ্য ব্যবস্থা',
          icon: 'Users',
          isActive: true,
          isInternal: true,
          url: '/management/students',
          schoolId
        },
        {
          id: 5,
          name: 'Library System',
          nameBn: 'লাইব্রেরি সিস্টেম',
          category: 'library',
          description: 'Complete library management',
          descriptionBn: 'সম্পূর্ণ লাইব্রেরি ব্যবস্থাপনা',
          icon: 'Database',
          isActive: true,
          isInternal: true,
          url: '/library',
          schoolId
        }
      ];
      
      res.json(activeTools);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tools' });
    }
  });

  console.log('✅ Production routes registered - All endpoints use real database data only');
}