import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ResponsivePageLayout } from '@/components/layout/responsive-page-layout';
import { NavigationBar } from '@/components/ui/navigation-bar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { 
  Search, Filter, Grid, List, Star, TrendingUp, Clock, Users, 
  FileText, CreditCard, Wallet, Target, ChevronRight, BookOpen,
  GraduationCap, Building, DollarSign, Award, Calendar, ArrowRight,
  MessageSquare, FileCheck, UserPlus, Heart, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db, supabase } from '@/lib/supabase';

interface DocumentType {
  id: string;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  icon: string;
  path: string;
  category: 'student' | 'teacher' | 'admin' | 'financial';
  creditsRequired: number;
  generated: number;
  isPopular?: boolean;
  difficulty: 'easy' | 'medium' | 'advanced';
  estimatedTime: string;
  usageCount?: number;
  lastUsed?: string | null;
}

interface DocumentStats {
  totalGenerated: number;
  creditsUsed: number;
  creditsRemaining: number;
  monthlyLimit: number;
  monthlyUsed: number;
}

interface CategoryConfig {
  id: string;
  name: string;
  nameBn: string;
  icon: any;
  color: string;
  bgColor: string;
  description: string;
  count: number;
}

export default function DocumentsDashboardUX() {
  const { toast } = useToast();
  const isMobile = useMobile();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  const schoolId = useRequireSchoolId();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [sortBy, setSortBy] = useState<'usage' | 'popular' | 'name' | 'category'>('usage');
  const [showPopularFirst, setShowPopularFirst] = useState<boolean>(true);
  const { language } = useLanguage();

  // Fetch user statistics from Supabase
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['document-user-stats', schoolId],
    queryFn: async () => {
      return await db.getUserDocumentStats('current_user', schoolId);
    },
    enabled: !!schoolId
  });

  // Fetch ALL document templates for category counts (without filtering)
  const { data: allTemplatesData, isLoading: allTemplatesLoading } = useQuery({
    queryKey: ['document-templates-all', schoolId, language],
    queryFn: async () => {
      return await db.getDocumentTemplatesEnhanced(schoolId);
    },
    enabled: !!schoolId
  });

  // Fetch filtered document templates for display
  const { data: templateData, isLoading: templatesLoading } = useQuery({
    queryKey: ['document-templates-filtered', selectedCategory, searchQuery, schoolId, language],
    queryFn: async () => {
      return await db.getDocumentTemplatesEnhanced(
        schoolId,
        selectedCategory !== 'all' ? selectedCategory : undefined,
        searchQuery || undefined
      );
    },
    enabled: !!schoolId
  });

  // Fetch recent documents
  const { data: recentDocuments, isLoading: recentLoading } = useQuery({
    queryKey: ['recent-documents', schoolId],
    queryFn: async () => {
      return await db.getRecentDocuments(schoolId);
    },
    enabled: !!schoolId
  });

  // Fetch user credit balance from Supabase using authenticated user
  const { data: creditBalance, isLoading: creditLoading } = useQuery({
    queryKey: ['credit-stats', schoolId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      return await db.getCreditBalance(user.id, schoolId);
    },
    enabled: !!schoolId
  });

  // Fetch document costs from Supabase
  const { data: documentCosts, isLoading: costsLoading } = useQuery({
    queryKey: ['document-costs'],
    queryFn: async () => {
      return await db.getDocumentCosts();
    }
  });

  // Seed templates mutation with Supabase
  const seedTemplatesMutation = useMutation({
    mutationFn: async () => {
      return await db.seedDocumentTemplates(schoolId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates-all'] });
      queryClient.invalidateQueries({ queryKey: ['document-templates-filtered'] });
      toast({
        title: "সফল",
        description: "ডকুমেন্ট টেমপ্লেট সফলভাবে যোগ করা হয়েছে",
      });
    }
  });

  // Generate document with credit deduction using Supabase
  const generateDocumentMutation = useMutation({
    mutationFn: async (data: { templateId: number; documentType: string; studentIds: number[] }) => {
      return await db.generateDocument({
        ...data,
        schoolId: schoolId
      });
    },
    onSuccess: (data) => {
      toast({
        title: "ডকুমেন্ট তৈরি সফল",
        description: data.message || "ডকুমেন্ট সফলভাবে তৈরি হয়েছে",
      });
      queryClient.invalidateQueries({ queryKey: ['credit-stats'] });
      queryClient.invalidateQueries({ queryKey: ['document-user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['document-templates-filtered'] });
      queryClient.invalidateQueries({ queryKey: ['recent-documents'] });
    },
    onError: (error: any) => {
      toast({
        title: "ডকুমেন্ট তৈরি ব্যর্থ",
        description: error.message || "অপর্যাপ্ত ক্রেডিট বা সিস্টেম এরর",
        variant: "destructive",
      });
    },
  });

  // Document type mapping for proper routing
  const getDocumentRoute = (documentName: string): string => {
    const routeMap: Record<string, string> = {
      "Student ID Card": "/id-card/dashboard",
      "Teacher ID Card": "/documents/teacher-id-cards",
      "Admit Card": "/admit-card/dashboard",
      "Class Routine": "/documents/class-routines",
      "Teacher Routine": "/documents/teacher-routines",
      "Marksheet": "/documents/marksheets",
      "Result Sheet": "/documents/result-sheets",
      "Testimonial": "/documents/testimonials",
      "Transfer Certificate": "/documents/transfer-certificates",
      "Fee Receipt": "/documents/fee-receipts",
      "Pay Sheet": "/documents/pay-sheets",
      "Income Report": "/documents/income-reports",
      "Expense Sheet": "/documents/expense-sheets",
      "Admission Form": "/documents/admission-forms",
      "Office Order": "/documents/office-orders",
      "Notice": "/documents/notices",
      "Exam Paper": "/documents/exam-papers",
      "OMR Sheet": "/documents/omr-sheets",
      "MCQ Format": "/documents/mcq-formats"
    };
    
    return routeMap[documentName] || "/documents/templates";
  };

  // UX Principle: Don Norman - Clear signifiers and affordances
  const handleDocumentAccess = async (documentName: string, creditsRequired: number) => {
    const currentBalance = creditBalance?.currentBalance || 0;
    
    if (currentBalance < creditsRequired) {
      toast({
        title: "অপর্যাপ্ত ক্রেডিট",
        description: `এই ডকুমেন্টের জন্য ${creditsRequired} ক্রেডিট প্রয়োজন। আপনার কাছে ${currentBalance} ক্রেডিট আছে।`,
        variant: "destructive"
      });
      return;
    }
    
    // Navigate to document generation page using proper document type name with SPA routing
    const route = getDocumentRoute(documentName);
    setLocation(route);
  };

  // Quick document generation for testing
  const handleQuickGenerate = (templateId: number, creditsRequired: number) => {
    const currentBalance = creditBalance?.currentBalance || 0;
    
    if (currentBalance < creditsRequired) {
      toast({
        title: "অপর্যাপ্ত ক্রেডিট",
        description: `এই ডকুমেন্টের জন্য ${creditsRequired} ক্রেডিট প্রয়োজন`,
        variant: "destructive"
      });
      return;
    }

    generateDocumentMutation.mutate({
      templateId,
      documentType: 'quick_generate',
      studentIds: [1] // Sample student ID for demo
    });
  };

  // Use API data instead of static data
  const documentTypes = templateData || [];

  // Process and sort the filtered documents with enhanced sorting controls
  const sortedAndFilteredDocuments = useMemo(() => {
    let filtered = documentTypes;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((doc: any) => 
        doc.nameBn?.toLowerCase().includes(query) ||
        doc.descriptionBn?.toLowerCase().includes(query) ||
        doc.name?.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter with grouped categories
    if (selectedCategory !== 'all') {
      const categoryMapping: Record<string, string[]> = {
        'academic': ['academic'],
        'certificates': ['certificate', 'recognition', 'graduation'],
        'administrative': ['administrative', 'communication'],
        'examination': ['examination'],
        'financial': ['financial'],
        'staff': ['staff'],
        'services': ['medical', 'library', 'transport', 'service'],
        'activities': ['cultural', 'extracurricular', 'research', 'event'],
        'modern': ['digital', 'technology', 'international', 'safety', 'alumni']
      };
      
      const allowedCategories = categoryMapping[selectedCategory] || [selectedCategory];
      filtered = filtered.filter((doc: any) => allowedCategories.includes(doc.category));
    }
    
    // Apply sorting based on sortBy preference
    let sorted = [...filtered];
    
    // First sort by popularity if enabled
    if (showPopularFirst) {
      sorted = sorted.sort((a, b) => {
        if (a.isPopular && !b.isPopular) return -1;
        if (!a.isPopular && b.isPopular) return 1;
        return 0;
      });
    }
    
    // Then apply secondary sorting
    switch (sortBy) {
      case 'usage':
        sorted = sorted.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
        break;
      case 'name':
        sorted = sorted.sort((a, b) => {
          const nameA = language === 'bn' ? (a.nameBn || a.name) : a.name;
          const nameB = language === 'bn' ? (b.nameBn || b.name) : b.name;
          return nameA.localeCompare(nameB);
        });
        break;
      case 'category':
        sorted = sorted.sort((a, b) => a.category.localeCompare(b.category));
        break;
      default:
        break;
    }
    
    return sorted;
  }, [documentTypes, searchQuery, selectedCategory, sortBy, showPopularFirst, language]);

  // UX-optimized category configurations based on user workflows and mental models
  const categoryConfigs: CategoryConfig[] = useMemo(() => {
    const allTemplates = allTemplatesData || [];
    return [
      {
        id: 'all',
        name: 'All Documents',
        nameBn: 'সব ডকুমেন্ট',
        icon: FileText,
        color: 'text-slate-600',
        bgColor: 'bg-slate-100',
        description: 'সকল ধরনের ডকুমেন্ট দেখুন',
        count: allTemplates.length
      },
      {
        id: 'financial',
        name: 'Financial Management',
        nameBn: 'আর্থিক ব্যবস্থাপনা',
        icon: () => <span className="text-2xl">💰</span>,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        description: 'ফি, বেতন, বাজেট ও আর্থিক রিপোর্ট',
        count: allTemplates.filter((d: any) => d.category === 'financial').length
      },
      {
        id: 'academic',
        name: 'Academic Records',
        nameBn: 'একাডেমিক রেকর্ড',
        icon: () => <span className="text-2xl">📊</span>,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        description: 'নম্বরপত্র, প্রগ্রেস রিপোর্ট ও একাডেমিক সনদ',
        count: allTemplates.filter((d: any) => d.category === 'academic').length
      },
      {
        id: 'certificates',
        name: 'Certificates & Legal',
        nameBn: 'সনদপত্র ও আইনি কাগজ',
        icon: () => <span className="text-2xl">🏆</span>,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        description: 'স্থানান্তর, ছাড়পত্র ও অফিসিয়াল সনদ',
        count: allTemplates.filter((d: any) => ['certificate', 'recognition', 'graduation'].includes(d.category)).length
      },
      {
        id: 'administrative',
        name: 'Administrative',
        nameBn: 'প্রশাসনিক',
        icon: () => <span className="text-2xl">📋</span>,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        description: 'প্রশাসনিক কাগজপত্র ও অফিসিয়াল দলিল',
        count: allTemplates.filter((d: any) => ['administrative', 'communication'].includes(d.category)).length
      },
      {
        id: 'staff',
        name: 'Staff & Personnel',
        nameBn: 'কর্মী ও কর্মচারী',
        icon: () => <span className="text-2xl">👨‍🏫</span>,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
        description: 'শিক্ষক ও কর্মচারী সংক্রান্ত কাগজপত্র',
        count: allTemplates.filter((d: any) => d.category === 'staff').length
      },
      {
        id: 'examination',
        name: 'Examinations',
        nameBn: 'পরীক্ষা',
        icon: () => <span className="text-2xl">📝</span>,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        description: 'এডমিট কার্ড, প্রশ্নপত্র ও পরীক্ষা সামগ্রী',
        count: allTemplates.filter((d: any) => d.category === 'examination').length
      },
      {
        id: 'services',
        name: 'Services & Support',
        nameBn: 'সেবা ও সহায়তা',
        icon: () => <span className="text-2xl">🏥</span>,
        color: 'text-teal-600',
        bgColor: 'bg-teal-100',
        description: 'চিকিৎসা, লাইব্রেরি, পরিবহন ও সেবা',
        count: allTemplates.filter((d: any) => ['medical', 'library', 'transport', 'service'].includes(d.category)).length
      },
      {
        id: 'activities',
        name: 'Activities & Events',
        nameBn: 'কার্যক্রম ও অনুষ্ঠান',
        icon: () => <span className="text-2xl">🎉</span>,
        color: 'text-pink-600',
        bgColor: 'bg-pink-100',
        description: 'সাংস্কৃতিক, ক্রীড়া ও গবেষণা কার্যক্রম',
        count: allTemplates.filter((d: any) => ['cultural', 'extracurricular', 'research', 'event'].includes(d.category)).length
      },
      {
        id: 'modern',
        name: 'Modern & Digital',
        nameBn: 'আধুনিক ও ডিজিটাল',
        icon: () => <span className="text-2xl">💻</span>,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
        description: 'ডিজিটাল সেবা, প্রযুক্তি ও আন্তর্জাতিক',
        count: allTemplates.filter((d: any) => ['digital', 'technology', 'international', 'safety', 'alumni'].includes(d.category)).length
      }
    ];
  }, [allTemplatesData]);



  const popularDocuments = sortedAndFilteredDocuments.filter((doc: any) => doc.isPopular);

  // UX Principle: Aarron Walter - Emotional design with delight
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // UX Principle: Jonathan Ive - Simplicity through understanding
  const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("p-2 rounded-lg group-hover:scale-110 transition-transform", color)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-1">{value || 0}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );

  // UX Principle: Dieter Rams - Good design is as little design as possible
  const DocumentCard = ({ doc }: { doc: any }) => (
    <Card 
      className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500"
      onClick={() => handleDocumentAccess(doc.name, doc.creditsRequired || 1)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleDocumentAccess(doc.name, doc.creditsRequired || 1);
        }
      }}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="text-3xl mb-2">{doc.icon || '📄'}</div>
          <div className="flex flex-col items-end space-y-1">
            {doc.isPopular && (
              <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200">
                <Star className="h-3 w-3 mr-1" />
                জনপ্রিয়
              </Badge>
            )}
            <Badge className={getDifficultyColor(doc.difficulty || 'easy')}>
              {(doc.difficulty || 'easy') === 'easy' ? 'সহজ' : (doc.difficulty || 'easy') === 'medium' ? 'মাঝারি' : 'উন্নত'}
            </Badge>
          </div>
        </div>
        
        <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-600 transition-colors">
          {language === 'bn' ? doc.nameBn : doc.name}
        </h3>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {language === 'bn' ? doc.descriptionBn : doc.description}
        </p>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4 text-muted-foreground">
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {doc.estimatedTime || '২-৩ মিনিট'}
            </span>
            <span className="flex items-center font-semibold text-orange-600">
              <CreditCard className="h-4 w-4 mr-1" />
              {doc.requiredCredits || doc.creditsRequired || 1} ক্রেডিট
            </span>
            {doc.usageCount !== undefined && (
              <span className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                {doc.usageCount} বার ব্যবহৃত
              </span>
            )}
          </div>
          <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppShell>
      <ResponsivePageLayout
        title="ডকুমেন্ট জেনারেটর"
        description="স্কুলের সকল ধরনের ডকুমেন্ট তৈরি করুন"
      >
        <NavigationBar
          title={{
            en: "Document Generator",
            bn: "ডকুমেন্ট জেনারেটর", 
            ar: "منشئ المستندات"
          }}
        />

        <div className="space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              ডকুমেন্ট জেনারেটর
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              আপনার স্কুলের জন্য প্রয়োজনীয় সকল ধরনের ডকুমেন্ট দ্রুত এবং সহজে তৈরি করুন
            </p>
            {/* Seed Templates Button for Development */}
            <Button 
              onClick={() => seedTemplatesMutation.mutate()}
              disabled={seedTemplatesMutation.isPending}
              variant="outline"
            >
              {seedTemplatesMutation.isPending ? 'যোগ করা হচ্ছে...' : 'টেমপ্লেট যোগ করুন'}
            </Button>
          </div>

          {/* Credit Balance Banner */}
          {!creditLoading && creditBalance && (
            <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-blue-50">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Wallet className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">আপনার ক্রেডিট ব্যালেন্স</h3>
                      <p className="text-sm text-gray-600">ডকুমেন্ট তৈরির জন্য উপলব্ধ ক্রেডিট</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{creditBalance.currentBalance || 0}</div>
                      <div className="text-sm text-gray-500">উপলব্ধ ক্রেডিট</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-600">{creditBalance.totalSpent || 0}</div>
                      <div className="text-sm text-gray-500">ব্যবহৃত ক্রেডিট</div>
                    </div>
                    
                    <Link href="/credits/supabase-dashboard">
                      <Button className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4" />
                        <span>ক্রেডিট কিনুন</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics Overview */}
          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-300 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                title="মোট ডকুমেন্ট"
                value={stats?.totalGenerated || 0}
                subtitle="এই মাসে তৈরি"
                icon={FileText}
                color="bg-blue-100 text-blue-600"
              />
              <StatCard
                title="ব্যবহৃত ক্রেডিট"
                value={creditBalance?.totalSpent || stats?.creditsUsed || 0}
                subtitle="সর্বমোট"
                icon={CreditCard}
                color="bg-orange-100 text-orange-600"
              />
              <StatCard
                title="বর্তমান ব্যালেন্স"
                value={creditBalance?.currentBalance || stats?.creditsRemaining || 0}
                subtitle="উপলব্ধ ক্রেডিট"
                icon={Wallet}
                color="bg-green-100 text-green-600"
              />
              <StatCard
                title="এ মাসে ব্যবহার"
                value={stats?.monthlyUsed || 0}
                subtitle="চলতি মাসে"
                icon={Target}
                color="bg-purple-100 text-purple-600"
              />
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">সংক্ষিপ্ত বিবরণ</TabsTrigger>
              <TabsTrigger value="categories">ক্যাটাগরি</TabsTrigger>
              <TabsTrigger value="popular">জনপ্রিয়</TabsTrigger>
              <TabsTrigger value="costs">মূল্য তালিকা</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ডকুমেন্ট খুঁজুন... (যেমন: আইডি কার্ড, রসিদ)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
                
                {/* Enhanced Sorting Controls */}
                <div className="flex items-center space-x-2">
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 border rounded-md text-sm bg-white"
                  >
                    <option value="usage">📈 বেশি ব্যবহৃত</option>
                    <option value="name">📝 নাম অনুসারে</option>
                    <option value="category">📂 ক্যাটাগরি</option>
                  </select>
                  
                  <Button
                    variant={showPopularFirst ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowPopularFirst(!showPopularFirst)}
                    className="min-w-[120px] min-h-[44px]"
                  >
                    <Star className="h-4 w-4 mr-1" />
                    জনপ্রিয় প্রথমে
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="min-w-[44px] min-h-[44px]"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="min-w-[44px] min-h-[44px]"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Category Filter Chips */}
              <div className="flex flex-wrap gap-3">
                {categoryConfigs.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? 'default' : 'outline'}
                      onClick={() => setSelectedCategory(category.id)}
                      className="min-h-[44px] space-x-2"
                    >
                      <IconComponent />
                      <span>{language === 'bn' ? category.nameBn : category.name}</span>
                      <Badge variant="secondary" className="ml-2">
                        {category.count}
                      </Badge>
                    </Button>
                  );
                })}
              </div>

              {/* Document Grid */}
              {templatesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-12 bg-gray-200 rounded w-12 mb-4"></div>
                        <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className={cn(
                  "grid gap-6",
                  viewMode === 'grid' 
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
                    : "grid-cols-1"
                )}>
                  {sortedAndFilteredDocuments.map((doc: any) => (
                    <DocumentCard key={doc.id} doc={doc} />
                  ))}
                </div>
              )}

              {sortedAndFilteredDocuments.length === 0 && !templatesLoading && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">কোনো ডকুমেন্ট পাওয়া যায়নি</h3>
                  <p className="text-muted-foreground">
                    অন্য কিওয়ার্ড দিয়ে খোঁজ করুন বা ফিল্টার পরিবর্তন করুন
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories" className="space-y-6">
              <div className="grid gap-6">
                {categoryConfigs.slice(1).map((category) => {
                  const IconComponent = category.icon;
                  const categoryDocs = (allTemplatesData || []).filter((d: any) => d.category === category.id);
                  
                  return (
                    <Card key={category.id} className="overflow-hidden">
                      <CardHeader className={cn("pb-4", category.bgColor)}>
                        <div className="flex items-center space-x-3">
                          <div className={cn("p-3 rounded-lg bg-white", category.color)}>
                            <IconComponent />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{category.nameBn}</CardTitle>
                            <CardDescription className="text-gray-600">
                              {category.description} • {category.count} টি ডকুমেন্ট
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categoryDocs.map((doc: any) => (
                            <Button
                              key={doc.id}
                              variant="ghost"
                              className="h-auto p-4 justify-start text-left"
                              onClick={() => handleDocumentAccess(doc.name, doc.creditsRequired || 1)}
                            >
                              <div className="flex items-center space-x-3 w-full">
                                <span className="text-2xl">{doc.icon || '📄'}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{language === 'bn' ? doc.nameBn : doc.name}</div>
                                  <div className="text-sm text-muted-foreground flex items-center space-x-2">
                                    <span>{doc.creditsRequired || 1} ক্রেডিট</span>
                                    <span>•</span>
                                    <span>{doc.estimatedTime || '২-৩ মিনিট'}</span>
                                  </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Popular Tab */}
            <TabsContent value="popular" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-orange-500" />
                    <span>সবচেয়ে জনপ্রিয় ডকুমেন্ট</span>
                  </CardTitle>
                  <CardDescription>
                    অন্যান্য স্কুল সবচেয়ে বেশি যে ডকুমেন্টগুলো ব্যবহার করে
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {popularDocuments.map((doc: any) => (
                      <DocumentCard key={doc.id} doc={doc} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Document Costs Tab */}
            <TabsContent value="costs" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <span>ডকুমেন্ট মূল্য তালিকা</span>
                  </CardTitle>
                  <CardDescription>
                    প্রতিটি ডকুমেন্ট তৈরির জন্য প্রয়োজনীয় ক্রেডিট
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {costsLoading ? (
                    <div className="space-y-3">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-200 rounded"></div>
                            <div className="w-48 h-4 bg-gray-200 rounded"></div>
                          </div>
                          <div className="w-16 h-4 bg-gray-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : documentCosts && documentCosts.length > 0 ? (
                    <div className="space-y-3">
                      {documentCosts.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{language === 'bn' ? doc.nameBn : doc.name}</div>
                              {doc.category && (
                                <div className="text-sm text-gray-500 capitalize">{doc.category}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <Badge variant="outline" className="font-semibold text-orange-600">
                              {doc.requiredCredits || 1} ক্রেডিট
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() => handleQuickGenerate(doc.id, doc.requiredCredits || 1)}
                              disabled={generateDocumentMutation.isPending}
                              className="flex items-center space-x-1"
                            >
                              <Zap className="h-3 w-3" />
                              <span>তৈরি করুন</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">মূল্য তথ্য লোড হচ্ছে</h3>
                      <p className="text-gray-600">ডকুমেন্ট মূল্য তালিকা শীঘ্রই দেখা যাবে</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Credit Purchase Reminder */}
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <CreditCard className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-orange-800">ক্রেডিট প্রয়োজন?</h3>
                        <p className="text-orange-700">আরও ডকুমেন্ট তৈরির জন্য ক্রেডিট কিনুন</p>
                      </div>
                    </div>
                    <Link href="/credits/supabase-dashboard">
                      <Button className="bg-orange-600 hover:bg-orange-700">
                        ক্রেডিট কিনুন
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ResponsivePageLayout>
    </AppShell>
  );
}
