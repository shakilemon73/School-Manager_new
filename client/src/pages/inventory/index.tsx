import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ResponsivePageLayout } from '@/components/layout/responsive-page-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/supabase';
import { 
  Search, 
  Package, 
  Plus, 
  Filter, 
  Download,
  Edit,
  Trash2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Eye,
  Scan,
  Archive,
  RefreshCw,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

// Enhanced schemas following world-class UX principles
const itemSchema = z.object({
  name: z.string().min(1, 'পণ্যের নাম প্রয়োজন'),
  name_bn: z.string().min(1, 'বাংলা নাম প্রয়োজন'),
  category: z.string().min(1, 'বিভাগ নির্বাচন করুন'),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  unit_price: z.number().min(0, 'মূল্য প্রয়োজন'),
  current_quantity: z.number().min(0, 'পরিমাণ প্রয়োজন'),
  minimum_threshold: z.number().min(0, 'ন্যূনতম সীমা প্রয়োজন'),
  unit: z.string().min(1, 'একক নির্বাচন করুন'),
  supplier: z.string().optional(),
  location: z.string().min(1, 'অবস্থান প্রয়োজন'),
  condition: z.string().min(1, 'অবস্থা নির্বাচন করুন'),
  description: z.string().optional(),
});

const stockMovementSchema = z.object({
  itemId: z.string().min(1, 'পণ্য নির্বাচন করুন'),
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().min(1, 'পরিমাণ অবশ্যই ১ বা তার বেশি হতে হবে'),
  reason: z.string().min(1, 'কারণ প্রয়োজন'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;
type StockMovementFormData = z.infer<typeof stockMovementSchema>;

export default function InventoryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isItemOpen, setIsItemOpen] = useState(false);
  const [isStockMovementOpen, setIsStockMovementOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Enhanced form handling following Luke Wroblewski's principles
  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      name_bn: '',
      category: '',
      subcategory: '',
      brand: '',
      model: '',
      serial_number: '',
      unit_price: 0,
      current_quantity: 0,
      minimum_threshold: 10,
      unit: '',
      supplier: '',
      location: '',
      condition: '',
      description: '',
    },
  });

  const stockMovementForm = useForm<StockMovementFormData>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: {
      itemId: '',
      type: 'in',
      quantity: 1,
      reason: '',
      reference: '',
      notes: '',
    },
  });

  // Real-time data queries with direct Supabase calls
  const { data: items = [], isLoading: itemsLoading } = useQuery<any[]>({
    queryKey: ['inventory-items', { schoolId: 1 }],
    queryFn: async () => {
      console.log('🔄 Fetching inventory items directly from Supabase...');
      const items = await db.getInventoryItems(1);
      console.log('✅ Inventory items from Supabase:', items?.length || 0);
      return items || [];
    },
    refetchInterval: 30000, // Real-time updates every 30 seconds
  });

  const { data: stockMovements = [], isLoading: movementsLoading } = useQuery<any[]>({
    queryKey: ['inventory-movements', { schoolId: 1 }],
    queryFn: async () => {
      console.log('🔄 Fetching inventory movements directly from Supabase...');
      const movements = await db.getInventoryMovements(1);
      console.log('✅ Inventory movements from Supabase:', movements?.length || 0);
      return movements || [];
    },
    refetchInterval: 30000,
  });

  const { data: inventoryStats = {} } = useQuery<any>({
    queryKey: ['inventory-stats', { schoolId: 1 }],
    queryFn: async () => {
      console.log('🔄 Fetching inventory stats directly from Supabase...');
      const stats = await db.getInventoryStats(1);
      console.log('✅ Inventory stats from Supabase:', stats);
      return stats || { total_items: 0, low_stock_items: 0 };
    },
    refetchInterval: 60000,
  });

  const { data: lowStockItems = [] } = useQuery<any[]>({
    queryKey: ['inventory-low-stock', { schoolId: 1 }],
    queryFn: async () => {
      console.log('🔄 Fetching low stock items directly from Supabase...');
      // Get items where current_quantity <= minimum_threshold
      const items = await db.getInventoryItems(1);
      const lowStockItems = items?.filter(item => item.current_quantity <= item.minimum_threshold) || [];
      console.log('✅ Low stock items from Supabase:', lowStockItems?.length || 0);
      return lowStockItems;
    },
    refetchInterval: 60000,
  });

  // Mutations for CRUD operations with direct Supabase
  const addItemMutation = useMutation({
    mutationFn: async (data: ItemFormData) => {
      console.log('🔄 Adding inventory item via Supabase...', data);
      const itemWithSchool = { ...data, school_id: 1 };
      const result = await db.createInventoryItem(itemWithSchool);
      console.log('✅ Inventory item added via Supabase:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      setIsAddItemOpen(false);
      itemForm.reset();
      toast({
        title: "সফল",
        description: "নতুন পণ্য সংযোজিত হয়েছে",
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "পণ্য সংযোজনে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  const stockMovementMutation = useMutation({
    mutationFn: async (data: StockMovementFormData) => {
      console.log('🔄 Creating inventory movement via Supabase...', data);
      const movementWithSchool = { 
        item_id: parseInt(data.itemId), 
        type: data.type, 
        quantity: data.quantity, 
        reason: data.reason, 
        reference_number: data.reference, 
        school_id: 1 
      };
      const result = await db.createInventoryMovement(movementWithSchool);
      console.log('✅ Inventory movement created via Supabase:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      setIsStockMovementOpen(false);
      stockMovementForm.reset();
      toast({
        title: "সফল",
        description: "স্টক আপডেট করা হয়েছে",
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "স্টক আপডেটে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log('🔄 Deleting inventory item via Supabase...', id);
      const result = await db.deleteInventoryItem(id);
      console.log('✅ Inventory item deleted via Supabase:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      toast({
        title: "সফল",
        description: "পণ্য সফলভাবে মুছে ফেলা হয়েছে",
      });
    },
    onError: (error) => {
      toast({
        title: "ত্রুটি",
        description: "পণ্য মুছতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ItemFormData }) => {
      console.log('🔄 Updating inventory item via Supabase...', { id, data });
      const result = await db.updateInventoryItem(id, data);
      console.log('✅ Inventory item updated via Supabase:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setIsItemOpen(false);
      setEditingItem(null);
      itemForm.reset();
      toast({
        title: "সফল",
        description: "পণ্য সফলভাবে আপডেট করা হয়েছে",
      });
    },
    onError: (error) => {
      toast({
        title: "ত্রুটি",
        description: "পণ্য আপডেটে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  // Enhanced filtering following Steve Krug's usability principles
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.name_bn && item.name_bn.includes(searchQuery)) ||
        (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'low' && item.current_quantity <= item.minimum_threshold) ||
        (statusFilter === 'out' && item.current_quantity === 0) ||
        (statusFilter === 'good' && item.current_quantity > item.minimum_threshold);
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchQuery, categoryFilter, statusFilter]);

  // Enhanced accessibility following WCAG guidelines
  const handleKeyboardNavigation = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const getStockStatus = (item: any) => {
    if (item.current_quantity === 0) return { label: 'স্টক আউট', variant: 'destructive', color: 'text-red-600' };
    if (item.current_quantity <= item.minimum_threshold) return { label: 'কম স্টক', variant: 'warning', color: 'text-orange-600' };
    return { label: 'পর্যাপ্ত', variant: 'default', color: 'text-green-600' };
  };

  // Calculate dashboard stats from real data
  const dashboardStats = useMemo(() => {
    const totalItems = items.length;
    const totalCategories = new Set(items.map(item => item.category)).size;
    const totalValue = items.reduce((sum, item) => sum + (item.current_quantity * Number(item.unit_price)), 0);
    const lowStockItems = items.filter(item => item.current_quantity <= item.minimum_threshold && item.current_quantity > 0).length;
    const outOfStockItems = items.filter(item => item.current_quantity === 0).length;
    
    return {
      totalItems,
      totalCategories,
      totalValue,
      lowStockItems,
      outOfStockItems
    };
  }, [items]);

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Summary Cards - Following Jonathan Ive's design clarity */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              মোট পণ্য
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {dashboardStats.totalItems}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {dashboardStats.totalCategories} টি বিভাগে
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              মোট মূল্য
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              ৳ {dashboardStats.totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              বর্তমান স্টক
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              কম স্টক
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {dashboardStats.lowStockItems}
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              পুনরায় অর্ডার প্রয়োজন
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              স্টক আউট
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
              {dashboardStats.outOfStockItems}
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              তাৎক্ষণিক প্রয়োজন
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts - Following Don Norman's feedback principles */}
      {dashboardStats.lowStockItems > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <AlertTriangle className="h-5 w-5" />
              কম স্টক সতর্কতা
            </CardTitle>
            <CardDescription>
              নিম্নলিখিত পণ্যগুলি পুনরায় অর্ডার করতে হবে
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.filter(item => item.current_quantity <= item.minimum_threshold && item.current_quantity > 0).slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="font-medium">{item.name_bn || item.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        বর্তমান: {item.current_quantity} {item.unit} • ন্যূনতম: {item.minimum_threshold} {item.unit}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    অর্ডার করুন
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Stock Movements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            সাম্প্রতিক স্টক গতিবিধি
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stockMovements.slice(0, 5).map((movement) => (
              <div key={movement.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    movement.type === 'in' ? 'bg-green-500' : movement.type === 'out' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <p className="font-medium">{movement.name || 'অজানা পণ্য'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : '±'}{movement.quantity} {movement.unit || 'ইউনিট'} • {movement.reason}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={
                    movement.type === 'in' ? "default" : 
                    movement.type === 'out' ? "destructive" : "secondary"
                  }>
                    {movement.type === 'in' ? 'ইন' : movement.type === 'out' ? 'আউট' : 'সমন্বয়'}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {movement.created_at ? format(new Date(movement.created_at), 'dd/MM/yyyy') : 'তারিখ নেই'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AppShell>
      <ResponsivePageLayout
        title="ইনভেন্টরি ব্যবস্থাপনা"
        description="পণ্য স্টক ও সাপ্লাই চেইন ব্যবস্থাপনা"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">ড্যাশবোর্ড</TabsTrigger>
            <TabsTrigger value="items">পণ্য সমূহ</TabsTrigger>
            <TabsTrigger value="movements">গতিবিধি</TabsTrigger>
            <TabsTrigger value="reports">রিপোর্ট</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {renderDashboard()}
          </TabsContent>

          <TabsContent value="items" className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="পণ্য খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="বিভাগ নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল বিভাগ</SelectItem>
                  <SelectItem value="Electronics">ইলেকট্রনিক্স</SelectItem>
                  <SelectItem value="Furniture">আসবাবপত্র</SelectItem>
                  <SelectItem value="Stationery">স্টেশনারি</SelectItem>
                  <SelectItem value="Sports Equipment">ক্রীড়া সামগ্রী</SelectItem>
                  <SelectItem value="Laboratory">ল্যাবরেটরি</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="স্ট্যাটাস নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল স্ট্যাটাস</SelectItem>
                  <SelectItem value="good">পর্যাপ্ত স্টক</SelectItem>
                  <SelectItem value="low">কম স্টক</SelectItem>
                  <SelectItem value="out">স্টক শেষ</SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    নতুন পণ্য
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>নতুন পণ্য যোগ করুন</DialogTitle>
                    <DialogDescription>
                      নতুন ইনভেন্টরি আইটেম যোগ করার জন্য নিচের তথ্য পূরণ করুন
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...itemForm}>
                    <form onSubmit={itemForm.handleSubmit((data) => addItemMutation.mutate(data))} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={itemForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>পণ্যের নাম (ইংরেজি)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="যেমন: Projector" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={itemForm.control}
                          name="name_bn"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>পণ্যের নাম (বাংলা)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="যেমন: প্রজেক্টর" />
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
                              <FormLabel>বিভাগ</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="বিভাগ নির্বাচন করুন" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Electronics">ইলেকট্রনিক্স</SelectItem>
                                  <SelectItem value="Furniture">আসবাবপত্র</SelectItem>
                                  <SelectItem value="Stationery">স্টেশনারি</SelectItem>
                                  <SelectItem value="Sports Equipment">ক্রীড়া সামগ্রী</SelectItem>
                                  <SelectItem value="Laboratory">ল্যাবরেটরি</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={itemForm.control}
                          name="brand"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ব্র্যান্ড</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="যেমন: Samsung" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={itemForm.control}
                          name="current_quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>বর্তমান পরিমাণ</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={e => field.onChange(Number(e.target.value))}
                                  placeholder="যেমন: 10" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={itemForm.control}
                          name="minimum_threshold"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>সর্বনিম্ন সীমা</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={e => field.onChange(Number(e.target.value))}
                                  placeholder="যেমন: 5" 
                                />
                              </FormControl>
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
                              <FormControl>
                                <Input {...field} placeholder="যেমন: পিস, কেজি" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={itemForm.control}
                          name="unit_price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>একক মূল্য (টাকা)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={e => field.onChange(Number(e.target.value))}
                                  placeholder="যেমন: 1500" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={itemForm.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>অবস্থান</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="যেমন: স্টোর রুম A" />
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
                            <FormLabel>বিবরণ</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="পণ্যের বিস্তারিত বিবরণ..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-3 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsAddItemOpen(false)}
                        >
                          বাতিল
                        </Button>
                        <Button type="submit" disabled={addItemMutation.isPending}>
                          {addItemMutation.isPending ? 'যোগ করা হচ্ছে...' : 'পণ্য যোগ করুন'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Items Table */}
            <Card>
              <CardHeader>
                <CardTitle>পণ্য তালিকা</CardTitle>
                <CardDescription>
                  মোট {filteredItems.length} টি পণ্য
                </CardDescription>
              </CardHeader>
              <CardContent>
                {itemsLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>পণ্যের নাম</TableHead>
                        <TableHead>বিভাগ</TableHead>
                        <TableHead>বর্তমান স্টক</TableHead>
                        <TableHead>একক মূল্য</TableHead>
                        <TableHead>মোট মূল্য</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead>
                        <TableHead>কার্যক্রম</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.name_bn || item.name}</p>
                              <p className="text-sm text-gray-500">{item.brand && `${item.brand} ${item.model || ''}`.trim()}</p>
                            </div>
                          </TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{item.current_quantity}</span>
                              <span className="text-sm text-gray-500">{item.unit}</span>
                            </div>
                          </TableCell>
                          <TableCell>৳{Number(item.unit_price).toLocaleString()}</TableCell>
                          <TableCell>৳{(Number(item.unit_price) * item.current_quantity).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={
                              item.current_quantity === 0 ? "destructive" : 
                              item.current_quantity <= item.minimum_threshold ? "secondary" : "default"
                            }>
                              {item.current_quantity === 0 ? 'স্টক শেষ' : 
                               item.current_quantity <= item.minimum_threshold ? 'কম স্টক' : 'পর্যাপ্ত'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setEditingItem(item);
                                  itemForm.reset({
                                    name: item.name || '',
                                    nameBn: item.name_bn || '',
                                    category: item.category || '',
                                    subcategory: item.subcategory || '',
                                    brand: item.brand || '',
                                    model: item.model || '',
                                    serialNumber: item.serial_number || '',
                                    unitPrice: item.unit_price?.toString() || '0',
                                    currentQuantity: item.current_quantity?.toString() || '0',
                                    minimumThreshold: item.minimum_threshold?.toString() || '0',
                                    unit: item.unit || '',
                                    supplier: item.supplier || '',
                                    location: item.location || '',
                                    condition: item.condition || 'New',
                                    description: item.description || ''
                                  });
                                  setIsItemOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  if (confirm('আপনি কি এই পণ্যটি মুছে ফেলতে চান?')) {
                                    deleteItemMutation.mutate(item.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movements" className="space-y-6">
            {/* Stock Movement Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="flex gap-2">
                <Dialog open={isStockMovementOpen} onOpenChange={setIsStockMovementOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      স্টক গতিবিধি রেকর্ড করুন
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>স্টক গতিবিধি রেকর্ড</DialogTitle>
                      <DialogDescription>
                        স্টক ইন/আউট অথবা সমন্বয় রেকর্ড করুন
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...stockMovementForm}>
                      <form onSubmit={stockMovementForm.handleSubmit((data) => stockMovementMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={stockMovementForm.control}
                          name="itemId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>পণ্য নির্বাচন করুন</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="পণ্য নির্বাচন করুন" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {items.map((item) => (
                                    <SelectItem key={item.id} value={item.id.toString()}>
                                      {item.name_bn || item.name} - বর্তমান: {item.current_quantity} {item.unit}
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
                            control={stockMovementForm.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>গতিবিধির ধরন</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="ধরন নির্বাচন করুন" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="in">স্টক ইন</SelectItem>
                                    <SelectItem value="out">স্টক আউট</SelectItem>
                                    <SelectItem value="adjustment">সমন্বয়</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={stockMovementForm.control}
                            name="quantity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>পরিমাণ</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    {...field} 
                                    onChange={e => field.onChange(Number(e.target.value))}
                                    placeholder="যেমন: 5" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={stockMovementForm.control}
                          name="reason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>কারণ</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="যেমন: নতুন ক্রয়, ক্ষতিগ্রস্ত, বিতরণ" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={stockMovementForm.control}
                          name="reference"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>রেফারেন্স (ঐচ্ছিক)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="যেমন: ইনভয়েস নং, অর্ডার নং" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={stockMovementForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>অতিরিক্ত নোট (ঐচ্ছিক)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="অতিরিক্ত তথ্য..." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end gap-3 pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsStockMovementOpen(false)}
                          >
                            বাতিল
                          </Button>
                          <Button type="submit" disabled={stockMovementMutation.isPending}>
                            {stockMovementMutation.isPending ? 'রেকর্ড করা হচ্ছে...' : 'রেকর্ড করুন'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  এক্সপোর্ট করুন
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  ফিল্টার
                </Button>
              </div>
            </div>

            {/* Stock Movements Table */}
            <Card>
              <CardHeader>
                <CardTitle>স্টক গতিবিধি ইতিহাস</CardTitle>
                <CardDescription>
                  সকল স্টক পরিবর্তনের বিস্তারিত রেকর্ড
                </CardDescription>
              </CardHeader>
              <CardContent>
                {movementsLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                  </div>
                ) : stockMovements.length === 0 ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">কোন গতিবিধি নেই</h3>
                    <p className="text-gray-600">এখনও কোন স্টক গতিবিধি রেকর্ড করা হয়নি</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>তারিখ ও সময়</TableHead>
                        <TableHead>পণ্য</TableHead>
                        <TableHead>ধরন</TableHead>
                        <TableHead>পরিমাণ</TableHead>
                        <TableHead>কারণ</TableHead>
                        <TableHead>রেফারেন্স</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockMovements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {movement.created_at ? format(new Date(movement.created_at), 'dd/MM/yyyy') : 'তারিখ নেই'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {movement.created_at ? format(new Date(movement.created_at), 'hh:mm a') : ''}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{movement.name || 'পণ্যের নাম নেই'}</p>
                              <p className="text-sm text-gray-500">ID: {movement.item_id}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              movement.type === 'in' ? "default" : 
                              movement.type === 'out' ? "destructive" : "secondary"
                            }>
                              {movement.type === 'in' && (
                                <>
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  স্টক ইন
                                </>
                              )}
                              {movement.type === 'out' && (
                                <>
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  স্টক আউট
                                </>
                              )}
                              {movement.type === 'adjustment' && (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  সমন্বয়
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className={`font-medium ${
                                movement.type === 'in' ? 'text-green-600' : 
                                movement.type === 'out' ? 'text-red-600' : 'text-blue-600'
                              }`}>
                                {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : '±'}{movement.quantity}
                              </span>
                              <span className="text-sm text-gray-500">{movement.unit || 'পিস'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{movement.reason || 'কারণ উল্লেখ নেই'}</TableCell>
                          <TableCell>
                            {movement.reference ? (
                              <Badge variant="outline">{movement.reference}</Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              সম্পন্ন
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {/* Report Controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="flex gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="রিপোর্টের ধরন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সকল রিপোর্ট</SelectItem>
                    <SelectItem value="stock">স্টক রিপোর্ট</SelectItem>
                    <SelectItem value="movements">গতিবিধি রিপোর্ট</SelectItem>
                    <SelectItem value="valuation">মূল্যায়ন রিপোর্ট</SelectItem>
                    <SelectItem value="low-stock">কম স্টক রিপোর্ট</SelectItem>
                  </SelectContent>
                </Select>

                <Select defaultValue="month">
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="সময়কাল" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">আজ</SelectItem>
                    <SelectItem value="week">এই সপ্তাহ</SelectItem>
                    <SelectItem value="month">এই মাস</SelectItem>
                    <SelectItem value="quarter">এই ত্রৈমাসিক</SelectItem>
                    <SelectItem value="year">এই বছর</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  PDF ডাউনলোড
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Excel ডাউনলোড
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  রিফ্রেশ
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    মোট পণ্য সংখ্যা
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{inventoryStats.totalItems || 0}</div>
                  <p className="text-xs text-gray-500 mt-1">বিভিন্ন বিভাগে</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    মোট মূল্য
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">৳{Number(inventoryStats.totalValue || 0).toLocaleString()}</div>
                  <p className="text-xs text-gray-500 mt-1">বর্তমান স্টক</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    কম স্টক
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{inventoryStats.lowStockItems || 0}</div>
                  <p className="text-xs text-gray-500 mt-1">অর্ডার প্রয়োজন</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    এই মাসের গতিবিধি
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stockMovements.length}</div>
                  <p className="text-xs text-gray-500 mt-1">লেনদেন সম্পন্ন</p>
                </CardContent>
              </Card>
            </div>

            {/* Category-wise Stock Report */}
            <Card>
              <CardHeader>
                <CardTitle>বিভাগ অনুযায়ী স্টক রিপোর্ট</CardTitle>
                <CardDescription>প্রতিটি বিভাগের স্টক ও মূল্যের বিস্তারিত</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>বিভাগ</TableHead>
                      <TableHead>পণ্য সংখ্যা</TableHead>
                      <TableHead>মোট স্টক</TableHead>
                      <TableHead>মোট মূল্য</TableHead>
                      <TableHead>কম স্টক</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from(new Set(items.map(item => item.category))).map((category) => {
                      const categoryItems = items.filter(item => item.category === category);
                      const totalStock = categoryItems.reduce((sum, item) => sum + item.current_quantity, 0);
                      const totalValue = categoryItems.reduce((sum, item) => sum + (item.current_quantity * Number(item.unit_price)), 0);
                      const lowStockCount = categoryItems.filter(item => item.current_quantity <= item.minimum_threshold).length;
                      
                      return (
                        <TableRow key={category}>
                          <TableCell className="font-medium">{category}</TableCell>
                          <TableCell>{categoryItems.length} টি</TableCell>
                          <TableCell>{totalStock} ইউনিট</TableCell>
                          <TableCell>৳{totalValue.toLocaleString()}</TableCell>
                          <TableCell>
                            {lowStockCount > 0 ? (
                              <Badge variant="secondary" className="text-orange-600">
                                {lowStockCount} টি
                              </Badge>
                            ) : (
                              <Badge variant="default">সব ঠিক</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={lowStockCount > 0 ? "secondary" : "default"}>
                              {lowStockCount > 0 ? 'নজরদারি' : 'স্বাভাবিক'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Top 10 Most Valuable Items */}
            <Card>
              <CardHeader>
                <CardTitle>সর্বোচ্চ মূল্যের পণ্য (টপ ১০)</CardTitle>
                <CardDescription>মূল্য অনুযায়ী সর্বোচ্চ দামি পণ্যসমূহ</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ক্রম</TableHead>
                      <TableHead>পণ্যের নাম</TableHead>
                      <TableHead>বর্তমান স্টক</TableHead>
                      <TableHead>একক মূল্য</TableHead>
                      <TableHead>মোট মূল্য</TableHead>
                      <TableHead>অবস্থান</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items
                      .map(item => ({
                        ...item,
                        totalValue: item.current_quantity * Number(item.unit_price)
                      }))
                      .sort((a, b) => b.totalValue - a.totalValue)
                      .slice(0, 10)
                      .map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant="outline">#{index + 1}</Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.name_bn || item.name}</p>
                              <p className="text-sm text-gray-500">{item.brand} {item.model}</p>
                            </div>
                          </TableCell>
                          <TableCell>{item.current_quantity} {item.unit}</TableCell>
                          <TableCell>৳{Number(item.unit_price).toLocaleString()}</TableCell>
                          <TableCell className="font-medium">৳{item.totalValue.toLocaleString()}</TableCell>
                          <TableCell>{item.location}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Recent Stock Movements Summary */}
            <Card>
              <CardHeader>
                <CardTitle>সাম্প্রতিক স্টক গতিবিধি সংক্ষেপ</CardTitle>
                <CardDescription>গত ৩০ দিনের স্টক পরিবর্তনের সংক্ষিপ্ত রিপোর্ট</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800 dark:text-green-200">স্টক ইন</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {stockMovements.filter(m => m.type === 'in').length}
                    </div>
                    <p className="text-sm text-green-600">নতুন পণ্য যোগ</p>
                  </div>

                  <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-800 dark:text-red-200">স্টক আউট</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {stockMovements.filter(m => m.type === 'out').length}
                    </div>
                    <p className="text-sm text-red-600">পণ্য বিতরণ</p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800 dark:text-blue-200">সমন্বয়</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {stockMovements.filter(m => m.type === 'adjustment').length}
                    </div>
                    <p className="text-sm text-blue-600">সংশোধন</p>
                  </div>
                </div>

                {stockMovements.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="font-medium">সাম্প্রতিক ৫টি গতিবিধি:</h4>
                    {stockMovements.slice(0, 5).map((movement) => (
                      <div key={movement.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            movement.type === 'in' ? 'bg-green-500' : 
                            movement.type === 'out' ? 'bg-red-500' : 'bg-blue-500'
                          }`} />
                          <div>
                            <p className="font-medium">{movement.name || 'অজানা পণ্য'}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : '±'}
                              {movement.quantity} {movement.unit || 'ইউনিট'} • {movement.reason}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            movement.type === 'in' ? "default" : 
                            movement.type === 'out' ? "destructive" : "secondary"
                          }>
                            {movement.type === 'in' ? 'ইন' : movement.type === 'out' ? 'আউট' : 'সমন্বয়'}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {movement.created_at ? format(new Date(movement.created_at), 'dd/MM/yyyy') : 'তারিখ নেই'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Clock className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">এখনও কোন স্টক গতিবিধি রেকর্ড করা হয়নি</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </ResponsivePageLayout>
    </AppShell>
  );
}