import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ResponsivePageLayout } from '@/components/layout/responsive-page-layout';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  User,
  Users,
  Shield,
  Settings,
  CreditCard,
  DollarSign,
  Crown,
  Star,
  Zap,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  Mail,
  Phone,
  Globe,
  Database,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  Package,
  Gift,
  Target,
  Award,
  Coins
} from 'lucide-react';

interface AdminProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: string[];
  lastLogin: string;
  isActive: boolean;
  createdAt: string;
  language: 'bn' | 'en' | 'both';
  darkMode: boolean;
  twoFactorEnabled: boolean;
}

interface UserAccount {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: 'admin' | 'teacher' | 'staff' | 'parent' | 'student';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  lastLogin: string;
  createdAt: string;
  permissions: string[];
  profilePicture: string;
}

interface PricingPlan {
  id: string;
  name: string;
  nameBn: string;
  price: number;
  currency: string;
  duration: 'monthly' | 'yearly' | 'lifetime';
  features: string[];
  featuresBn: string[];
  maxStudents: number;
  maxTeachers: number;
  maxStorage: number; // in GB
  supportLevel: 'basic' | 'premium' | 'enterprise';
  isPopular: boolean;
  isActive: boolean;
  description: string;
  descriptionBn: string;
  stripePriceId?: string;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalSchools: number;
  totalRevenue: number;
  monthlyGrowth: number;
  systemUptime: number;
  storageUsed: number;
  totalStorage: number;
}

// Enhanced schemas
const adminProfileSchema = z.object({
  name: z.string().min(2, { message: "নাম আবশ্যক" }),
  username: z.string().min(2, { message: "ইউজারনেম আবশ্যক" }),
  email: z.string().email({ message: "সঠিক ইমেইল প্রদান করুন" }),
  phone: z.string().min(10, { message: "সঠিক ফোন নম্বর প্রদান করুন" }),
  currentPassword: z.string().min(1, { message: "বর্তমান পাসওয়ার্ড আবশ্যক" }),
  newPassword: z.string().min(6, { message: "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে" }).optional(),
  confirmPassword: z.string().optional(),
  language: z.enum(["bn", "en", "both"]).default("bn"),
  darkMode: z.boolean().default(false),
  twoFactorEnabled: z.boolean().default(false),
}).refine(data => !data.newPassword || data.newPassword === data.confirmPassword, {
  message: "পাসওয়ার্ড মিলছে না",
  path: ["confirmPassword"],
});

