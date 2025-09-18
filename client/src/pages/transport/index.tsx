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
  Bus, 
  Plus, 
  MapPin, 
  Clock,
  Users,
  Edit,
  Eye,
  Route,
  Navigation,
  AlertTriangle,
  CheckCircle,
  Phone,
  Car,
  Fuel,
  Settings,
  Calendar,
  Download
} from 'lucide-react';
import { format } from 'date-fns';

// Enhanced schemas following world-class UX principles
const vehicleSchema = z.object({
  vehicleNumber: z.string().min(1, 'গাড়ির নম্বর প্রয়োজন'),
  type: z.string().min(1, 'গাড়ির ধরন নির্বাচন করুন'),
  capacity: z.number().min(1, 'ধারণক্ষমতা প্রয়োজন'),
  driverName: z.string().min(1, 'চালকের নাম প্রয়োজন'),
  driverPhone: z.string().min(1, 'চালকের ফোন নম্বর প্রয়োজন'),
  helperName: z.string().optional(),
  helperPhone: z.string().optional(),
  routeId: z.string().optional(),
  isActive: z.boolean().default(true),
});

const routeSchema = z.object({
  name: z.string().min(1, 'রুটের নাম প্রয়োজন'),
  description: z.string().optional(),
  startPoint: z.string().min(1, 'শুরুর স্থান প্রয়োজন'),
  endPoint: z.string().min(1, 'শেষের স্থান প্রয়োজন'),
  distance: z.number().min(0, 'দূরত্ব ০ বা তার বেশি হতে হবে'),
  estimatedTime: z.number().min(0, 'সময় ০ বা তার বেশি হতে হবে'),
  fare: z.number().min(0, 'ভাড়া ০ বা তার বেশি হতে হবে'),
  stops: z.array(z.string()).optional(),
});

