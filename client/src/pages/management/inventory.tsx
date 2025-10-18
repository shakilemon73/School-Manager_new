import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Search,
  Download,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Archive,
  ShoppingCart
} from 'lucide-react';

// Schemas for inventory management
const itemSchema = z.object({
  name: z.string().min(1, 'আইটেমের নাম আবশ্যক'),
  nameInBangla: z.string().min(1, 'বাংলা নাম আবশ্যক'),
  category: z.string().min(1, 'ক্যাটাগরি আবশ্যক'),
  brand: z.string().optional(),
  model: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().min(1, 'একক আবশ্যক'),
  unitPrice: z.string().min(1, 'একক মূল্য আবশ্যক'),
  quantity: z.string().min(1, 'পরিমাণ আবশ্যক'),
  minimumStock: z.string().min(1, 'সর্বনিম্ন স্টক আবশ্যক'),
  location: z.string().optional(),
  supplier: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  status: z.enum(['available', 'low_stock', 'out_of_stock', 'damaged']).default('available'),
});

const movementSchema = z.object({
  itemId: z.string().min(1, 'আইটেম নির্বাচন করুন'),
  type: z.enum(['in', 'out']),
  quantity: z.string().min(1, 'পরিমাণ আবশ্যক'),
  reason: z.string().min(1, 'কারণ আবশ্যক'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;
type MovementFormData = z.infer<typeof movementSchema>;

const categories = [
  'অফিস সরঞ্জাম', 'শিক্ষা উপকরণ', 'আইটি যন্ত্রপাতি', 'ফার্নিচার', 
  'স্টেশনারি', 'রক্ষণাবেক্ষণ', 'নিরাপত্তা', 'পরিষ্কার সরঞ্জাম',
  'ক্রীড়া সামগ্রী', 'বৈজ্ঞানিক যন্ত্র', 'গ্রন্থাগার সামগ্রী', 'অন্যান্য'
];

const units = ['পিস', 'সেট', 'কেজি', 'লিটার', 'মিটার', 'প্যাকেট', 'বক্স', 'রিম'];

const statusColors = {
  available: 'bg-green-100 text-green-800',
  low_stock: 'bg-yellow-100 text-yellow-800',
  out_of_stock: 'bg-red-100 text-red-800',
  damaged: 'bg-gray-100 text-gray-800'
};

const statusLabels = {
  available: 'উপলব্ধ',
  low_stock: 'কম স্টক',
  out_of_stock: 'স্টক নেই',
  damaged: 'ক্ষতিগ্রস্ত'
};

export default function InventoryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [activeTab, setActiveTab] = useState('items');
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [dialogType, setDialogType] = useState<'item' | 'movement'>('item');

  // Fetch inventory data with proper types
  const { data: inventoryStats } = useQuery<{
    totalItems: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  }>({
    queryKey: ['inventory/stats', schoolId],
    queryFn: async () => {
      const stats = await db.getInventoryStats(schoolId);
      const items = await db.getInventoryItems(schoolId);
      
      const totalValue = items?.reduce((sum, item) => sum + ((item.unit_price || 0) * (item.current_quantity || 0)), 0) || 0;
      const outOfStock = items?.filter(item => (item.current_quantity || 0) === 0).length || 0;
      
      return {
        totalItems: stats.total_items,
        lowStock: stats.low_stock_items,
        outOfStock,
        totalValue
      };
    },
  });

  const { data: items = [], isLoading: itemsLoading, refetch: refetchItems } = useQuery<any[]>({
    queryKey: ['inventory/items', schoolId, searchText, selectedCategory, selectedStatus],
    queryFn: async () => {
      const allItems = await db.getInventoryItems(schoolId);
      
      // Apply client-side filtering
      return allItems?.filter(item => {
        const matchesSearch = !searchText || 
          item.name?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.name_bn?.includes(searchText) ||
          item.brand?.toLowerCase().includes(searchText.toLowerCase());
        
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        
        // Determine status based on quantity vs minimum threshold
        const currentQty = item.current_quantity || 0;
        const minThreshold = item.minimum_threshold || 0;
        let itemStatus = 'available';
        if (currentQty === 0) itemStatus = 'out_of_stock';
        else if (currentQty <= minThreshold) itemStatus = 'low_stock';
        
        const matchesStatus = selectedStatus === 'all' || itemStatus === selectedStatus;
        
        return matchesSearch && matchesCategory && matchesStatus;
      }) || [];
    },
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery<any[]>({
    queryKey: ['inventory/movements', schoolId, searchText],
    queryFn: async () => {
      const allMovements = await db.getInventoryMovements(schoolId);
      
      // Apply client-side filtering
      return allMovements?.filter(movement => {
        if (!searchText) return true;
        return movement.inventory_items?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
               movement.reason?.toLowerCase().includes(searchText.toLowerCase());
      }) || [];
    },
  });

  // Item form
  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      nameInBangla: '',
      category: '',
      brand: '',
      model: '',
      description: '',
      unit: '',
      unitPrice: '',
      quantity: '',
      minimumStock: '',
      location: '',
      supplier: '',
      purchaseDate: '',
      warrantyExpiry: '',
      status: 'available',
    },
  });

  // Movement form
  const movementForm = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      itemId: '',
      type: 'in',
      quantity: '',
      reason: '',
      reference: '',
      notes: '',
    },
  });

  // Create mutations
  const createItem = useMutation({
    mutationFn: async (data: ItemFormData) => {
      // Map form data to database format
      const dbItem = {
        school_id: schoolId,
        name: data.name,
        name_bn: data.nameInBangla,
        category: data.category,
        brand: data.brand || null,
        model: data.model || null,
        description: data.description || null,
        unit: data.unit,
        unit_price: parseFloat(data.unitPrice),
        current_quantity: parseInt(data.quantity),
        minimum_threshold: parseInt(data.minimumStock),
        location: data.location || null,
        supplier: data.supplier || null,
        condition: 'good' // Default condition
      };
      
      return await db.createInventoryItem(dbItem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory/stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "নতুন আইটেম যোগ করা হয়েছে",
      });
      setIsAddDialogOpen(false);
      itemForm.reset();
    },
  });

  const createMovement = useMutation({
    mutationFn: async (data: MovementFormData) => {
      // Map form data to database format
      const dbMovement = {
        school_id: schoolId,
        item_id: parseInt(data.itemId),
        type: data.type,
        quantity: parseInt(data.quantity),
        reason: data.reason,
        reference: data.reference || null,
        notes: data.notes || null,
        movement_date: new Date().toISOString().split('T')[0], // Today's date
        created_by: 1 // TODO: Get from current user
      };
      
      return await db.createInventoryMovement(dbMovement);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory/movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory/stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "স্টক চলাচল রেকর্ড করা হয়েছে",
      });
      setIsMovementDialogOpen(false);
      movementForm.reset();
    },
  });

  // Update mutations
  const updateItem = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ItemFormData }) => {
      // Map form data to database format
      const dbUpdates = {
        name: data.name,
        name_bn: data.nameInBangla,
        category: data.category,
        brand: data.brand || null,
        model: data.model || null,
        description: data.description || null,
        unit: data.unit,
        unit_price: parseFloat(data.unitPrice),
        current_quantity: parseInt(data.quantity),
        minimum_threshold: parseInt(data.minimumStock),
        location: data.location || null,
        supplier: data.supplier || null
      };
      
      return await db.updateInventoryItem(id, dbUpdates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory/stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "আইটেমের তথ্য আপডেট করা হয়েছে",
      });
      setEditingItem(null);
      setIsAddDialogOpen(false);
    },
  });

  // Delete mutations
  const deleteItem = useMutation({
    mutationFn: async (id: number) => {
      return await db.deleteInventoryItem(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory/stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "আইটেম মুছে ফেলা হয়েছে",
      });
    },
  });

  const handleAddItem = () => {
    setDialogType('item');
    setEditingItem(null);
    itemForm.reset();
    setIsAddDialogOpen(true);
  };

  const handleAddMovement = () => {
    setDialogType('movement');
    movementForm.reset();
    setIsMovementDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setDialogType('item');
    setEditingItem(item);
    itemForm.reset({
      name: item.name || '',
      nameInBangla: item.name_bn || '',
      category: item.category || '',
      brand: item.brand || '',
      model: item.model || '',
      description: item.description || '',
      unit: item.unit || '',
      unitPrice: item.unit_price?.toString() || '',
      quantity: item.current_quantity?.toString() || '',
      minimumStock: item.minimum_threshold?.toString() || '',
      location: item.location || '',
      supplier: item.supplier || '',
      purchaseDate: '',
      warrantyExpiry: '',
      status: 'available', // Calculate dynamically
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('আপনি কি নিশ্চিত যে এই আইটেমটি মুছে ফেলতে চান?')) {
      deleteItem.mutate(id);
    }
  };

  const handleExport = async () => {
    try {
      // Generate CSV from current filtered data
      const csvHeaders = ['Name,Bangla Name,Category,Brand,Model,Unit,Unit Price,Current Quantity,Minimum Stock,Location,Supplier,Status'];
      const csvRows = filteredItems.map(item => {
        const currentQty = item.current_quantity || 0;
        const minThreshold = item.minimum_threshold || 0;
        let status = 'available';
        if (currentQty === 0) status = 'out_of_stock';
        else if (currentQty <= minThreshold) status = 'low_stock';
        
        return [
          item.name || '',
          item.name_bn || '',
          item.category || '',
          item.brand || '',
          item.model || '',
          item.unit || '',
          item.unit_price || 0,
          currentQty,
          minThreshold,
          item.location || '',
          item.supplier || '',
          status
        ].join(',');
      });
      
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "সফল হয়েছে!",
        description: "ইনভেন্টরি ডেটা এক্সপোর্ট সম্পন্ন",
      });
    } catch (error) {
      toast({
        title: "ত্রুটি!",
        description: "এক্সপোর্ট করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    }
  };

  const onItemSubmit = (data: ItemFormData) => {
    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, data });
    } else {
      createItem.mutate(data);
    }
  };

  const onMovementSubmit = (data: MovementFormData) => {
    createMovement.mutate(data);
  };

  // Filter items
  const filteredItems = Array.isArray(items) ? items : [];

  // Filter movements  
  const filteredMovements = Array.isArray(movements) ? movements.filter((movement: any) => {
    if (!searchText) return true;
    return movement.inventory_items?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
           movement.reason?.toLowerCase().includes(searchText.toLowerCase());
  }) : [];

  if (itemsLoading || movementsLoading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">ইনভেন্টরি তথ্য লোড হচ্ছে...</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ইনভেন্টরি ব্যবস্থাপনা</h1>
            <p className="text-gray-600 mt-2">স্টক ও সামগ্রী পরিচালনা করুন</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleAddMovement} variant="outline">
              <TrendingUp className="w-4 h-4 mr-2" />
              স্টক চলাচল
            </Button>
            <Button onClick={handleAddItem}>
              <Plus className="w-4 h-4 mr-2" />
              নতুন আইটেম যোগ করুন
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {inventoryStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">মোট আইটেম</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inventoryStats.totalItems || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">কম স্টক</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{inventoryStats.lowStock || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">স্টক নেই</CardTitle>
                <Archive className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{inventoryStats.outOfStock || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">মোট মূল্য</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">৳{inventoryStats.totalValue || 0}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="আইটেমের নাম, ব্র্যান্ড বা কারণ দিয়ে খুঁজুন..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল ক্যাটাগরি</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="স্ট্যাটাস নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল স্ট্যাটাস</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                এক্সপোর্ট
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="items">আইটেম ({filteredItems.length})</TabsTrigger>
            <TabsTrigger value="movements">স্টক চলাচল ({filteredMovements.length})</TabsTrigger>
          </TabsList>

          {/* Items Tab */}
          <TabsContent value="items">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>আইটেম</TableHead>
                      <TableHead>ক্যাটাগরি</TableHead>
                      <TableHead>স্টক</TableHead>
                      <TableHead>একক মূল্য</TableHead>
                      <TableHead>স্থান</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>কার্যক্রম</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-gray-500">{item.name_bn}</div>
                            {item.brand && (
                              <div className="text-xs text-gray-400">{item.brand} {item.model}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.current_quantity} {item.unit}</div>
                            <div className="text-xs text-gray-500">
                              সর্বনিম্ন: {item.minimum_threshold} {item.unit}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>৳{item.unit_price}</TableCell>
                        <TableCell>{item.location || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[item.status as keyof typeof statusColors]}>
                            {statusLabels[item.status as keyof typeof statusLabels]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredItems.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">কোনো আইটেম পাওয়া যায়নি</h3>
                    <p className="mt-1 text-sm text-gray-500">নতুন আইটেম যোগ করুন বা ফিল্টার পরিবর্তন করুন।</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Movements Tab */}
          <TabsContent value="movements">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>তারিখ</TableHead>
                      <TableHead>আইটেম</TableHead>
                      <TableHead>ধরন</TableHead>
                      <TableHead>পরিমাণ</TableHead>
                      <TableHead>কারণ</TableHead>
                      <TableHead>রেফারেন্স</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovements.map((movement: any) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          {movement.createdAt ? new Date(movement.createdAt).toLocaleDateString('bn-BD') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{movement.item?.name}</div>
                            <div className="text-sm text-gray-500">{movement.item?.nameInBangla}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={movement.type === 'in' ? 'default' : 'secondary'}>
                            {movement.type === 'in' ? (
                              <>
                                <TrendingUp className="w-3 h-3 mr-1" />
                                প্রবেশ
                              </>
                            ) : (
                              <>
                                <TrendingDown className="w-3 h-3 mr-1" />
                                বাহির
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>{movement.quantity} {movement.item?.unit}</TableCell>
                        <TableCell>{movement.reason}</TableCell>
                        <TableCell>{movement.reference || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredMovements.length === 0 && (
                  <div className="text-center py-12">
                    <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">কোনো চলাচল পাওয়া যায়নি</h3>
                    <p className="mt-1 text-sm text-gray-500">স্টক চলাচল রেকর্ড করুন বা ফিল্টার পরিবর্তন করুন।</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Item Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'আইটেমের তথ্য সম্পাদনা' : 'নতুন আইটেম যোগ করুন'}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? 'আইটেমের তথ্য আপডেট করুন' : 'নতুন আইটেমের সম্পূর্ণ তথ্য প্রদান করুন'}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...itemForm}>
              <form onSubmit={itemForm.handleSubmit(onItemSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={itemForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>আইটেমের নাম (ইংরেজি)</FormLabel>
                        <FormControl>
                          <Input placeholder="Computer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={itemForm.control}
                    name="nameInBangla"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>আইটেমের নাম (বাংলা)</FormLabel>
                        <FormControl>
                          <Input placeholder="কম্পিউটার" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={itemForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ক্যাটাগরি</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map(category => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={itemForm.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>একক</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="একক নির্বাচন করুন" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {units.map(unit => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={itemForm.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ব্র্যান্ড (ঐচ্ছিক)</FormLabel>
                        <FormControl>
                          <Input placeholder="Dell" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={itemForm.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>মডেল (ঐচ্ছিক)</FormLabel>
                        <FormControl>
                          <Input placeholder="Inspiron 3000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={itemForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>বর্ণনা (ঐচ্ছিক)</FormLabel>
                      <FormControl>
                        <Input placeholder="বিস্তারিত বর্ণনা" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={itemForm.control}
                    name="unitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>একক মূল্য (টাকা)</FormLabel>
                        <FormControl>
                          <Input placeholder="50000" type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={itemForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>পরিমাণ</FormLabel>
                        <FormControl>
                          <Input placeholder="10" type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={itemForm.control}
                    name="minimumStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>সর্বনিম্ন স্টক</FormLabel>
                        <FormControl>
                          <Input placeholder="2" type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={itemForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>স্থান (ঐচ্ছিক)</FormLabel>
                        <FormControl>
                          <Input placeholder="কম্পিউটার রুম" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={itemForm.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>সরবরাহকারী (ঐচ্ছিক)</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Company" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={itemForm.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ক্রয়ের তারিখ (ঐচ্ছিক)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={itemForm.control}
                    name="warrantyExpiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ওয়ারেন্টি মেয়াদ (ঐচ্ছিক)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={itemForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>স্ট্যাটাস</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="স্ট্যাটাস নির্বাচন করুন" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
                    {createItem.isPending || updateItem.isPending ? 'সংরক্ষণ করা হচ্ছে...' : 
                     editingItem ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Stock Movement Dialog */}
        <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>স্টক চলাচল রেকর্ড করুন</DialogTitle>
              <DialogDescription>
                আইটেমের স্টক প্রবেশ বা বাহির রেকর্ড করুন
              </DialogDescription>
            </DialogHeader>
            
            <Form {...movementForm}>
              <form onSubmit={movementForm.handleSubmit(onMovementSubmit)} className="space-y-4">
                <FormField
                  control={movementForm.control}
                  name="itemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>আইটেম নির্বাচন করুন</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="আইটেম নির্বাচন করুন" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {items.map((item: any) => (
                            <SelectItem key={item.id} value={item.id.toString()}>
                              {item.name} ({item.nameInBangla}) - {item.quantity} {item.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={movementForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>চলাচলের ধরন</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="ধরন নির্বাচন করুন" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="in">প্রবেশ</SelectItem>
                            <SelectItem value="out">বাহির</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={movementForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>পরিমাণ</FormLabel>
                        <FormControl>
                          <Input placeholder="5" type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={movementForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>কারণ</FormLabel>
                      <FormControl>
                        <Input placeholder="নতুন ক্রয়, বিতরণ, ক্ষতি ইত্যাদি" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={movementForm.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>রেফারেন্স (ঐচ্ছিক)</FormLabel>
                      <FormControl>
                        <Input placeholder="ইনভয়েস নম্বর, অর্ডার নম্বর ইত্যাদি" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={movementForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>নোট (ঐচ্ছিক)</FormLabel>
                      <FormControl>
                        <Input placeholder="অতিরিক্ত তথ্য" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsMovementDialogOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit" disabled={createMovement.isPending}>
                    {createMovement.isPending ? 'রেকর্ড করা হচ্ছে...' : 'রেকর্ড করুন'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}