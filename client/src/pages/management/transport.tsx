import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { db, supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Bus, 
  Search,
  Download,
  CheckCircle,
  AlertCircle,
  MapPin,
  Users,
  Route,
  Settings
} from 'lucide-react';

// Schemas for different transport entities
const vehicleSchema = z.object({
  vehicleNumber: z.string().min(1, 'গাড়ির নম্বর আবশ্যক'),
  type: z.string().min(1, 'গাড়ির ধরন আবশ্যক'),
  capacity: z.string().min(1, 'ধারণক্ষমতা আবশ্যক'),
  driverName: z.string().min(1, 'চালকের নাম আবশ্যক'),
  driverPhone: z.string().min(11, 'চালকের ফোন নম্বর আবশ্যক'),
  status: z.enum(['active', 'maintenance', 'inactive']).default('active'),
});

const routeSchema = z.object({
  routeName: z.string().min(1, 'রুটের নাম আবশ্যক'),
  startPoint: z.string().min(1, 'শুরুর পয়েন্ট আবশ্যক'),
  endPoint: z.string().min(1, 'শেষ পয়েন্ট আবশ্যক'),
  distance: z.string().min(1, 'দূরত্ব আবশ্যক'),
  estimatedTime: z.string().min(1, 'আনুমানিক সময় আবশ্যক'),
  fare: z.string().min(1, 'ভাড়া আবশ্যক'),
});