const studentTransportSchema = z.object({
  studentId: z.string().min(1, 'শিক্ষার্থী নির্বাচন করুন'),
  routeId: z.string().min(1, 'রুট নির্বাচন করুন'),
  pickupStop: z.string().min(1, 'পিক-আপ স্টপ প্রয়োজন'),
  dropStop: z.string().min(1, 'ড্রপ স্টপ প্রয়োজন'),
  monthlyFee: z.number().min(0, 'মাসিক ফি প্রয়োজন'),
  isActive: z.boolean().default(true),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;
type RouteFormData = z.infer<typeof routeSchema>;
type StudentTransportFormData = z.infer<typeof studentTransportSchema>;

export default function TransportPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isAddRouteOpen, setIsAddRouteOpen] = useState(false);
  const [isAssignStudentOpen, setIsAssignStudentOpen] = useState(false);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
  const [isEditRouteOpen, setIsEditRouteOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [editingRoute, setEditingRoute] = useState<any>(null);

  // Enhanced form handling following Luke Wroblewski's principles
  const vehicleForm = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicleNumber: '',
      type: '',
      capacity: 0,
      driverName: '',
      driverPhone: '',
      helperName: '',
      helperPhone: '',
      routeId: '',
      isActive: true,
    },
  });

  const routeForm = useForm<RouteFormData>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: '',
      description: '',
      startPoint: '',
      endPoint: '',
      distance: 0,
      estimatedTime: 0,
      fare: 0,
      stops: [],
    },
  });

  const studentTransportForm = useForm<StudentTransportFormData>({
    resolver: zodResolver(studentTransportSchema),
    defaultValues: {
      studentId: '',
      routeId: '',
      pickupStop: '',
      dropStop: '',
      monthlyFee: 0,
      isActive: true,
    },
  });

  // Real-time data queries
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['transport-vehicles'],
    queryFn: async () => await db.getTransportVehicles(1),
    refetchInterval: 30000,
  });

  const { data: routes = [], isLoading: routesLoading } = useQuery({
    queryKey: ['transport-routes'],
    queryFn: async () => await db.getTransportRoutes(1),
    refetchInterval: 30000,
  });

  const { data: transportStats = {} } = useQuery({
    queryKey: ['transport-stats'],
    queryFn: async () => await db.getTransportStats(1),
    refetchInterval: 60000,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => await db.getStudents(1),
  });

  const { data: studentTransport = [] } = useQuery({
    queryKey: ['transport-students'],
    queryFn: async () => await db.getTransportAssignments(1),
    refetchInterval: 30000,
  });

  // Edit vehicle function
  const handleEditVehicle = (vehicle: any) => {
    setEditingVehicle(vehicle);
    vehicleForm.reset({
      vehicleNumber: vehicle.vehicleNumber,
      type: vehicle.type,
      capacity: vehicle.capacity,
      driverName: vehicle.driverName,
      driverPhone: vehicle.driverPhone,
      helperName: vehicle.helperName || '',
      helperPhone: vehicle.helperPhone || '',
      routeId: vehicle.routeId?.toString() || '',
      isActive: vehicle.isActive,
    });
    setIsEditVehicleOpen(true);
  };

  // Edit route function
  const handleEditRoute = (route: any) => {
    setEditingRoute(route);
    routeForm.reset({
      name: route.routeName || route.name,
      description: route.description || '',
      startPoint: route.startPoint || '',
      endPoint: route.endPoint || '',
      distance: route.distance || 0,
      estimatedTime: route.estimatedTime || 0,
      fare: route.monthlyFee || route.fare || 0,
      stops: (typeof route.pickupPoints === 'string' && route.pickupPoints) ? route.pickupPoints.split(', ') : [],
    });
    setIsEditRouteOpen(true);
  };

  // Mutations for CRUD operations
  const addVehicleMutation = useMutation({
    mutationFn: (data: VehicleFormData) => db.createTransportVehicle({ ...data, school_id: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      setIsAddVehicleOpen(false);
      vehicleForm.reset();
      toast({
        title: "সফল",
        description: "নতুন গাড়ি সংযোজিত হয়েছে",
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "গাড়ি সংযোজনে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  const addRouteMutation = useMutation({
    mutationFn: (data: RouteFormData) => db.createTransportRoute({ ...data, school_id: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-routes'] });
      setIsAddRouteOpen(false);
      routeForm.reset();
      toast({
        title: "সফল",
        description: "নতুন রুট সংযোজিত হয়েছে",
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "রুট সংযোজনে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  const assignStudentMutation = useMutation({
    mutationFn: (data: StudentTransportFormData) => db.createTransportAssignment({ ...data, school_id: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-students'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      setIsAssignStudentOpen(false);
      studentTransportForm.reset();
      toast({
        title: "সফল",
        description: "শিক্ষার্থী পরিবহনে নিযুক্ত করা হয়েছে",
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "শিক্ষার্থী নিযুক্তিতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  // Edit vehicle mutation
  const editVehicleMutation = useMutation({
    mutationFn: (data: VehicleFormData) => 
      db.updateTransportVehicle(editingVehicle?.id, { ...data, school_id: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      setIsEditVehicleOpen(false);
      setEditingVehicle(null);
      vehicleForm.reset();
      toast({
        title: "সফল",
        description: "গাড়ির তথ্য সম্পাদিত হয়েছে",
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "গাড়ির তথ্য সম্পাদনে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  // Edit route mutation
  const editRouteMutation = useMutation({
    mutationFn: (data: RouteFormData) => 
      db.updateTransportRoute(editingRoute?.id, { ...data, school_id: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-routes'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      setIsEditRouteOpen(false);
      setEditingRoute(null);
      routeForm.reset();
      toast({
        title: "সফল",
        description: "রুটের তথ্য সম্পাদিত হয়েছে",
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "রুটের তথ্য সম্পাদনে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  // Enhanced filtering following Steve Krug's usability principles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      const matchesSearch = searchQuery === '' || 
        vehicle.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.driverName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && vehicle.isActive) ||
        (statusFilter === 'inactive' && !vehicle.isActive);
      
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchQuery, statusFilter]);

  // Enhanced accessibility following WCAG guidelines
  const handleKeyboardNavigation = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Summary Cards - Following Jonathan Ive's design clarity */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bus className="h-4 w-4 text-blue-600" />
              মোট গাড়ি
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {vehicles.length || 0}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {transportStats.active_vehicles || 0} টি সক্রিয়
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Route className="h-4 w-4 text-green-600" />
              রুট সমূহ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {routes.length || 0}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {transportStats.total_routes || 0} টি সক্রিয়
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              পরিবহন শিক্ষার্থী
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {transportStats.student_assignments || 0}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              শিক্ষার্থী পরিবহন
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Fuel className="h-4 w-4 text-orange-600" />
              মাসিক আয়
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              ৳ {(0).toLocaleString()}
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              এই মাসে
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Route Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              জনপ্রিয় রুট
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {routes.slice(0, 5).map((route) => (
                <div key={route.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium">{route.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {route.startPoint} → {route.endPoint}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">৳ {route.fare}</p>
                    <p className="text-xs text-gray-500">{route.distance} কিমি</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5" />
              গাড়ির অবস্থা
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vehicles.slice(0, 5).map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${vehicle.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="font-medium">{vehicle.vehicleNumber}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{vehicle.driverName}</p>
                    </div>
                  </div>
                  <Badge variant={vehicle.isActive ? "default" : "destructive"}>
                    {vehicle.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderVehicles = () => (
    <div className="space-y-6">
      {/* Enhanced Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-center flex-1">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="গাড়ি খুঁজুন (নম্বর, চালক)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="গাড়ি অনুসন্ধান"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="অবস্থা নির্বাচন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব অবস্থা</SelectItem>
              <SelectItem value="active">সক্রিয়</SelectItem>
              <SelectItem value="inactive">নিষ্ক্রিয়</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              নতুন গাড়ি
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>নতুন গাড়ি সংযোজন</DialogTitle>
              <DialogDescription>
                পরিবহন বহরে নতুন গাড়ি যোগ করুন
              </DialogDescription>
            </DialogHeader>
            <Form {...vehicleForm}>
              <form onSubmit={vehicleForm.handleSubmit((data) => addVehicleMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={vehicleForm.control}
                    name="vehicleNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>গাড়ির নম্বর</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ঢাকা মেট্রো-গ-১২৩৪" />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="গাড়ির ধরন নির্বাচন করুন" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="bus">বাস</SelectItem>
                            <SelectItem value="microbus">মাইক্রোবাস</SelectItem>
                            <SelectItem value="van">ভ্যান</SelectItem>
                            <SelectItem value="car">গাড়ি</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={vehicleForm.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ধারণক্ষমতা</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            placeholder="৩০"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={vehicleForm.control}
                    name="routeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>রুট (ঐচ্ছিক)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="রুট নির্বাচন করুন" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {routes.map((route) => (
                              <SelectItem key={route.id} value={route.id}>
                                {route.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={vehicleForm.control}
                    name="driverName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>চালকের নাম</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="মোহাম্মদ আলী" />
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
                          <Input {...field} placeholder="০১৭১২৩৪৫৬৭৮" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddVehicleOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit" disabled={addVehicleMutation.isPending}>
                    {addVehicleMutation.isPending ? 'সংরক্ষণ করা হচ্ছে...' : 'সংরক্ষণ করুন'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Vehicles Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>গাড়ির নম্বর</TableHead>
                <TableHead>ধরন</TableHead>
                <TableHead>ধারণক্ষমতা</TableHead>
                <TableHead>চালক</TableHead>
                <TableHead>রুট</TableHead>
                <TableHead>অবস্থা</TableHead>
                <TableHead className="text-right">কার্যক্রম</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehiclesLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    লোড হচ্ছে...
                  </TableCell>
                </TableRow>
              ) : filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    কোনো গাড়ি পাওয়া যায়নি
                  </TableCell>
                </TableRow>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">{vehicle.vehicleNumber}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{vehicle.type}</Badge>
                    </TableCell>
                    <TableCell>{vehicle.capacity} জন</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{vehicle.driverName}</p>
                        <p className="text-sm text-gray-600">{vehicle.driverPhone}</p>
                      </div>
                    </TableCell>
                    <TableCell>{vehicle.route?.name || 'বরাদ্দ নেই'}</TableCell>
                    <TableCell>
                      <Badge variant={vehicle.isActive ? "default" : "destructive"}>
                        {vehicle.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditVehicle(vehicle)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Routes management render function
  const renderRoutes = () => (
    <div className="space-y-6">
      {/* Routes Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">রুট ব্যবস্থাপনা</h2>
          <p className="text-gray-600">পরিবহন রুট সমূহ পরিচালনা করুন</p>
        </div>
        <Button onClick={() => setIsAddRouteOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          নতুন রুট
        </Button>
      </div>

      {/* Routes List */}
      <Card>
        <CardHeader>
          <CardTitle>রুট তালিকা</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>রুটের নাম</TableHead>
                <TableHead>শুরুর স্থান</TableHead>
                <TableHead>শেষের স্থান</TableHead>
                <TableHead>দূরত্ব</TableHead>
                <TableHead>মাসিক ভাড়া</TableHead>
                <TableHead>স্টপ সমূহ</TableHead>
                <TableHead className="text-right">কার্যক্রম</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routesLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    লোড হচ্ছে...
                  </TableCell>
                </TableRow>
              ) : routes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    কোনো রুট পাওয়া যায়নি
                  </TableCell>
                </TableRow>
              ) : (
                routes.map((route: any) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">
                      {route.routeName || route.name}
                    </TableCell>
                    <TableCell>{route.startPoint || 'নির্ধারিত নয়'}</TableCell>
                    <TableCell>{route.endPoint || 'নির্ধারিত নয়'}</TableCell>
                    <TableCell>{route.distance || 0} কিমি</TableCell>
                    <TableCell>৳{route.monthlyFee || route.fare || 0}</TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {(typeof route.pickupPoints === 'string' && route.pickupPoints) ? (
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              // Clean up PostgreSQL array format: {Wari,Paltan,Shantinagar} -> ["Wari", "Paltan", "Shantinagar"]
                              let stops = [];
                              if (typeof route.pickupPoints === 'string' && route.pickupPoints.startsWith('{') && route.pickupPoints.endsWith('}')) {
                                // PostgreSQL array format
                                stops = route.pickupPoints.slice(1, -1).split(',').map((s: string) => s.trim());
                              } else if (typeof route.pickupPoints === 'string') {
                                // Regular comma-separated format
                                stops = route.pickupPoints.split(',').map((s: string) => s.trim());
                              }
                              
                              return (
                                <>
                                  {stops.slice(0, 2).map((stop: string, index: number) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {stop}
                                    </Badge>
                                  ))}
                                  {stops.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{stops.length - 2} আরো
                                    </Badge>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <span className="text-gray-500">কোনো স্টপ নেই</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditRoute(route)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Students transport management render function
  const renderStudents = () => (
    <div className="space-y-6">
      {/* Students Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">শিক্ষার্থী পরিবহন</h2>
          <p className="text-gray-600">শিক্ষার্থীদের পরিবহন বরাদ্দ পরিচালনা করুন</p>
        </div>
        <Button onClick={() => setIsAssignStudentOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          নতুন বরাদ্দ
        </Button>
      </div>

      {/* Student Assignments List */}
      <Card>
        <CardHeader>
          <CardTitle>শিক্ষার্থী বরাদ্দ তালিকা</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>শিক্ষার্থীর নাম</TableHead>
                <TableHead>শ্রেণি</TableHead>
                <TableHead>রুট</TableHead>
                <TableHead>পিক-আপ স্টপ</TableHead>
                <TableHead>ড্রপ স্টপ</TableHead>
                <TableHead>মাসিক ফি</TableHead>
                <TableHead>অবস্থা</TableHead>
                <TableHead className="text-right">কার্যক্রম</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentTransport.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-4">
                      <Users className="h-12 w-12 text-gray-400" />
                      <div>
                        <p className="text-lg font-medium">কোনো শিক্ষার্থী বরাদ্দ নেই</p>
                        <p className="text-gray-500">প্রথম শিক্ষার্থী বরাদ্দ করতে "নতুন বরাদ্দ" বাটনে ক্লিক করুন</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                studentTransport.map((assignment: any) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.student_name || assignment.studentName}
                    </TableCell>
                    <TableCell>
                      {assignment.class && assignment.section ? 
                        `${assignment.class}-${assignment.section}` : 
                        'নির্ধারিত নয়'}
                    </TableCell>
                    <TableCell>
                      {assignment.route_name || assignment.routeName || 'নির্ধারিত নয়'}
                    </TableCell>
                    <TableCell>
                      {assignment.pickup_point || assignment.pickupPoint || 'নির্ধারিত নয়'}
                    </TableCell>
                    <TableCell>
                      {assignment.drop_point || assignment.dropPoint || 'নির্ধারিত নয়'}
                    </TableCell>
                    <TableCell>৳{assignment.monthly_fee || assignment.monthlyFee || 0}</TableCell>
                    <TableCell>
                      <Badge variant={assignment.is_active !== false ? "default" : "destructive"}>
                        {assignment.is_active !== false ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AppShell>
      <ResponsivePageLayout
        title="পরিবহন ব্যবস্থাপনা"
        description="স্কুল বাস ও পরিবহন সেবা পরিচালনা"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">ড্যাশবোর্ড</TabsTrigger>
            <TabsTrigger value="vehicles">গাড়ি সমূহ</TabsTrigger>
            <TabsTrigger value="routes">রুট সমূহ</TabsTrigger>
            <TabsTrigger value="students">শিক্ষার্থী</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {renderDashboard()}
          </TabsContent>

          <TabsContent value="vehicles" className="space-y-6">
            {renderVehicles()}
          </TabsContent>

          <TabsContent value="routes" className="space-y-6">
            {renderRoutes()}
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            {renderStudents()}
          </TabsContent>
        </Tabs>

        {/* Edit Vehicle Dialog */}
        <Dialog open={isEditVehicleOpen} onOpenChange={setIsEditVehicleOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>গাড়ির তথ্য সম্পাদনা</DialogTitle>
              <DialogDescription>
                গাড়ির তথ্য আপডেট করুন
              </DialogDescription>
            </DialogHeader>
            <Form {...vehicleForm}>
              <form onSubmit={vehicleForm.handleSubmit((data) => editVehicleMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={vehicleForm.control}
                  name="vehicleNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>গাড়ির নম্বর</FormLabel>
                      <FormControl>
                        <Input placeholder="ঢাকা মেট্রো গ ১২৩৪৫৬" {...field} />
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
                            <SelectValue placeholder="গাড়ির ধরন নির্বাচন করুন" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="বাস">বাস</SelectItem>
                          <SelectItem value="মিনিবাস">মিনিবাস</SelectItem>
                          <SelectItem value="মাইক্রোবাস">মাইক্রোবাস</SelectItem>
                          <SelectItem value="ভ্যান">ভ্যান</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={vehicleForm.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>আসন সংখ্যা</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="৩০" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={vehicleForm.control}
                  name="driverName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>চালকের নাম</FormLabel>
                      <FormControl>
                        <Input placeholder="মোহাম্মদ আলী" {...field} />
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
                        <Input placeholder="০১৭১২৩৪৫৬৭৮" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditVehicleOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit" disabled={editVehicleMutation.isPending}>
                    {editVehicleMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Route Dialog */}
        <Dialog open={isEditRouteOpen} onOpenChange={setIsEditRouteOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>রুটের তথ্য সম্পাদনা</DialogTitle>
              <DialogDescription>
                রুটের তথ্য আপডেট করুন
              </DialogDescription>
            </DialogHeader>
            <Form {...routeForm}>
              <form onSubmit={routeForm.handleSubmit((data) => editRouteMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={routeForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>রুটের নাম</FormLabel>
                      <FormControl>
                        <Input placeholder="ধানমন্ডি - উত্তরা" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={routeForm.control}
                  name="startPoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>শুরুর স্থান</FormLabel>
                      <FormControl>
                        <Input placeholder="ধানমন্ডি" {...field} />
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
                      <FormLabel>শেষের স্থান</FormLabel>
                      <FormControl>
                        <Input placeholder="উত্তরা" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={routeForm.control}
                  name="distance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>দূরত্ব (কিমি)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="১৫" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
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
                      <FormLabel>মাসিক ভাড়া (টাকা)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="২০০০" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditRouteOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit" disabled={editRouteMutation.isPending}>
                    {editRouteMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Add Vehicle Dialog */}
        <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>নতুন গাড়ি যোগ করুন</DialogTitle>
              <DialogDescription>
                নতুন পরিবহন গাড়ি নিবন্ধন করুন
              </DialogDescription>
            </DialogHeader>
            <Form {...vehicleForm}>
              <form onSubmit={vehicleForm.handleSubmit((data) => addVehicleMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={vehicleForm.control}
                  name="vehicleNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>গাড়ির নম্বর</FormLabel>
                      <FormControl>
                        <Input placeholder="ঢাকা মেট্রো গ ১২৩৪৫৬" {...field} />
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
                            <SelectValue placeholder="গাড়ির ধরন নির্বাচন করুন" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="বাস">বাস</SelectItem>
                          <SelectItem value="মিনিবাস">মিনিবাস</SelectItem>
                          <SelectItem value="মাইক্রোবাস">মাইক্রোবাস</SelectItem>
                          <SelectItem value="ভ্যান">ভ্যান</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={vehicleForm.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>আসন সংখ্যা</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="৩০" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={vehicleForm.control}
                  name="driverName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>চালকের নাম</FormLabel>
                      <FormControl>
                        <Input placeholder="মোহাম্মদ আলী" {...field} />
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
                        <Input placeholder="০১৭১২৩৪৫৬৭৮" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={vehicleForm.control}
                  name="routeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>রুট বরাদ্দ (ঐচ্ছিক)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="রুট নির্বাচন করুন" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">কোনো রুট নয়</SelectItem>
                          {routes.map((route: any) => (
                            <SelectItem key={route.id} value={route.id.toString()}>
                              {route.routeName || route.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddVehicleOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit" disabled={addVehicleMutation.isPending}>
                    {addVehicleMutation.isPending ? 'যোগ হচ্ছে...' : 'যোগ করুন'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Add Route Dialog */}
        <Dialog open={isAddRouteOpen} onOpenChange={setIsAddRouteOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>নতুন রুট যোগ করুন</DialogTitle>
              <DialogDescription>
                নতুন পরিবহন রুট তৈরি করুন
              </DialogDescription>
            </DialogHeader>
            <Form {...routeForm}>
              <form onSubmit={routeForm.handleSubmit((data) => addRouteMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={routeForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>রুটের নাম</FormLabel>
                      <FormControl>
                        <Input placeholder="ধানমন্ডি - উত্তরা" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={routeForm.control}
                  name="startPoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>শুরুর স্থান</FormLabel>
                      <FormControl>
                        <Input placeholder="ধানমন্ডি" {...field} />
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
                      <FormLabel>শেষের স্থান</FormLabel>
                      <FormControl>
                        <Input placeholder="উত্তরা" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={routeForm.control}
                  name="distance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>দূরত্ব (কিমি)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="১৫" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
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
                      <FormLabel>মাসিক ভাড়া (টাকা)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="২০০০" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddRouteOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit" disabled={addRouteMutation.isPending}>
                    {addRouteMutation.isPending ? 'যোগ হচ্ছে...' : 'যোগ করুন'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Assign Student Dialog */}
        <Dialog open={isAssignStudentOpen} onOpenChange={setIsAssignStudentOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>শিক্ষার্থী পরিবহন বরাদ্দ</DialogTitle>
              <DialogDescription>
                শিক্ষার্থীকে পরিবহন রুটে বরাদ্দ করুন
              </DialogDescription>
            </DialogHeader>
            <Form {...studentTransportForm}>
              <form onSubmit={studentTransportForm.handleSubmit((data) => assignStudentMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={studentTransportForm.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>শিক্ষার্থী নির্বাচন করুন</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="শিক্ষার্থী নির্বাচন করুন" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students.map((student: any) => (
                            <SelectItem key={student.id} value={student.id.toString()}>
                              {student.name} - {student.class || 'অজানা'} শ্রেণি
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={studentTransportForm.control}
                  name="routeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>রুট নির্বাচন করুন</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="রুট নির্বাচন করুন" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {routes.map((route: any) => (
                            <SelectItem key={route.id} value={route.id.toString()}>
                              {route.routeName || route.name} - ৳{route.monthlyFee || route.fare || 0}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={studentTransportForm.control}
                  name="pickupStop"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>পিক-আপ স্টপ</FormLabel>
                      <FormControl>
                        <Input placeholder="উত্তরা সেক্টর ৭" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={studentTransportForm.control}
                  name="dropStop"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ড্রপ স্টপ</FormLabel>
                      <FormControl>
                        <Input placeholder="স্কুল গেট" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={studentTransportForm.control}
                  name="monthlyFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>মাসিক ফি (টাকা)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="২০০০" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAssignStudentOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit" disabled={assignStudentMutation.isPending}>
                    {assignStudentMutation.isPending ? 'বরাদ্দ হচ্ছে...' : 'বরাদ্দ করুন'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      </ResponsivePageLayout>
    </AppShell>
  );
}