const userAccountSchema = z.object({
  name: z.string().min(2, { message: "নাম আবশ্যক" }),
  username: z.string().min(2, { message: "ইউজারনেম আবশ্যক" }),
  email: z.string().email({ message: "সঠিক ইমেইল প্রদান করুন" }),
  phone: z.string().min(10, { message: "সঠিক ফোন নম্বর প্রদান করুন" }),
  role: z.enum(["admin", "teacher", "staff", "parent", "student"]),
  status: z.enum(["active", "inactive", "suspended", "pending"]).default("active"),
  password: z.string().min(6, { message: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে" }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "পাসওয়ার্ড মিলছে না",
  path: ["confirmPassword"],
});

const pricingPlanSchema = z.object({
  name: z.string().min(2, { message: "প্ল্যানের নাম আবশ্যক" }),
  nameBn: z.string().min(2, { message: "বাংলা নাম আবশ্যক" }),
  price: z.coerce.number().min(0, { message: "মূল্য ০ বা তার বেশি হতে হবে" }),
  duration: z.enum(["monthly", "yearly", "lifetime"]),
  maxStudents: z.coerce.number().min(1, { message: "কমপক্ষে ১ জন শিক্ষার্থী" }),
  maxTeachers: z.coerce.number().min(1, { message: "কমপক্ষে ১ জন শিক্ষক" }),
  maxStorage: z.coerce.number().min(1, { message: "কমপক্ষে ১ GB স্টোরেজ" }),
  supportLevel: z.enum(["basic", "premium", "enterprise"]),
  description: z.string().optional(),
  descriptionBn: z.string().optional(),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const { user } = useSupabaseDirectAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch real admin settings from Supabase PostgreSQL
  const { data: adminSettingsResponse, isLoading: adminLoading } = useQuery({
    queryKey: ['/api/supabase/admin/settings/1'],
    queryFn: () => apiRequest('/api/supabase/admin/settings/1')
  });

  const adminSettings = adminSettingsResponse?.data;

  // Real admin profile from Supabase data
  const adminProfile: AdminProfile | null = adminSettings ? {
    id: adminSettings.id?.toString() || '1',
    name: adminSettings.displayName || 'Administrator',
    username: 'admin',
    email: 'admin@school.edu.bd',
    phone: adminSettings.contactPhone || '',
    role: 'admin',
    permissions: ['all'],
    lastLogin: '2 hours ago',
    isActive: true,
    createdAt: adminSettings.createdAt || '',
    language: adminSettings.language || 'bn',
    darkMode: adminSettings.darkMode || false,
    twoFactorEnabled: adminSettings.twoFactorEnabled || false
  } : null;

  // Load pricing plans from Supabase (placeholder for now)
  const pricingPlans: PricingPlan[] = [
    {
      id: 'plan-free',
      name: 'Free Plan',
      nameBn: 'ফ্রি প্ল্যান',
      price: 0,
      currency: 'BDT',
      duration: 'monthly',
      features: [
        'Up to 50 students',
        'Basic document generation',
        'Email support',
        '1 GB storage'
      ],
      featuresBn: [
        'সর্বোচ্চ ৫০ জন শিক্ষার্থী',
        'মৌলিক ডকুমেন্ট তৈরি',
        'ইমেইল সাপোর্ট',
        '১ জিবি স্টোরেজ'
      ],
      maxStudents: 50,
      maxTeachers: 5,
      maxStorage: 1,
      supportLevel: 'basic',
      isPopular: false,
      isActive: true,
      description: 'Perfect for small schools starting their digital journey',
      descriptionBn: 'ছোট স্কুলের ডিজিটাল যাত্রা শুরুর জন্য আদর্শ',
      stripePriceId: 'price_free'
    },
    {
      id: 'plan-basic',
      name: 'Basic Plan',
      nameBn: 'বেসিক প্ল্যান',
      price: 2500,
      currency: 'BDT',
      duration: 'monthly',
      features: [
        'Up to 200 students',
        'All document templates',
        'SMS notifications',
        'Priority email support',
        '10 GB storage',
        'Basic analytics'
      ],
      featuresBn: [
        'সর্বোচ্চ ২০০ জন শিক্ষার্থী',
        'সকল ডকুমেন্ট টেমপ্লেট',
        'SMS নোটিফিকেশন',
        'অগ্রাধিকার ইমেইল সাপোর্ট',
        '১০ জিবি স্টোরেজ',
        'মৌলিক বিশ্লেষণ'
      ],
      maxStudents: 200,
      maxTeachers: 15,
      maxStorage: 10,
      supportLevel: 'premium',
      isPopular: true,
      isActive: true,
      description: 'Most popular plan for growing schools',
      descriptionBn: 'বর্ধনশীল স্কুলের জন্য সবচেয়ে জনপ্রিয় প্ল্যান',
      stripePriceId: 'price_basic'
    },
    {
      id: 'plan-premium',
      name: 'Premium Plan',
      nameBn: 'প্রিমিয়াম প্ল্যান',
      price: 5000,
      currency: 'BDT',
      duration: 'monthly',
      features: [
        'Up to 500 students',
        'Advanced features',
        'Video conferencing',
        'Payment gateway integration',
        'Priority phone support',
        '50 GB storage',
        'Advanced analytics',
        'Custom branding'
      ],
      featuresBn: [
        'সর্বোচ্চ ৫০০ জন শিক্ষার্থী',
        'উন্নত বৈশিষ্ট্য',
        'ভিডিও কনফারেন্সিং',
        'পেমেন্ট গেটওয়ে ইন্টিগ্রেশন',
        'অগ্রাধিকার ফোন সাপোর্ট',
        '৫০ জিবি স্টোরেজ',
        'উন্নত বিশ্লেষণ',
        'কাস্টম ব্র্যান্ডিং'
      ],
      maxStudents: 500,
      maxTeachers: 30,
      maxStorage: 50,
      supportLevel: 'enterprise',
      isPopular: false,
      isActive: true,
      description: 'Complete solution for large educational institutions',
      descriptionBn: 'বড় শিক্ষা প্রতিষ্ঠানের জন্য সম্পূর্ণ সমাধান',
      stripePriceId: 'price_premium'
    },
    {
      id: 'plan-enterprise',
      name: 'Enterprise Plan',
      nameBn: 'এন্টারপ্রাইজ প্ল্যান',
      price: 15000,
      currency: 'BDT',
      duration: 'monthly',
      features: [
        'Unlimited students',
        'All features included',
        'Dedicated support manager',
        'Custom integrations',
        'On-site training',
        'Unlimited storage',
        'White-label solution',
        'API access'
      ],
      featuresBn: [
        'সীমাহীন শিক্ষার্থী',
        'সকল বৈশিষ্ট্য অন্তর্ভুক্ত',
        'নিবেদিত সাপোর্ট ম্যানেজার',
        'কাস্টম ইন্টিগ্রেশন',
        'অন-সাইট ট্রেনিং',
        'সীমাহীন স্টোরেজ',
        'হোয়াইট-লেবেল সমাধান',
        'API অ্যাক্সেস'
      ],
      maxStudents: 99999,
      maxTeachers: 999,
      maxStorage: 9999,
      supportLevel: 'enterprise',
      isPopular: false,
      isActive: true,
      description: 'Ultimate solution for large school networks',
      descriptionBn: 'বড় স্কুল নেটওয়ার্কের জন্য চূড়ান্ত সমাধান',
      stripePriceId: 'price_enterprise'
    }
  ];

  // Enhanced user accounts data
  const userAccounts: UserAccount[] = [
    {
      id: 'user-001',
      name: 'মোঃ আদনান হোসেন',
      username: 'adnan_admin',
      email: 'adnan@stjoseph.edu.bd',
      phone: '+8801712345678',
      role: 'admin',
      status: 'active',
      lastLogin: '২ ঘন্টা আগে',
      createdAt: '২০২৪-১২-০১',
      permissions: ['all'],
      profilePicture: '/assets/profile1.jpg'
    },
    {
      id: 'user-002',
      name: 'মিসেস ফাতেমা খাতুন',
      username: 'fatema_teacher',
      email: 'fatema@stjoseph.edu.bd',
      phone: '+8801812345679',
      role: 'teacher',
      status: 'active',
      lastLogin: '১ দিন আগে',
      createdAt: '২০২৪-১১-১৫',
      permissions: ['teaching', 'students'],
      profilePicture: '/assets/profile2.jpg'
    },
    {
      id: 'user-003',
      name: 'মোঃ রফিকুল ইসলাম',
      username: 'rafiq_staff',
      email: 'rafiq@stjoseph.edu.bd',
      phone: '+8801912345680',
      role: 'staff',
      status: 'inactive',
      lastLogin: '১ সপ্তাহ আগে',
      createdAt: '২০২৪-১০-২০',
      permissions: ['basic'],
      profilePicture: '/assets/profile3.jpg'
    }
  ];

  // System stats
  const systemStats: SystemStats = {
    totalUsers: 1250,
    activeUsers: 890,
    totalSchools: 45,
    totalRevenue: 125000,
    monthlyGrowth: 15.8,
    systemUptime: 99.9,
    storageUsed: 2.5,
    totalStorage: 100
  };

  // Form handlers using real Supabase data
  const adminProfileForm = useForm<z.infer<typeof adminProfileSchema>>({
    resolver: zodResolver(adminProfileSchema),
    defaultValues: {
      name: adminProfile?.name || "",
      username: adminProfile?.username || "",
      email: adminProfile?.email || "",
      phone: adminProfile?.phone || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      language: adminProfile?.language || "bn",
      darkMode: adminProfile?.darkMode || false,
      twoFactorEnabled: adminProfile?.twoFactorEnabled || false,
    }
  });

  const userAccountForm = useForm<z.infer<typeof userAccountSchema>>({
    resolver: zodResolver(userAccountSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      phone: "",
      role: "teacher",
      status: "active",
      password: "",
      confirmPassword: "",
    }
  });

  const pricingPlanForm = useForm<z.infer<typeof pricingPlanSchema>>({
    resolver: zodResolver(pricingPlanSchema),
    defaultValues: {
      name: "",
      nameBn: "",
      price: 0,
      duration: "monthly",
      maxStudents: 50,
      maxTeachers: 5,
      maxStorage: 1,
      supportLevel: "basic",
      description: "",
      descriptionBn: "",
      isPopular: false,
      isActive: true,
    }
  });

  // Supabase PostgreSQL mutations for admin settings
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof adminProfileSchema>) => {
      return apiRequest('/api/supabase/admin/settings/1', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supabase/admin/settings/1'] });
      toast({
        title: "প্রোফাইল আপডেট হয়েছে",
        description: "আপনার প্রোফাইল সফলভাবে আপডেট হয়েছে",
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "প্রোফাইল আপডেট করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userAccountSchema>) => {
      return apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsUserDialogOpen(false);
      userAccountForm.reset();
      toast({
        title: "ব্যবহারকারী তৈরি হয়েছে",
        description: "নতুন ব্যবহারকারী সফলভাবে তৈরি করা হয়েছে",
      });
    },
  });

  const createPricingPlanMutation = useMutation({
    mutationFn: async (data: z.infer<typeof pricingPlanSchema>) => {
      return apiRequest('/api/admin/pricing-plans', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing-plans'] });
      setIsPricingDialogOpen(false);
      pricingPlanForm.reset();
      toast({
        title: "প্রাইসিং প্ল্যান তৈরি হয়েছে",
        description: "নতুন প্রাইসিং প্ল্যান সফলভাবে তৈরি করা হয়েছে",
      });
    },
  });

  // Get role style
  const getRoleStyle = (role: string) => {
    switch(role) {
      case 'admin': return { bg: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: Crown };
      case 'teacher': return { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: User };
      case 'staff': return { bg: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: Users };
      case 'parent': return { bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: User };
      case 'student': return { bg: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: User };
      default: return { bg: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: User };
    }
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'admin': return 'প্রশাসক';
      case 'teacher': return 'শিক্ষক';
      case 'staff': return 'কর্মচারী';
      case 'parent': return 'অভিভাবক';
      case 'student': return 'শিক্ষার্থী';
      default: return 'অজানা';
    }
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'active': return { bg: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle };
      case 'inactive': return { bg: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: XCircle };
      case 'suspended': return { bg: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: Lock };
      case 'pending': return { bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Clock };
      default: return { bg: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: Info };
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'active': return 'সক্রিয়';
      case 'inactive': return 'নিষ্ক্রিয়';
      case 'suspended': return 'স্থগিত';
      case 'pending': return 'অপেক্ষমান';
      default: return 'অজানা';
    }
  };

  // Filter users
  const filteredUsers = userAccounts.filter(user => {
    if (searchQuery && !user.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !user.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    if (statusFilter !== 'all' && user.status !== statusFilter) return false;
    return true;
  });

  // Get pricing plan style
  const getPlanDurationLabel = (duration: string) => {
    switch(duration) {
      case 'monthly': return 'মাসিক';
      case 'yearly': return 'বার্ষিক';
      case 'lifetime': return 'আজীবন';
      default: return duration;
    }
  };

  const getSupportLevelLabel = (level: string) => {
    switch(level) {
      case 'basic': return 'মৌলিক';
      case 'premium': return 'প্রিমিয়াম';
      case 'enterprise': return 'এন্টারপ্রাইজ';
      default: return level;
    }
  };

  return (
    <AppShell>
      <ResponsivePageLayout
        title="এডমিন সেটিংস ও প্রাইসিং"
        description="সিস্টেম প্রশাসন, ব্যবহারকারী ব্যবস্থাপনা এবং প্রাইসিং প্ল্যান পরিচালনা করুন"
      >
        <div className="space-y-6">
          {/* Enhanced system stats overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-400">মোট ব্যবহারকারী</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {systemStats.totalUsers.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400">সক্রিয় ব্যবহারকারী</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {systemStats.activeUsers.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-600 dark:text-purple-400">মোট আয়</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      ৳{systemStats.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-600 dark:text-orange-400">মাসিক বৃদ্ধি</p>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      +{systemStats.monthlyGrowth}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <TabsList className="grid w-full lg:w-fit grid-cols-5">
                <TabsTrigger value="profile">প্রোফাইল</TabsTrigger>
                <TabsTrigger value="users">ব্যবহারকারী</TabsTrigger>
                <TabsTrigger value="pricing">প্রাইসিং</TabsTrigger>
                <TabsTrigger value="system">সিস্টেম</TabsTrigger>
                <TabsTrigger value="analytics">বিশ্লেষণ</TabsTrigger>
              </TabsList>
              
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  রিপোর্ট
                </Button>
                <Button size="sm" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  কনফিগার
                </Button>
              </div>
            </div>

            <TabsContent value="profile" className="space-y-6">
              <Form {...adminProfileForm}>
                <form onSubmit={adminProfileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Profile Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          ব্যক্তিগত তথ্য
                        </CardTitle>
                        <CardDescription>
                          আপনার প্রোফাইল তথ্য আপডেট করুন
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={adminProfileForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>পূর্ণ নাম</FormLabel>
                              <FormControl>
                                <Input placeholder="আপনার নাম" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={adminProfileForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ইউজারনেম</FormLabel>
                              <FormControl>
                                <Input placeholder="ইউজারনেম" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={adminProfileForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ইমেইল ঠিকানা</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="email@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={adminProfileForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ফোন নম্বর</FormLabel>
                              <FormControl>
                                <Input placeholder="+8801712345678" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    {/* Security Settings */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          নিরাপত্তা সেটিংস
                        </CardTitle>
                        <CardDescription>
                          পাসওয়ার্ড এবং নিরাপত্তা বিকল্প
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={adminProfileForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>বর্তমান পাসওয়ার্ড</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="বর্তমান পাসওয়ার্ড" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={adminProfileForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>নতুন পাসওয়ার্ড</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="নতুন পাসওয়ার্ড" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={adminProfileForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>পাসওয়ার্ড নিশ্চিত করুন</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="পাসওয়ার্ড নিশ্চিত করুন" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={adminProfileForm.control}
                          name="twoFactorEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">টু-ফ্যাক্টর অথেনটিকেশন</FormLabel>
                                <FormDescription>
                                  অতিরিক্ত নিরাপত্তার জন্য 2FA চালু করুন
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Preferences */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        পছন্দসমূহ
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={adminProfileForm.control}
                          name="language"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ভাষা</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="ভাষা নির্বাচন করুন" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="bn">বাংলা</SelectItem>
                                  <SelectItem value="en">English</SelectItem>
                                  <SelectItem value="both">উভয়</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={adminProfileForm.control}
                          name="darkMode"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">ডার্ক মোড</FormLabel>
                                <FormDescription>
                                  ডার্ক থিম ব্যবহার করুন
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                        className="bg-gradient-to-r from-blue-500 to-purple-600"
                      >
                        {updateProfileMutation.isPending ? 'আপডেট হচ্ছে...' : 'প্রোফাইল আপডেট করুন'}
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              {/* User management controls */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                    <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="ব্যবহারকারী খুঁজুন..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue placeholder="ভূমিকা" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">সকল ভূমিকা</SelectItem>
                          <SelectItem value="admin">প্রশাসক</SelectItem>
                          <SelectItem value="teacher">শিক্ষক</SelectItem>
                          <SelectItem value="staff">কর্মচারী</SelectItem>
                          <SelectItem value="parent">অভিভাবক</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue placeholder="স্ট্যাটাস" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">সকল স্ট্যাটাস</SelectItem>
                          <SelectItem value="active">সক্রিয়</SelectItem>
                          <SelectItem value="inactive">নিষ্ক্রিয়</SelectItem>
                          <SelectItem value="suspended">স্থগিত</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-green-500 to-blue-600">
                          <Plus className="h-4 w-4 mr-2" />
                          নতুন ব্যবহারকারী
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>নতুন ব্যবহারকারী তৈরি করুন</DialogTitle>
                          <DialogDescription>
                            সিস্টেমে নতুন ব্যবহারকারী যোগ করুন
                          </DialogDescription>
                        </DialogHeader>
                        
                        <Form {...userAccountForm}>
                          <form onSubmit={userAccountForm.handleSubmit((data) => createUserMutation.mutate(data))} className="space-y-4">
                            <FormField
                              control={userAccountForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>পূর্ণ নাম</FormLabel>
                                  <FormControl>
                                    <Input placeholder="যেমন: মোঃ করিম উদ্দিন" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={userAccountForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>ইমেইল ঠিকানা</FormLabel>
                                  <FormControl>
                                    <Input type="email" placeholder="email@example.com" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={userAccountForm.control}
                              name="role"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>ভূমিকা</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="ভূমিকা নির্বাচন করুন" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="admin">প্রশাসক</SelectItem>
                                      <SelectItem value="teacher">শিক্ষক</SelectItem>
                                      <SelectItem value="staff">কর্মচারী</SelectItem>
                                      <SelectItem value="parent">অভিভাবক</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={userAccountForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>পাসওয়ার্ড</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="কমপক্ষে ৬ অক্ষর" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="flex justify-end gap-3 pt-4">
                              <Button type="button" variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                                বাতিল
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={createUserMutation.isPending}
                              >
                                {createUserMutation.isPending ? 'তৈরি হচ্ছে...' : 'তৈরি করুন'}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              {/* Users table */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ব্যবহারকারী</TableHead>
                        <TableHead>ভূমিকা</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead>
                        <TableHead>শেষ লগইন</TableHead>
                        <TableHead className="text-right">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => {
                        const roleStyle = getRoleStyle(user.role);
                        const statusStyle = getStatusStyle(user.status);
                        const RoleIcon = roleStyle.icon;
                        const StatusIcon = statusStyle.icon;
                        
                        return (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                  <User className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <div className="font-medium">{user.name}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={roleStyle.bg}>
                                <RoleIcon className="h-3 w-3 mr-1" />
                                {getRoleLabel(user.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusStyle.bg}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {getStatusLabel(user.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>{user.lastLogin}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-6">
              {/* Pricing controls */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">প্রাইসিং প্ল্যান ব্যবস্থাপনা</h3>
                <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-purple-500 to-pink-600">
                      <Plus className="h-4 w-4 mr-2" />
                      নতুন প্ল্যান
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>নতুন প্রাইসিং প্ল্যান</DialogTitle>
                      <DialogDescription>
                        নতুন সাবস্ক্রিপশন প্ল্যান তৈরি করুন
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...pricingPlanForm}>
                      <form onSubmit={pricingPlanForm.handleSubmit((data) => createPricingPlanMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={pricingPlanForm.control}
                          name="nameBn"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>প্ল্যানের নাম (বাংলা)</FormLabel>
                              <FormControl>
                                <Input placeholder="যেমন: প্রিমিয়াম প্ল্যান" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={pricingPlanForm.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>মূল্য (৳)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="২৫০০" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={pricingPlanForm.control}
                            name="duration"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>সময়কাল</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="monthly">মাসিক</SelectItem>
                                    <SelectItem value="yearly">বার্ষিক</SelectItem>
                                    <SelectItem value="lifetime">আজীবন</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={pricingPlanForm.control}
                            name="maxStudents"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>সর্বোচ্চ শিক্ষার্থী</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="১০০" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={pricingPlanForm.control}
                            name="maxStorage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>স্টোরেজ (GB)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="১০" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="flex justify-end gap-3 pt-4">
                          <Button type="button" variant="outline" onClick={() => setIsPricingDialogOpen(false)}>
                            বাতিল
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createPricingPlanMutation.isPending}
                          >
                            {createPricingPlanMutation.isPending ? 'তৈরি হচ্ছে...' : 'তৈরি করুন'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Pricing plans grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                {pricingPlans.map((plan) => (
                  <Card key={plan.id} className={`relative hover:shadow-lg transition-all duration-300 ${plan.isPopular ? 'border-2 border-blue-500 scale-105' : ''}`}>
                    {plan.isPopular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-blue-500 text-white px-3 py-1">
                          <Star className="h-3 w-3 mr-1" />
                          জনপ্রিয়
                        </Badge>
                      </div>
                    )}
                    
                    <CardHeader className="text-center pb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-xl">{plan.nameBn}</CardTitle>
                      <div className="text-3xl font-bold text-blue-600">
                        ৳{plan.price.toLocaleString()}
                        <span className="text-sm font-normal text-gray-500">
                          /{getPlanDurationLabel(plan.duration)}
                        </span>
                      </div>
                      <CardDescription>{plan.descriptionBn}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>সর্বোচ্চ শিক্ষার্থী:</span>
                          <span className="font-medium">{plan.maxStudents === 99999 ? 'সীমাহীন' : plan.maxStudents}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>সর্বোচ্চ শিক্ষক:</span>
                          <span className="font-medium">{plan.maxTeachers === 999 ? 'সীমাহীন' : plan.maxTeachers}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>স্টোরেজ:</span>
                          <span className="font-medium">{plan.maxStorage === 9999 ? 'সীমাহীন' : `${plan.maxStorage} GB`}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>সাপোর্ট:</span>
                          <span className="font-medium">{getSupportLevelLabel(plan.supportLevel)}</span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        {plan.featuresBn.slice(0, 4).map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>{feature}</span>
                          </div>
                        ))}
                        {plan.featuresBn.length > 4 && (
                          <div className="text-xs text-gray-500">
                            +{plan.featuresBn.length - 4} আরও বৈশিষ্ট্য
                          </div>
                        )}
                      </div>
                    </CardContent>
                    
                    <CardFooter className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Edit3 className="h-4 w-4 mr-1" />
                        সম্পাদনা
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Switch checked={plan.isActive} />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="system" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Health */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      সিস্টেম হেলথ
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">সিস্টেম আপটাইম</span>
                      <span className="font-semibold text-green-600">{systemStats.systemUptime}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">স্টোরেজ ব্যবহার</span>
                      <span className="font-semibold">{systemStats.storageUsed}GB / {systemStats.totalStorage}GB</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(systemStats.storageUsed / systemStats.totalStorage) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">ডেটাবেস স্ট্যাটাস</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        স্বাভাবিক
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activities */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      সাম্প্রতিক কার্যক্রম
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <User className="h-4 w-4 text-blue-500" />
                        <div className="text-sm">
                          <p>নতুন ব্যবহারকারী নিবন্ধিত</p>
                          <p className="text-gray-500">৫ মিনিট আগে</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <CreditCard className="h-4 w-4 text-green-500" />
                        <div className="text-sm">
                          <p>পেমেন্ট সফল</p>
                          <p className="text-gray-500">১৫ মিনিট আগে</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <Settings className="h-4 w-4 text-orange-500" />
                        <div className="text-sm">
                          <p>সিস্টেম কনফিগারেশন আপডেট</p>
                          <p className="text-gray-500">১ ঘন্টা আগে</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Analytics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      আয়ের বিশ্লেষণ
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">এই মাস</span>
                        <span className="font-semibold text-green-600">৳45,000</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">গত মাস</span>
                        <span className="font-semibold">৳38,000</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">বৃদ্ধি</span>
                        <span className="font-semibold text-green-600">+18.4%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* User Growth */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      ব্যবহারকারী বৃদ্ধি
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">নতুন ব্যবহারকারী (এই মাস)</span>
                        <span className="font-semibold text-blue-600">156</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">সক্রিয় ব্যবহারকারী</span>
                        <span className="font-semibold">{systemStats.activeUsers}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">মাসিক বৃদ্ধির হার</span>
                        <span className="font-semibold text-green-600">+{systemStats.monthlyGrowth}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ResponsivePageLayout>
    </AppShell>
  );
}