const assignmentSchema = z.object({
  vehicleId: z.string().min(1, 'গাড়ি নির্বাচন করুন'),
  routeId: z.string().min(1, 'রুট নির্বাচন করুন'),
  startTime: z.string().min(1, 'শুরুর সময় আবশ্যক'),
  endTime: z.string().min(1, 'শেষ সময় আবশ্যক'),
  isActive: z.boolean().default(true),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;
type RouteFormData = z.infer<typeof routeSchema>;
type AssignmentFormData = z.infer<typeof assignmentSchema>;

const vehicleTypes = ['বাস', 'মিনিবাস', 'মাইক্রোবাস', 'জিপ', 'ভ্যান'];
const vehicleStatuses = [
  { value: 'active', label: 'সক্রিয়', color: 'bg-green-100 text-green-800' },
  { value: 'maintenance', label: 'রক্ষণাবেক্ষণ', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'inactive', label: 'নিষ্ক্রিয়', color: 'bg-red-100 text-red-800' }
];

export default function TransportPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('vehicles');
  const [searchText, setSearchText] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [dialogType, setDialogType] = useState<'vehicle' | 'route' | 'assignment'>('vehicle');

  // Fetch transport data from Supabase
  const { data: transportStats } = useQuery({
    queryKey: ['transport-stats'],
    queryFn: async () => {
      const stats = await db.getTransportStats(1);
      return stats;
    },
  });

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['transport-vehicles'],
    queryFn: async () => {
      const data = await db.getTransportVehicles(1);
      return data;
    },
  });

  const { data: routes = [], isLoading: routesLoading } = useQuery({
    queryKey: ['transport-routes'],
    queryFn: async () => {
      const data = await db.getTransportRoutes(1);
      return data;
    },
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['transport-assignments'],
    queryFn: async () => {
      const data = await db.getTransportAssignments(1);
      return data;
    },
  });

  // Vehicle form
  const vehicleForm = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicleNumber: '',
      type: '',
      capacity: '',
      driverName: '',
      driverPhone: '',
      status: 'active',
    },
  });

  // Route form
  const routeForm = useForm<RouteFormData>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      routeName: '',
      startPoint: '',
      endPoint: '',
      distance: '',
      estimatedTime: '',
      fare: '',
    },
  });

  // Assignment form
  const assignmentForm = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      vehicleId: '',
      routeId: '',
      startTime: '',
      endTime: '',
      isActive: true,
    },
  });

  // Create mutations
  const createVehicle = useMutation({
    mutationFn: async (data: VehicleFormData) => {
      return await db.createTransportVehicle({ ...data, school_id: 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "নতুন গাড়ি যোগ করা হয়েছে",
      });
      setIsAddDialogOpen(false);
      vehicleForm.reset();
    },
  });

  const createRoute = useMutation({
    mutationFn: async (data: RouteFormData) => {
      return await db.createTransportRoute({ ...data, school_id: 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-routes'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "নতুন রুট যোগ করা হয়েছে",
      });
      setIsAddDialogOpen(false);
      routeForm.reset();
    },
  });

  const createAssignment = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      return await db.createTransportAssignment({ ...data, school_id: 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "নতুন অ্যাসাইনমেন্ট যোগ করা হয়েছে",
      });
      setIsAddDialogOpen(false);
      assignmentForm.reset();
    },
  });

  // Update mutations
  const updateVehicle = useMutation({
    mutationFn: ({ id, data }: { id: number; data: VehicleFormData }) => 
      db.updateTransportVehicle(id, { ...data, school_id: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "গাড়ির তথ্য আপডেট করা হয়েছে",
      });
      setEditingItem(null);
      setIsAddDialogOpen(false);
    },
  });

  const updateRoute = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RouteFormData }) => 
      db.updateTransportRoute(id, { ...data, school_id: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-routes'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "রুটের তথ্য আপডেট করা হয়েছে",
      });
      setEditingItem(null);
      setIsAddDialogOpen(false);
    },
  });

  const updateAssignment = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AssignmentFormData }) => 
      db.updateTransportAssignment(id, { ...data, school_id: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "অ্যাসাইনমেন্ট আপডেট করা হয়েছে",
      });
      setEditingItem(null);
      setIsAddDialogOpen(false);
    },
  });

  // Delete mutations
  const deleteVehicle = useMutation({
    mutationFn: (id: number) => 
      db.deleteTransportVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "গাড়ি মুছে ফেলা হয়েছে",
      });
    },
  });

  const deleteRoute = useMutation({
    mutationFn: (id: number) => 
      db.deleteTransportRoute(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-routes'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "রুট মুছে ফেলা হয়েছে",
      });
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: (id: number) => 
      db.deleteTransportAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "অ্যাসাইনমেন্ট মুছে ফেলা হয়েছে",
      });
    },
  });

  const handleAdd = (type: 'vehicle' | 'route' | 'assignment') => {
    setDialogType(type);
    setEditingItem(null);
    vehicleForm.reset();
    routeForm.reset();
    assignmentForm.reset();
    setIsAddDialogOpen(true);
  };

  const handleEdit = (item: any, type: 'vehicle' | 'route' | 'assignment') => {
    setDialogType(type);
    setEditingItem(item);
    
    if (type === 'vehicle') {
      vehicleForm.reset({
        vehicleNumber: item.vehicleNumber || '',
        type: item.type || '',
        capacity: item.capacity?.toString() || '',
        driverName: item.driverName || '',
        driverPhone: item.driverPhone || '',
        status: item.status || 'active',
      });
    } else if (type === 'route') {
      routeForm.reset({
        routeName: item.routeName || '',
        startPoint: item.startPoint || '',
        endPoint: item.endPoint || '',
        distance: item.distance?.toString() || '',
        estimatedTime: item.estimatedTime || '',
        fare: item.fare?.toString() || '',
      });
    } else if (type === 'assignment') {
      assignmentForm.reset({
        vehicleId: item.vehicleId?.toString() || '',
        routeId: item.routeId?.toString() || '',
        startTime: item.startTime || '',
        endTime: item.endTime || '',
        isActive: item.isActive ?? true,
      });
    }
    
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: number, type: 'vehicle' | 'route' | 'assignment') => {
    if (confirm('আপনি কি নিশ্চিত যে এটি মুছে ফেলতে চান?')) {
      if (type === 'vehicle') deleteVehicle.mutate(id);
      else if (type === 'route') deleteRoute.mutate(id);
      else if (type === 'assignment') deleteAssignment.mutate(id);
    }
  };

  const onVehicleSubmit = (data: VehicleFormData) => {
    if (editingItem) {
      updateVehicle.mutate({ id: editingItem.id, data });
    } else {
      createVehicle.mutate(data);
    }
  };

  const onRouteSubmit = (data: RouteFormData) => {
    if (editingItem) {
      updateRoute.mutate({ id: editingItem.id, data });
    } else {
      createRoute.mutate(data);
    }
  };

  const onAssignmentSubmit = (data: AssignmentFormData) => {
    if (editingItem) {
      updateAssignment.mutate({ id: editingItem.id, data });
    } else {
      createAssignment.mutate(data);
    }
  };

  const filteredVehicles = Array.isArray(vehicles) ? vehicles.filter((vehicle: any) =>
    vehicle.vehicleNumber?.toLowerCase().includes(searchText.toLowerCase()) ||
    vehicle.driverName?.toLowerCase().includes(searchText.toLowerCase())
  ) : [];

  const filteredRoutes = Array.isArray(routes) ? routes.filter((route: any) =>
    route.routeName?.toLowerCase().includes(searchText.toLowerCase()) ||
    route.startPoint?.toLowerCase().includes(searchText.toLowerCase()) ||
    route.endPoint?.toLowerCase().includes(searchText.toLowerCase())
  ) : [];

  const filteredAssignments = Array.isArray(assignments) ? assignments.filter((assignment: any) =>
    assignment.vehicle?.vehicleNumber?.toLowerCase().includes(searchText.toLowerCase()) ||
    assignment.route?.routeName?.toLowerCase().includes(searchText.toLowerCase())
  ) : [];

  if (vehiclesLoading || routesLoading || assignmentsLoading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">পরিবহন তথ্য লোড হচ্ছে...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">পরিবহন ব্যবস্থাপনা</h1>
            <p className="text-gray-600 mt-2">গাড়ি, রুট এবং অ্যাসাইনমেন্ট পরিচালনা করুন</p>
          </div>
        </div>

        {/* Stats Cards */}
        {transportStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">মোট গাড়ি</CardTitle>
                <Bus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{transportStats.totalVehicles || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">সক্রিয় গাড়ি</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{transportStats.activeVehicles || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">মোট রুট</CardTitle>
                <Route className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{transportStats.totalRoutes || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">অ্যাসাইনমেন্ট</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{transportStats.totalAssignments || 0}</div>
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
                    placeholder="গাড়ির নম্বর, চালক বা রুট দিয়ে খুঁজুন..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                এক্সপোর্ট
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="vehicles">গাড়ি ({filteredVehicles.length})</TabsTrigger>
            <TabsTrigger value="routes">রুট ({filteredRoutes.length})</TabsTrigger>
            <TabsTrigger value="assignments">অ্যাসাইনমেন্ট ({filteredAssignments.length})</TabsTrigger>
          </TabsList>

          {/* Vehicles Tab */}
          <TabsContent value="vehicles">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>গাড়ির তালিকা</CardTitle>
                  <Button onClick={() => handleAdd('vehicle')}>
                    <Plus className="w-4 h-4 mr-2" />
                    নতুন গাড়ি যোগ করুন
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>গাড়ির নম্বর</TableHead>
                      <TableHead>ধরন</TableHead>
                      <TableHead>ধারণক্ষমতা</TableHead>
                      <TableHead>চালক</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>কার্যক্রম</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVehicles.map((vehicle: any) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">{vehicle.vehicleNumber}</TableCell>
                        <TableCell>{vehicle.type}</TableCell>
                        <TableCell>{vehicle.capacity} জন</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{vehicle.driverName}</div>
                            <div className="text-sm text-gray-500">{vehicle.driverPhone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={vehicleStatuses.find(s => s.value === vehicle.status)?.color || 'bg-gray-100 text-gray-800'}>
                            {vehicleStatuses.find(s => s.value === vehicle.status)?.label || vehicle.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(vehicle, 'vehicle')}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(vehicle.id, 'vehicle')}
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
                
                {filteredVehicles.length === 0 && (
                  <div className="text-center py-12">
                    <Bus className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">কোনো গাড়ি পাওয়া যায়নি</h3>
                    <p className="mt-1 text-sm text-gray-500">নতুন গাড়ি যোগ করুন বা ফিল্টার পরিবর্তন করুন।</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Routes Tab */}
          <TabsContent value="routes">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>রুটের তালিকা</CardTitle>
                  <Button onClick={() => handleAdd('route')}>
                    <Plus className="w-4 h-4 mr-2" />
                    নতুন রুট যোগ করুন
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>রুটের নাম</TableHead>
                      <TableHead>শুরু - শেষ</TableHead>
                      <TableHead>দূরত্ব</TableHead>
                      <TableHead>সময়</TableHead>
                      <TableHead>ভাড়া</TableHead>
                      <TableHead>কার্যক্রম</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoutes.map((route: any) => (
                      <TableRow key={route.id}>
                        <TableCell className="font-medium">{route.routeName}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1 text-green-600" />
                            {route.startPoint}
                            <span className="mx-2">→</span>
                            <MapPin className="w-4 h-4 mr-1 text-red-600" />
                            {route.endPoint}
                          </div>
                        </TableCell>
                        <TableCell>{route.distance} কিমি</TableCell>
                        <TableCell>{route.estimatedTime}</TableCell>
                        <TableCell>৳{route.fare}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(route, 'route')}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(route.id, 'route')}
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
                
                {filteredRoutes.length === 0 && (
                  <div className="text-center py-12">
                    <Route className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">কোনো রুট পাওয়া যায়নি</h3>
                    <p className="mt-1 text-sm text-gray-500">নতুন রুট যোগ করুন বা ফিল্টার পরিবর্তন করুন।</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>অ্যাসাইনমেন্টের তালিকা</CardTitle>
                  <Button onClick={() => handleAdd('assignment')}>
                    <Plus className="w-4 h-4 mr-2" />
                    নতুন অ্যাসাইনমেন্ট যোগ করুন
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>গাড়ি</TableHead>
                      <TableHead>রুট</TableHead>
                      <TableHead>সময়সূচী</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>কার্যক্রম</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssignments.map((assignment: any) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.vehicle?.vehicleNumber}</div>
                            <div className="text-sm text-gray-500">{assignment.vehicle?.driverName}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.route?.routeName}</div>
                            <div className="text-sm text-gray-500">
                              {assignment.route?.startPoint} → {assignment.route?.endPoint}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{assignment.startTime} - {assignment.endTime}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={assignment.isActive ? "default" : "secondary"}>
                            {assignment.isActive ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                সক্রিয়
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3 mr-1" />
                                নিষ্ক্রিয়
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(assignment, 'assignment')}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(assignment.id, 'assignment')}
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
                
                {filteredAssignments.length === 0 && (
                  <div className="text-center py-12">
                    <Settings className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">কোনো অ্যাসাইনমেন্ট পাওয়া যায়নি</h3>
                    <p className="mt-1 text-sm text-gray-500">নতুন অ্যাসাইনমেন্ট যোগ করুন বা ফিল্টার পরিবর্তন করুন।</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 
                  (dialogType === 'vehicle' ? 'গাড়ির তথ্য সম্পাদনা' : 
                   dialogType === 'route' ? 'রুটের তথ্য সম্পাদনা' : 'অ্যাসাইনমেন্ট সম্পাদনা') :
                  (dialogType === 'vehicle' ? 'নতুন গাড়ি যোগ করুন' : 
                   dialogType === 'route' ? 'নতুন রুট যোগ করুন' : 'নতুন অ্যাসাইনমেন্ট যোগ করুন')
                }
              </DialogTitle>
            </DialogHeader>
            
            {/* Vehicle Form */}
            {dialogType === 'vehicle' && (
              <Form {...vehicleForm}>
                <form onSubmit={vehicleForm.handleSubmit(onVehicleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={vehicleForm.control}
                      name="vehicleNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>গাড়ির নম্বর</FormLabel>
                          <FormControl>
                            <Input placeholder="ঢাকা-মেট্রো-গ-১২৩৪৫৬" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={vehicleForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>গাড়ির ধরন</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="ধরন নির্বাচন করুন" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vehicleTypes.map(type => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={vehicleForm.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ধারণক্ষমতা (জন)</FormLabel>
                        <FormControl>
                          <Input placeholder="৪০" type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={vehicleForm.control}
                      name="driverName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>চালকের নাম</FormLabel>
                          <FormControl>
                            <Input placeholder="আবদুল করিম" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={vehicleForm.control}
                      name="driverPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>চালকের ফোন</FormLabel>
                          <FormControl>
                            <Input placeholder="01XXXXXXXXX" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={vehicleForm.control}
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
                            {vehicleStatuses.map(status => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
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
                    <Button type="submit" disabled={createVehicle.isPending || updateVehicle.isPending}>
                      {createVehicle.isPending || updateVehicle.isPending ? 'সংরক্ষণ করা হচ্ছে...' : 
                       editingItem ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}

            {/* Route Form */}
            {dialogType === 'route' && (
              <Form {...routeForm}>
                <form onSubmit={routeForm.handleSubmit(onRouteSubmit)} className="space-y-4">
                  <FormField
                    control={routeForm.control}
                    name="routeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>রুটের নাম</FormLabel>
                        <FormControl>
                          <Input placeholder="ঢাকা-চট্টগ্রাম রুট" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={routeForm.control}
                      name="startPoint"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>শুরুর পয়েন্ট</FormLabel>
                          <FormControl>
                            <Input placeholder="ঢাকা" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={routeForm.control}
                      name="endPoint"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>শেষ পয়েন্ট</FormLabel>
                          <FormControl>
                            <Input placeholder="চট্টগ্রাম" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={routeForm.control}
                      name="distance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>দূরত্ব (কিমি)</FormLabel>
                          <FormControl>
                            <Input placeholder="২৫০" type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={routeForm.control}
                      name="estimatedTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>আনুমানিক সময়</FormLabel>
                          <FormControl>
                            <Input placeholder="৫ ঘন্টা" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={routeForm.control}
                      name="fare"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ভাড়া (টাকা)</FormLabel>
                          <FormControl>
                            <Input placeholder="৫০০" type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      বাতিল
                    </Button>
                    <Button type="submit" disabled={createRoute.isPending || updateRoute.isPending}>
                      {createRoute.isPending || updateRoute.isPending ? 'সংরক্ষণ করা হচ্ছে...' : 
                       editingItem ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}

            {/* Assignment Form */}
            {dialogType === 'assignment' && (
              <Form {...assignmentForm}>
                <form onSubmit={assignmentForm.handleSubmit(onAssignmentSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={assignmentForm.control}
                      name="vehicleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>গাড়ি নির্বাচন</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="গাড়ি নির্বাচন করুন" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vehicles.map((vehicle: any) => (
                                <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                  {vehicle.vehicleNumber} - {vehicle.type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={assignmentForm.control}
                      name="routeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>রুট নির্বাচন</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="রুট নির্বাচন করুন" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {routes.map((route: any) => (
                                <SelectItem key={route.id} value={route.id.toString()}>
                                  {route.routeName}
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
                      control={assignmentForm.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>শুরুর সময়</FormLabel>
                          <FormControl>
                            <Input placeholder="০৮:০০" type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={assignmentForm.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>শেষ সময়</FormLabel>
                          <FormControl>
                            <Input placeholder="১৭:০০" type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      বাতিল
                    </Button>
                    <Button type="submit" disabled={createAssignment.isPending || updateAssignment.isPending}>
                      {createAssignment.isPending || updateAssignment.isPending ? 'সংরক্ষণ করা হচ্ছে...' : 
                       editingItem ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}