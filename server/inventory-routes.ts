import { Express, Request, Response } from 'express';
import { db } from './db';
import { eq, and, desc, asc, gte, lte, sum, count, like, or, sql } from 'drizzle-orm';
import { inventoryItems, inventoryMovements, users } from '../shared/schema';
import { z } from 'zod';

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Enhanced item schema matching the database
const itemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nameInBangla: z.string().min(1, 'Bengali name is required'),
  category: z.string().min(1, 'Category is required'),
  brand: z.string().optional(),
  model: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  unitPrice: z.string().transform(val => parseFloat(val) || 0),
  quantity: z.string().transform(val => parseInt(val) || 0),
  minimumStock: z.string().transform(val => parseInt(val) || 0),
  location: z.string().optional(),
  supplier: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  status: z.enum(['available', 'low_stock', 'out_of_stock', 'damaged']).default('available'),
});

// Enhanced stock movement schema
const movementSchema = z.object({
  itemId: z.string().transform(val => parseInt(val)),
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.string().transform(val => parseInt(val) || 0),
  reason: z.string().min(1, 'Reason is required'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export function registerInventoryRoutes(app: Express) {
  
  // Get all inventory items with filters and search
  app.get('/api/inventory', requireAuth, async (req: Request, res: Response) => {
    try {
      const { search, category, status, page = '1', limit = '50' } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      let query = db.select().from(inventoryItems);
      let conditions = [];
      
      if (search) {
        conditions.push(
          or(
            like(inventoryItems.name, `%${search}%`),
            like(inventoryItems.nameBn, `%${search}%`),
            like(inventoryItems.brand, `%${search}%`)
          )
        );
      }
      
      if (category && category !== 'all') {
        conditions.push(eq(inventoryItems.category, category as string));
      }
      
      if (status && status !== 'all') {
        if (status === 'low_stock') {
          conditions.push(sql`${inventoryItems.currentQuantity} <= ${inventoryItems.minimumThreshold}`);
        } else if (status === 'out_of_stock') {
          conditions.push(eq(inventoryItems.currentQuantity, 0));
        } else {
          conditions.push(sql`${inventoryItems.currentQuantity} > ${inventoryItems.minimumThreshold}`);
        }
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const items = await query
        .orderBy(desc(inventoryItems.createdAt))
        .limit(parseInt(limit as string))
        .offset(offset);
        
      // Add computed status
      const itemsWithStatus = items.map(item => ({
        ...item,
        status: item.currentQuantity === 0 ? 'out_of_stock' : 
                item.currentQuantity <= item.minimumThreshold ? 'low_stock' : 'available'
      }));
      
      res.json(itemsWithStatus);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      res.status(500).json({ message: 'Failed to fetch inventory items' });
    }
  });

  // Get inventory statistics
  app.get('/api/inventory/stats', requireAuth, async (req: Request, res: Response) => {
    try {
      const [totalItems] = await db.select({ count: count() }).from(inventoryItems);
      const [lowStockItems] = await db.select({ count: count() })
        .from(inventoryItems)
        .where(sql`${inventoryItems.currentQuantity} <= ${inventoryItems.minimumThreshold} AND ${inventoryItems.currentQuantity} > 0`);
      const [outOfStockItems] = await db.select({ count: count() })
        .from(inventoryItems)
        .where(eq(inventoryItems.currentQuantity, 0));
      const [totalValue] = await db.select({ 
        total: sql<number>`COALESCE(SUM(${inventoryItems.unitPrice} * ${inventoryItems.currentQuantity}), 0)` 
      }).from(inventoryItems);
      
      res.json({
        totalItems: totalItems.count,
        lowStock: lowStockItems.count,
        outOfStock: outOfStockItems.count,
        totalValue: Math.round(totalValue.total || 0)
      });
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
      res.status(500).json({ message: 'Failed to fetch inventory statistics' });
    }
  });

  // Get stock movements with item details
  app.get('/api/inventory/movements', requireAuth, async (req: Request, res: Response) => {
    try {
      const { search, page = '1', limit = '50' } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      let query = db.select({
        id: inventoryMovements.id,
        type: inventoryMovements.type,
        quantity: inventoryMovements.quantity,
        reason: inventoryMovements.reason,
        reference: inventoryMovements.reference,
        notes: inventoryMovements.notes,
        createdAt: inventoryMovements.createdAt,
        item: {
          id: inventoryItems.id,
          name: inventoryItems.name,
          nameInBangla: inventoryItems.nameBn,
          unit: inventoryItems.unit
        }
      })
      .from(inventoryMovements)
      .leftJoin(inventoryItems, eq(inventoryMovements.itemId, inventoryItems.id));
      
      if (search) {
        query = query.where(
          or(
            like(inventoryItems.name, `%${search}%`),
            like(inventoryItems.nameBn, `%${search}%`),
            like(inventoryMovements.reason, `%${search}%`)
          )
        );
      }
      
      const movements = await query
        .orderBy(desc(inventoryMovements.createdAt))
        .limit(parseInt(limit as string))
        .offset(offset);
      
      res.json(movements);
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      res.status(500).json({ message: 'Failed to fetch stock movements' });
    }
  });

  // Create new inventory item
  app.post('/api/inventory', requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = itemSchema.parse(req.body);
      
      // Get school ID from authenticated user
      const schoolId = req.user?.user_metadata?.school_id || req.user?.school_id || 1;
      
      const [newItem] = await db.insert(inventoryItems).values({
        name: validatedData.name,
        nameBn: validatedData.nameInBangla,
        category: validatedData.category,
        brand: validatedData.brand,
        model: validatedData.model,
        description: validatedData.description,
        unit: validatedData.unit,
        unitPrice: validatedData.unitPrice.toString(),
        currentQuantity: validatedData.quantity,
        minimumThreshold: validatedData.minimumStock,
        location: validatedData.location || 'Main Store',
        condition: 'good',
        schoolId: schoolId
      }).returning();
      
      res.status(201).json(newItem);
    } catch (error) {
      console.error('Error creating inventory item:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create inventory item' });
    }
  });

  // Update inventory item
  app.patch('/api/inventory/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      const validatedData = itemSchema.parse(req.body);
      
      const [updatedItem] = await db.update(inventoryItems)
        .set({
          name: validatedData.name,
          nameBn: validatedData.nameInBangla,
          category: validatedData.category,
          brand: validatedData.brand,
          model: validatedData.model,
          description: validatedData.description,
          unit: validatedData.unit,
          unitPrice: validatedData.unitPrice.toString(),
          currentQuantity: validatedData.quantity,
          minimumThreshold: validatedData.minimumStock,
          location: validatedData.location || 'Main Store',
          updatedAt: new Date()
        })
        .where(eq(inventoryItems.id, itemId))
        .returning();
      
      if (!updatedItem) {
        return res.status(404).json({ message: 'Item not found' });
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error('Error updating inventory item:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update inventory item' });
    }
  });

  // Delete inventory item
  app.delete('/api/inventory/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      
      // Delete related movements first
      await db.delete(inventoryMovements).where(eq(inventoryMovements.itemId, itemId));
      
      // Delete the item
      const [deletedItem] = await db.delete(inventoryItems)
        .where(eq(inventoryItems.id, itemId))
        .returning();
      
      if (!deletedItem) {
        return res.status(404).json({ message: 'Item not found' });
      }
      
      res.json({ message: 'Item deleted successfully' });
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      res.status(500).json({ message: 'Failed to delete inventory item' });
    }
  });

  // Record stock movement
  app.post('/api/inventory/movements', requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = movementSchema.parse(req.body);
      
      // Get current item to check stock
      const [currentItem] = await db.select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, validatedData.itemId));
      
      if (!currentItem) {
        return res.status(404).json({ message: 'Item not found' });
      }
      
      // Calculate new quantity
      let newQuantity = currentItem.currentQuantity;
      if (validatedData.type === 'in') {
        newQuantity += validatedData.quantity;
      } else if (validatedData.type === 'out') {
        if (newQuantity < validatedData.quantity) {
          return res.status(400).json({ message: 'Insufficient stock' });
        }
        newQuantity -= validatedData.quantity;
      } else if (validatedData.type === 'adjustment') {
        newQuantity = validatedData.quantity;
      }
      
      // Get school ID from authenticated user
      const schoolId = req.user?.user_metadata?.school_id || req.user?.school_id || 1;
      
      // Record movement
      const [movement] = await db.insert(inventoryMovements).values({
        itemId: validatedData.itemId,
        type: validatedData.type,
        quantity: validatedData.quantity,
        reason: validatedData.reason,
        reference: validatedData.reference,
        notes: validatedData.notes,
        schoolId: schoolId,
        createdBy: req.user?.id
      }).returning();
      
      // Update item quantity
      await db.update(inventoryItems)
        .set({ 
          currentQuantity: newQuantity,
          updatedAt: new Date()
        })
        .where(eq(inventoryItems.id, validatedData.itemId));
      
      res.status(201).json(movement);
    } catch (error) {
      console.error('Error recording stock movement:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to record stock movement' });
    }
  });

  // Export inventory data
  app.get('/api/inventory/export', requireAuth, async (req: Request, res: Response) => {
    try {
      const { format = 'csv', category, status } = req.query;
      
      let query = db.select().from(inventoryItems);
      let conditions = [];
      
      if (category && category !== 'all') {
        conditions.push(eq(inventoryItems.category, category as string));
      }
      
      if (status && status !== 'all') {
        if (status === 'low_stock') {
          conditions.push(sql`${inventoryItems.currentQuantity} <= ${inventoryItems.minimumThreshold}`);
        } else if (status === 'out_of_stock') {
          conditions.push(eq(inventoryItems.currentQuantity, 0));
        }
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const items = await query.orderBy(inventoryItems.name);
      
      if (format === 'csv') {
        const csvHeader = 'ID,Name,Bengali Name,Category,Brand,Model,Quantity,Unit,Unit Price,Minimum Stock,Location,Status\n';
        const csvData = items.map(item => {
          const status = item.currentQuantity === 0 ? 'Out of Stock' : 
                        item.currentQuantity <= item.minimumThreshold ? 'Low Stock' : 'Available';
          return [
            item.id,
            `"${item.name}"`,
            `"${item.nameBn}"`,
            `"${item.category}"`,
            `"${item.brand || ''}"`,
            `"${item.model || ''}"`,
            item.currentQuantity,
            `"${item.unit}"`,
            item.unitPrice,
            item.minimumThreshold,
            `"${item.location}"`,
            `"${status}"`
          ].join(',');
        }).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=inventory_export.csv');
        res.send(csvHeader + csvData);
      } else {
        res.json(items);
      }
    } catch (error) {
      console.error('Error exporting inventory:', error);
      res.status(500).json({ message: 'Failed to export inventory data' });
    }
  });

  // Get single item by ID
  app.get('/api/inventory/items/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      const [item] = await db.select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, itemId));
      
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }
      
      res.json(item);
    } catch (error) {
      console.error('Error fetching inventory item:', error);
      res.status(500).json({ message: 'Failed to fetch inventory item' });
    }
  });
}