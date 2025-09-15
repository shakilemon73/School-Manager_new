import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';
import { 
  Users, 
  School, 
  Settings, 
  Shield, 
  Activity,
  UserPlus,
  Building,
  BookOpen,
  CreditCard,
  FileText,
  Calendar,
  UserCheck,
  Truck,
  Search,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';

export default function AdminControlPage() {
  const { toast } = useToast();
  const { user } = useSupabaseDirectAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateSchoolOpen, setIsCreateSchoolOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch system statistics
  const { data: systemStats } = useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  // Fetch all users
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  // Fetch all schools
  const { data: schools } = useQuery({
    queryKey: ['/api/schools'],
    queryFn: async () => {
      const response = await fetch('/api/schools');
      if (!response.ok) throw new Error('Failed to fetch schools');
      return response.json();
    }
  });

  // Feature modules data
  const featureModules = [
    { 
      name: 'Student Management', 
      nameBn: 'শিক্ষার্থী ব্যবস্থাপনা',
      icon: Users,
      enabled: true, 
      usage: '১৫টি স্কুল',
      description: 'Complete student enrollment and record management'
    },
    { 
      name: 'Teacher Management', 
      nameBn: 'শিক্ষক ব্যবস্থাপনা',
      icon: Shield,
      enabled: true, 
      usage: '১৫টি স্কুল',
      description: 'Teacher profiles, qualifications, and assignments'
    },
    { 
      name: 'Attendance System', 
      nameBn: 'উপস্থিতি সিস্টেম',
      icon: UserCheck,
      enabled: true, 
      usage: '১২টি স্কুল',
      description: 'Real-time attendance marking and tracking'
    },
    { 
      name: 'Fee Management', 
      nameBn: 'ফি ব্যবস্থাপনা',
      icon: CreditCard,
      enabled: true, 
      usage: '১০টি স্কুল',
      description: 'Fee collection with mobile banking integration'
    },
    { 
      name: 'Document Generation', 
      nameBn: 'ডকুমেন্ট তৈরি',
      icon: FileText,
      enabled: true, 
      usage: '৮টি স্কুল',
      description: 'ID cards, certificates, and receipts'
    },
    { 
      name: 'Examination System', 
      nameBn: 'পরীক্ষা সিস্টেম',
      icon: Calendar,
      enabled: true, 
      usage: '৭টি স্কুল',
      description: 'Exam scheduling, results, and report cards'
    },
    { 
      name: 'Library Management', 
      nameBn: 'লাইব্রেরি ব্যবস্থাপনা',
      icon: BookOpen,
      enabled: false, 
      usage: '৩টি স্কুল',
      description: 'Book catalog and lending system'
    },
    { 
      name: 'Transportation', 
      nameBn: 'পরিবহন',
      icon: Truck,
      enabled: false, 
      usage: '২টি স্কুল',
      description: 'Vehicle and route management'
    }
  ];

  const handleCreateUser = async (formData: FormData) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.get('username'),
          password: formData.get('password'),
          full_name: formData.get('fullName'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          role: formData.get('role')
        })
      });
      
      if (!response.ok) throw new Error('Failed to create user');
      
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsCreateUserOpen(false);
      toast({ title: "ব্যবহারকারী সফলভাবে তৈরি হয়েছে" });
    } catch (error) {
      toast({ title: "ব্যবহারকারী তৈরি করতে ব্যর্থ", variant: "destructive" });
    }
  };

  return (
    <AppShell>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">প্রশাসনিক নিয়ন্ত্রণ</h1>
            <p className="text-muted-foreground">
              স্কুল ম্যানেজমেন্ট সিস্টেমের সম্পূর্ণ নিয়ন্ত্রণ এবং ব্যবস্থাপনা
            </p>
          </div>
          <Badge variant="destructive" className="px-3 py-1">
            <Shield className="h-4 w-4 mr-1" />
            সুপার অ্যাডমিন
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              ওভারভিউ
            </TabsTrigger>
            <TabsTrigger value="schools" className="flex items-center gap-2">
              <School className="h-4 w-4" />
              স্কুল
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              ব্যবহারকারী
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              ফিচার
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              টেমপ্লেট
            </TabsTrigger>
            <TabsTrigger value="credits" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              ক্রেডিট
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              অ্যানালিটিক্স
            </TabsTrigger>
          </TabsList>

          {/* System Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">মোট স্কুল</CardTitle>
                  <School className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{schools?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    গত মাসে +২টি
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">সক্রিয় ব্যবহারকারী</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    গত সপ্তাহে +১৫%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">সিস্টেম স্বাস্থ্য</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">৯৯.৯%</div>
                  <p className="text-xs text-muted-foreground">
                    এই মাসের আপটাইম
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">সক্রিয় ফিচার</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">৬টি</div>
                  <p className="text-xs text-muted-foreground">
                    ৮টির মধ্যে
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Feature Modules Grid */}
            <Card>
              <CardHeader>
                <CardTitle>ফিচার মডিউল স্ট্যাটাস</CardTitle>
                <CardDescription>
                  সিস্টেমের সকল ফিচার মডিউলের বর্তমান অবস্থা
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featureModules.map((module) => (
                    <div 
                      key={module.name}
                      className="p-4 border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <module.icon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{module.nameBn}</p>
                            <p className="text-xs text-muted-foreground">{module.usage}</p>
                          </div>
                        </div>
                        <Switch checked={module.enabled} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {module.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">ব্যবহারকারী ব্যবস্থাপনা</h2>
                <p className="text-muted-foreground">
                  সিস্টেমের সকল ব্যবহারকারী, ভূমিকা এবং অনুমতি নিয়ন্ত্রণ করুন
                </p>
              </div>
              
              <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    নতুন ব্যবহারকারী
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>নতুন ব্যবহারকারী তৈরি করুন</DialogTitle>
                    <DialogDescription>
                      সিস্টেমে একটি নতুন ব্যবহারকারী যোগ করুন
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateUser(new FormData(e.target));
                  }}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">ব্যবহারকারী নাম</Label>
                          <Input id="username" name="username" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fullName">পূর্ণ নাম</Label>
                          <Input id="fullName" name="fullName" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">ইমেইল</Label>
                          <Input id="email" name="email" type="email" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">ফোন</Label>
                          <Input id="phone" name="phone" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="role">ভূমিকা</Label>
                          <Select name="role" required>
                            <SelectTrigger>
                              <SelectValue placeholder="ভূমিকা নির্বাচন করুন" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">শিক্ষার্থী</SelectItem>
                              <SelectItem value="teacher">শিক্ষক</SelectItem>
                              <SelectItem value="parent">অভিভাবক</SelectItem>
                              <SelectItem value="admin">অ্যাডমিন</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">পাসওয়ার্ড</Label>
                          <Input id="password" name="password" type="password" required />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">তৈরি করুন</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search and Filter */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="search">ব্যবহারকারী খুঁজুন</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="নাম, ইমেইল বা ব্যবহারকারী নাম দিয়ে খুঁজুন..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  সিস্টেম ব্যবহারকারী ({users?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ব্যবহারকারী</TableHead>
                      <TableHead>ভূমিকা</TableHead>
                      <TableHead>যোগাযোগ</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>শেষ লগইন</TableHead>
                      <TableHead>কর্ম</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.full_name}</div>
                            <div className="text-sm text-muted-foreground">@{user.username}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? 'অ্যাডমিন' : 
                             user.role === 'teacher' ? 'শিক্ষক' :
                             user.role === 'student' ? 'শিক্ষার্থী' : 'অভিভাবক'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {user.email && <div>{user.email}</div>}
                            {user.phone && <div className="text-muted-foreground">{user.phone}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            সক্রিয়
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('bn-BD') : 'কখনো নয়'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          ডেটা লোড হচ্ছে...
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schools Management Tab */}
          <TabsContent value="schools" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">স্কুল ব্যবস্থাপনা</h2>
                <p className="text-muted-foreground">
                  সকল শিক্ষা প্রতিষ্ঠান এবং তাদের সেটিংস নিয়ন্ত্রণ করুন
                </p>
              </div>
              
              <Button>
                <Building className="h-4 w-4 mr-2" />
                নতুন স্কুল
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {schools?.map((school) => (
                <Card key={school.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{school.name}</CardTitle>
                    <CardDescription>{school.type}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm"><strong>ঠিকানা:</strong> {school.address}</p>
                      {school.phone && <p className="text-sm"><strong>ফোন:</strong> {school.phone}</p>}
                      {school.email && <p className="text-sm"><strong>ইমেইল:</strong> {school.email}</p>}
                    </div>
                    <Separator className="my-4" />
                    <div className="flex justify-between items-center">
                      <Badge variant="default">সক্রিয়</Badge>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) || (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">ডেটা লোড হচ্ছে...</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Feature Control Tab */}
          <TabsContent value="features" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">ফিচার নিয়ন্ত্রণ</h2>
              <p className="text-muted-foreground">
                প্রতিটি স্কুলের জন্য ফিচার চালু/বন্ধ করুন
              </p>
            </div>

            <div className="grid gap-6">
              {featureModules.map((module) => (
                <Card key={module.name}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <module.icon className="h-6 w-6" />
                        <div>
                          <CardTitle>{module.nameBn}</CardTitle>
                          <CardDescription>{module.description}</CardDescription>
                        </div>
                      </div>
                      <Switch checked={module.enabled} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        বর্তমানে {module.usage} ব্যবহার করছে
                      </span>
                      <Badge variant={module.enabled ? "default" : "secondary"}>
                        {module.enabled ? "সক্রিয়" : "নিষ্ক্রিয়"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Template Management Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">টেমপ্লেট ব্যবস্থাপনা</h2>
                <p className="text-muted-foreground">
                  সকল স্কুলের জন্য ডকুমেন্ট টেমপ্লেট তৈরি এবং নিয়ন্ত্রণ করুন
                </p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                নতুন টেমপ্লেট
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: 'আইডি কার্ড', nameBn: 'ID Card Template', type: 'id_card', schools: 12, status: 'active' },
                { name: 'ফি রিসিট', nameBn: 'Fee Receipt Template', type: 'fee_receipt', schools: 15, status: 'active' },
                { name: 'মার্কশিট', nameBn: 'Marksheet Template', type: 'marksheet', schools: 8, status: 'active' },
                { name: 'সার্টিফিকেট', nameBn: 'Certificate Template', type: 'certificate', schools: 5, status: 'beta' },
                { name: 'অ্যাডমিট কার্ড', nameBn: 'Admit Card Template', type: 'admit_card', schools: 10, status: 'active' },
                { name: 'টেস্টিমনিয়াল', nameBn: 'Testimonial Template', type: 'testimonial', schools: 3, status: 'draft' }
              ].map((template) => (
                <Card key={template.type}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant={template.status === 'active' ? 'default' : template.status === 'beta' ? 'secondary' : 'outline'}>
                        {template.status === 'active' ? 'সক্রিয়' : template.status === 'beta' ? 'বেটা' : 'খসড়া'}
                      </Badge>
                    </div>
                    <CardDescription>{template.nameBn}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>ব্যবহারকারী স্কুল:</span>
                        <span className="font-medium">{template.schools}টি</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>সর্বশেষ আপডেট:</span>
                        <span className="text-muted-foreground">২ দিন আগে</span>
                      </div>
                      <Separator />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="h-4 w-4 mr-1" />
                          সম্পাদনা
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Credit System Tab */}
          <TabsContent value="credits" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">ক্রেডিট সিস্টেম</h2>
              <p className="text-muted-foreground">
                স্কুলগুলির ক্রেডিট বরাদ্দ, ব্যবহার এবং বিলিং ব্যবস্থাপনা
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">মোট ক্রেডিট বিক্রয়</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">৫২,৪৮০</div>
                  <p className="text-xs text-muted-foreground">
                    এই মাসে +১২%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">সক্রিয় ক্রেডিট</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">৩৮,২৫০</div>
                  <p className="text-xs text-muted-foreground">
                    স্কুলগুলিতে বরাদ্দকৃত
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">মাসিক আয়</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">৳২,৪৫,০০০</div>
                  <p className="text-xs text-muted-foreground">
                    গত মাসে +৮%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">পেন্ডিং পেমেন্ট</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">৳২৮,৫০০</div>
                  <p className="text-xs text-muted-foreground">
                    ৮টি স্কুল থেকে
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Credit Packages */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>ক্রেডিট প্যাকেজ</CardTitle>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    নতুন প্যাকেজ
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { name: 'স্টার্টার', credits: 500, price: 2500, popular: false },
                    { name: 'প্রফেশনাল', credits: 2000, price: 8000, popular: true },
                    { name: 'এন্টারপ্রাইজ', credits: 5000, price: 18000, popular: false }
                  ].map((pkg) => (
                    <Card key={pkg.name} className={`relative ${pkg.popular ? 'border-blue-500' : ''}`}>
                      {pkg.popular && (
                        <Badge className="absolute -top-2 left-4 bg-blue-500">জনপ্রিয়</Badge>
                      )}
                      <CardHeader className="text-center">
                        <CardTitle>{pkg.name}</CardTitle>
                        <div className="text-3xl font-bold">৳{pkg.price.toLocaleString()}</div>
                        <p className="text-muted-foreground">{pkg.credits} ক্রেডিট</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>প্রতি ক্রেডিট:</span>
                            <span>৳{(pkg.price/pkg.credits).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>বৈধতা:</span>
                            <span>১ বছর</span>
                          </div>
                        </div>
                        <Button className="w-full mt-4" variant={pkg.popular ? 'default' : 'outline'}>
                          প্যাকেজ সম্পাদনা
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">অ্যানালিটিক্স ও রিপোর্ট</h2>
              <p className="text-muted-foreground">
                সিস্টেম ব্যবহার, আর্থিক এবং পারফরমেন্স বিশ্লেষণ
              </p>
            </div>

            {/* Real-time Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">আজকের লগইন</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">১,২৪৮</div>
                  <p className="text-xs text-muted-foreground">
                    গতকালের তুলনায় +১৫%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">ডকুমেন্ট তৈরি</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">৩,৫৬৮</div>
                  <p className="text-xs text-muted-foreground">
                    আজ পর্যন্ত
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">সিস্টেম আপটাইম</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">৯৯.৯%</div>
                  <p className="text-xs text-muted-foreground">
                    গত ৩০ দিন
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">API কল</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">৪৫,৬৭২</div>
                  <p className="text-xs text-muted-foreground">
                    আজকে ব্যবহৃত
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* System Health Monitoring */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>সার্ভার পারফরমেন্স</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>CPU ব্যবহার</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">২৫%</span>
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div className="w-1/4 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>মেমরি ব্যবহার</span>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-600">৬৮%</span>
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div className="w-2/3 h-2 bg-yellow-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>ডিস্ক স্থান</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">৪৫%</span>
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div className="w-1/2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ডাটাবেস স্ট্যাটাস</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>সংযোগ অবস্থা</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">সংযুক্ত</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>গড় কোয়েরি সময়</span>
                      <span>১২ মিলিসেকেন্ড</span>
                    </div>
                    <div className="flex justify-between">
                      <span>সক্রিয় সংযোগ</span>
                      <span>৮/২০</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ডাটাবেস সাইজ</span>
                      <span>২.৪ GB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Audit Logs */}
            <Card>
              <CardHeader>
                <CardTitle>সিস্টেম অডিট লগ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { action: 'নতুন স্কুল রেজিস্ট্রেশন', user: 'emon2001', time: '৫ মিনিট আগে', type: 'success' },
                    { action: 'ক্রেডিট প্যাকেজ ক্রয়', user: 'school_admin_01', time: '১৫ মিনিট আগে', type: 'info' },
                    { action: 'টেমপ্লেট আপডেট', user: 'emon2001', time: '৩০ মিনিট আগে', type: 'warning' },
                    { action: 'ব্যবহারকারী অ্যাকাউন্ট সাসপেন্ড', user: 'emon2001', time: '১ ঘন্টা আগে', type: 'error' }
                  ].map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          log.type === 'success' ? 'bg-green-500' :
                          log.type === 'info' ? 'bg-blue-500' :
                          log.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="font-medium text-sm">{log.action}</p>
                          <p className="text-xs text-muted-foreground">ব্যবহারকারী: {log.user}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{log.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}