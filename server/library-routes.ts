import { Express, Request, Response } from "express";
import { db } from "./db";
import { eq, sql, count, sum, lt, and, desc } from "drizzle-orm";
import { libraryBooks, libraryBorrowedBooks } from "../shared/schema";
import { schoolIsolation } from "./security-middleware";

// Helper to get schoolId from request (set by school isolation middleware)
const getSchoolId = (req: Request): number | null => {
  return (req as any).userSchoolId || null;
};

export function registerLibraryRoutes(app: Express) {
  // Apply school isolation middleware to all library routes
  app.use('/api/library', schoolIsolation);

  // Get library statistics
  app.get("/api/library/stats", async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req);
      if (!schoolId) {
        return res.status(403).json({ error: 'School access required' });
      }

      // Get real stats filtered by school_id
      const [totalBooksResult, borrowedBooksResult] = await Promise.all([
        db.select({ count: count() })
          .from(libraryBooks)
          .where(eq(libraryBooks.schoolId, schoolId)),
        db.select({ count: count() })
          .from(libraryBorrowedBooks)
          .where(and(
            eq(libraryBorrowedBooks.schoolId, schoolId),
            eq(libraryBorrowedBooks.status, 'active')
          ))
      ]);

      const totalBooks = totalBooksResult[0]?.count || 0;
      const borrowedBooks = borrowedBooksResult[0]?.count || 0;

      res.json({
        totalBooks,
        availableBooks: totalBooks - borrowedBooks,
        borrowedBooks,
        activeBorrowers: borrowedBooks, // Simplified
        overdueBooks: 0, // TODO: Calculate based on due_date
        overdueBorrowers: 0,
        popularBooks: 0
      });
    } catch (error) {
      console.error('Library stats error:', error);
      res.status(500).json({ error: 'Failed to fetch library statistics' });
    }
  });

  // Get all books (filtered by school)
  app.get("/api/library/books", async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req);
      if (!schoolId) {
        return res.status(403).json({ error: 'School access required' });
      }

      const books = await db.select()
        .from(libraryBooks)
        .where(eq(libraryBooks.schoolId, schoolId))
        .orderBy(desc(libraryBooks.createdAt));

      const formattedBooks = books.map(book => ({
        id: book.id,
        title: book.title,
        titleBn: book.titleBn,
        author: book.author,
        isbn: book.isbn,
        category: book.category,
        publisher: book.publisher,
        publishYear: book.publishYear,
        totalCopies: book.totalCopies,
        availableCopies: book.availableCopies,
        location: book.location,
        description: book.description
      }));

      res.json(formattedBooks);
    } catch (error) {
      console.error('Error fetching books:', error);
      res.status(500).json({ error: 'Failed to fetch books' });
    }
  });

  // Get borrowed books (filtered by school)
  app.get("/api/library/borrowed", async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req);
      if (!schoolId) {
        return res.status(403).json({ error: 'School access required' });
      }

      const borrowedBooks = await db.select()
        .from(libraryBorrowedBooks)
        .where(eq(libraryBorrowedBooks.schoolId, schoolId))
        .orderBy(desc(libraryBorrowedBooks.borrowDate));

      res.json(borrowedBooks);
    } catch (error) {
      console.error('Error fetching borrowed books:', error);
      res.status(500).json({ error: 'Failed to fetch borrowed books' });
    }
  });

  // Add a new book (with school isolation)
  app.post("/api/library/books", async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req);
      if (!schoolId) {
        return res.status(403).json({ error: 'School access required' });
      }

      const {
        title,
        titleBn,
        author,
        isbn,
        category,
        publisher,
        publishYear,
        totalCopies,
        location,
        description
      } = req.body;

      const newBook = await db.insert(libraryBooks).values({
        schoolId,  // Use authenticated school ID - NO FALLBACK
        title,
        titleBn,
        author,
        isbn,
        category,
        publisher,
        publishYear,
        totalCopies,
        availableCopies: totalCopies,
        location,
        description
      }).returning();

      res.json(newBook[0]);
    } catch (error) {
      console.error('Error adding book:', error);
      res.status(500).json({ error: 'Failed to add book' });
    }
  });

  // Borrow a book (with school isolation)
  app.post("/api/library/borrow", async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req);
      if (!schoolId) {
        return res.status(403).json({ error: 'School access required' });
      }

      const { bookId, studentId, dueDate } = req.body;

      // Check if book exists in THIS school and is available
      const book = await db.select()
        .from(libraryBooks)
        .where(and(
          eq(libraryBooks.id, bookId),
          eq(libraryBooks.schoolId, schoolId)  // Security: Ensure book belongs to this school
        ));
      
      if (!book[0]) {
        return res.status(404).json({ error: 'Book not found in your school' });
      }

      if (book[0].availableCopies <= 0) {
        return res.status(400).json({ error: 'Book not available' });
      }

      // Create borrow record with school_id
      const borrowRecord = await db.insert(libraryBorrowedBooks).values({
        bookId,
        studentId,
        schoolId,  // Associate with school
        borrowDate: new Date().toISOString().split('T')[0],
        dueDate,
        status: 'active'
      }).returning();

      // Update available copies
      await db.update(libraryBooks)
        .set({ availableCopies: book[0].availableCopies - 1 })
        .where(and(
          eq(libraryBooks.id, bookId),
          eq(libraryBooks.schoolId, schoolId)  // Security check
        ));

      res.json(borrowRecord[0]);
    } catch (error) {
      console.error('Error borrowing book:', error);
      res.status(500).json({ error: 'Failed to borrow book' });
    }
  });

  // Return a book (with school isolation)
  app.post("/api/library/return", async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req);
      if (!schoolId) {
        return res.status(403).json({ error: 'School access required' });
      }

      const { borrowId } = req.body;

      // Get borrow record (only from this school)
      const borrowRecord = await db.select()
        .from(libraryBorrowedBooks)
        .where(and(
          eq(libraryBorrowedBooks.id, borrowId),
          eq(libraryBorrowedBooks.schoolId, schoolId)  // Security: School isolation
        ));

      if (!borrowRecord[0]) {
        return res.status(404).json({ error: 'Borrow record not found in your school' });
      }

      // Update borrow status
      await db.update(libraryBorrowedBooks)
        .set({ 
          status: 'returned',
          returnDate: new Date().toISOString().split('T')[0]
        })
        .where(and(
          eq(libraryBorrowedBooks.id, borrowId),
          eq(libraryBorrowedBooks.schoolId, schoolId)  // Security check
        ));

      // Update available copies
      const book = await db.select()
        .from(libraryBooks)
        .where(and(
          eq(libraryBooks.id, borrowRecord[0].bookId),
          eq(libraryBooks.schoolId, schoolId)  // Security check
        ));

      if (book[0]) {
        await db.update(libraryBooks)
          .set({ availableCopies: book[0].availableCopies + 1 })
          .where(and(
            eq(libraryBooks.id, borrowRecord[0].bookId),
            eq(libraryBooks.schoolId, schoolId)  // Security check
          ));
      }

      res.json({ message: 'Book returned successfully' });
    } catch (error) {
      console.error('Error returning book:', error);
      res.status(500).json({ error: 'Failed to return book' });
    }
  });

  // Update a book (with school isolation)
  app.patch("/api/library/books/:id", async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req);
      if (!schoolId) {
        return res.status(403).json({ error: 'School access required' });
      }

      const bookId = parseInt(req.params.id);
      const updates = req.body;

      const updatedBook = await db.update(libraryBooks)
        .set(updates)
        .where(and(
          eq(libraryBooks.id, bookId),
          eq(libraryBooks.schoolId, schoolId)  // Security: Only update books from this school
        ))
        .returning();

      if (!updatedBook[0]) {
        return res.status(404).json({ error: 'Book not found in your school' });
      }

      res.json(updatedBook[0]);
    } catch (error) {
      console.error('Error updating book:', error);
      res.status(500).json({ error: 'Failed to update book' });
    }
  });

  // Delete a book (with school isolation)
  app.delete("/api/library/books/:id", async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req);
      if (!schoolId) {
        return res.status(403).json({ error: 'School access required' });
      }

      const bookId = parseInt(req.params.id);

      // Check if book is currently borrowed (only in this school)
      const borrowedCount = await db.select({ count: count() })
        .from(libraryBorrowedBooks)
        .where(and(
          eq(libraryBorrowedBooks.bookId, bookId),
          eq(libraryBorrowedBooks.schoolId, schoolId),  // Security check
          eq(libraryBorrowedBooks.status, 'active')
        ));

      if (borrowedCount[0]?.count > 0) {
        return res.status(400).json({ error: 'Cannot delete book that is currently borrowed' });
      }

      await db.delete(libraryBooks)
        .where(and(
          eq(libraryBooks.id, bookId),
          eq(libraryBooks.schoolId, schoolId)  // Security: Only delete books from this school
        ));

      res.json({ message: 'Book deleted successfully' });
    } catch (error) {
      console.error('Error deleting book:', error);
      res.status(500).json({ error: 'Failed to delete book' });
    }
  });
}
