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
  Search, Grid3x3, Rows3, Star, TrendingUp, Clock, Users, 
  FileText, CreditCard, Wallet, Target, ChevronRight, BookOpen,
  GraduationCap, Building, DollarSign, Award, Calendar, ArrowRight,
  MessageSquare, FileCheck, UserPlus, Heart, Zap, Filter,
  Receipt, TrendingDown, Bell, FileQuestion, CheckSquare, ListChecks,
  IdCard, UserCheck, ClipboardCheck, CalendarClock, FileSpreadsheet,
  FileSignature, ScrollText, Megaphone, ShieldCheck, Sparkles,
  LayoutGrid, Banknote, BookCheck, FileBarChart, FolderOpen,
  Plus, X, SlidersHorizontal, ArrowUpDown
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
  borderColor: string;
  description: string;
  count: number;
}

const getDocumentIcon = (documentName: string, category?: string) => {
  const iconMap: Record<string, any> = {
    "Student ID Card": IdCard,
    "Teacher ID Card": UserCheck,
    "Admit Card": ClipboardCheck,
    "Class Routine": Calendar,
    "Teacher Routine": CalendarClock,
    "Marksheet": FileCheck,
    "Result Sheet": FileSpreadsheet,
    "Testimonial": ScrollText,
    "Transfer Certificate": FileSignature,
    "Fee Receipt": Receipt,
    "Pay Sheet": Wallet,
    "Income Report": TrendingUp,
    "Expense Sheet": TrendingDown,
    "Admission Form": UserPlus,
    "Office Order": FileText,
    "Notice": Megaphone,
    "Exam Paper": FileQuestion,
    "OMR Sheet": CheckSquare,
    "MCQ Format": ListChecks,
  };

  return iconMap[documentName] || FileText;
};

const getCategoryIcon = (categoryId: string) => {
  const categoryIconMap: Record<string, any> = {
    'financial': Banknote,
    'academic': BookCheck,
    'certificates': Award,
    'administrative': FolderOpen,
    'staff': Users,
    'examination': ClipboardCheck,
    'services': Heart,
    'activities': Sparkles,
    'modern': Zap,
    'all': LayoutGrid
  };
  
  return categoryIconMap[categoryId] || FileText;
};

export default function DocumentsDashboardUX() {
  const { toast } = useToast();
  const isMobile = useMobile();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  const schoolId = useRequireSchoolId();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'usage' | 'popular' | 'name' | 'category'>('popular');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const { language } = useLanguage();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['document-user-stats', schoolId],
    queryFn: async () => {
      return await db.getUserDocumentStats('current_user', schoolId);
    },
    enabled: !!schoolId
  });

  const { data: allTemplatesData, isLoading: allTemplatesLoading } = useQuery({
    queryKey: ['document-templates-all', schoolId, language],
    queryFn: async () => {
      return await db.getDocumentTemplatesEnhanced(schoolId);
    },
    enabled: !!schoolId
  });

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

  const { data: recentDocuments, isLoading: recentLoading } = useQuery({
    queryKey: ['recent-documents', schoolId],
    queryFn: async () => {
      return await db.getRecentDocuments(schoolId);
    },
    enabled: !!schoolId
  });

  const { data: creditBalance, isLoading: creditLoading } = useQuery({
    queryKey: ['credit-stats', schoolId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      return await db.getCreditBalance(user.id, schoolId);
    },
    enabled: !!schoolId
  });

  const { data: documentCosts, isLoading: costsLoading } = useQuery({
    queryKey: ['document-costs'],
    queryFn: async () => {
      return await db.getDocumentCosts();
    }
  });

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
    
    const route = getDocumentRoute(documentName);
    setLocation(route);
  };

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
      studentIds: [1]
    });
  };

  const documentTypes = templateData || [];

  const sortedAndFilteredDocuments = useMemo(() => {
    let filtered = documentTypes;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((doc: any) => 
        doc.nameBn?.toLowerCase().includes(query) ||
        doc.descriptionBn?.toLowerCase().includes(query) ||
        doc.name?.toLowerCase().includes(query)
      );
    }
    
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
    
    let sorted = [...filtered];
    
    switch (sortBy) {
      case 'popular':
        sorted = sorted.sort((a, b) => {
          if (a.isPopular && !b.isPopular) return -1;
          if (!a.isPopular && b.isPopular) return 1;
          return (b.usageCount || 0) - (a.usageCount || 0);
        });
        break;
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
  }, [documentTypes, searchQuery, selectedCategory, sortBy, language]);

  const categoryConfigs: CategoryConfig[] = useMemo(() => {
    const allTemplates = allTemplatesData || [];
    return [
      {
        id: 'all',
        name: 'All Documents',
        nameBn: 'সব ডকুমেন্ট',
        icon: getCategoryIcon('all'),
        color: 'text-gray-700',
        bgColor: 'bg-gray-50 hover:bg-gray-100',
        borderColor: 'border-gray-200',
        description: 'সকল ধরনের ডকুমেন্ট',
        count: allTemplates.length
      },
      {
        id: 'financial',
        name: 'Financial',
        nameBn: 'আর্থিক',
        icon: getCategoryIcon('financial'),
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50 hover:bg-emerald-100',
        borderColor: 'border-emerald-200',
        description: 'ফি, বেতন ও রিপোর্ট',
        count: allTemplates.filter((d: any) => d.category === 'financial').length
      },
      {
        id: 'academic',
        name: 'Academic',
        nameBn: 'একাডেমিক',
        icon: getCategoryIcon('academic'),
        color: 'text-blue-700',
        bgColor: 'bg-blue-50 hover:bg-blue-100',
        borderColor: 'border-blue-200',
        description: 'নম্বরপত্র ও রেকর্ড',
        count: allTemplates.filter((d: any) => d.category === 'academic').length
      },
      {
        id: 'certificates',
        name: 'Certificates',
        nameBn: 'সনদপত্র',
        icon: getCategoryIcon('certificates'),
        color: 'text-purple-700',
        bgColor: 'bg-purple-50 hover:bg-purple-100',
        borderColor: 'border-purple-200',
        description: 'স্থানান্তর ও সনদ',
        count: allTemplates.filter((d: any) => ['certificate', 'recognition', 'graduation'].includes(d.category)).length
      },
      {
        id: 'examination',
        name: 'Examination',
        nameBn: 'পরীক্ষা',
        icon: getCategoryIcon('examination'),
        color: 'text-red-700',
        bgColor: 'bg-red-50 hover:bg-red-100',
        borderColor: 'border-red-200',
        description: 'এডমিট ও প্রশ্নপত্র',
        count: allTemplates.filter((d: any) => d.category === 'examination').length
      },
      {
        id: 'administrative',
        name: 'Administrative',
        nameBn: 'প্রশাসনিক',
        icon: getCategoryIcon('administrative'),
        color: 'text-orange-700',
        bgColor: 'bg-orange-50 hover:bg-orange-100',
        borderColor: 'border-orange-200',
        description: 'অফিসিয়াল কাগজপত্র',
        count: allTemplates.filter((d: any) => ['administrative', 'communication'].includes(d.category)).length
      },
      {
        id: 'staff',
        name: 'Staff',
        nameBn: 'কর্মী',
        icon: getCategoryIcon('staff'),
        color: 'text-teal-700',
        bgColor: 'bg-teal-50 hover:bg-teal-100',
        borderColor: 'border-teal-200',
        description: 'শিক্ষক ও কর্মচারী',
        count: allTemplates.filter((d: any) => d.category === 'staff').length
      }
    ];
  }, [allTemplatesData]);

  const popularDocuments = sortedAndFilteredDocuments.filter((doc: any) => doc.isPopular);

  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': 
        return { 
          color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          label: 'সহজ' 
        };
      case 'medium': 
        return { 
          color: 'bg-amber-100 text-amber-700 border-amber-200',
          label: 'মাঝারি' 
        };
      case 'advanced': 
        return { 
          color: 'bg-rose-100 text-rose-700 border-rose-200',
          label: 'উন্নত' 
        };
      default: 
        return { 
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          label: 'সহজ' 
        };
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color, bgColor }: any) => (
    <Card className="group hover:shadow-md transition-all duration-300 border-0 shadow-sm hover:scale-[1.02]" data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="text-3xl font-bold tracking-tight" data-testid={`stat-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value || 0}
            </div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={cn("p-3 rounded-xl transition-transform duration-300 group-hover:scale-110", bgColor)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const DocumentCard = ({ doc }: { doc: any }) => {
    const IconComponent = getDocumentIcon(doc.name, doc.category);
    const difficultyConfig = getDifficultyConfig(doc.difficulty || 'easy');
    
    return (
      <Card 
        className="group hover:shadow-lg transition-all duration-300 cursor-pointer border hover:border-primary/50 overflow-hidden bg-gradient-to-br from-white to-gray-50/30"
        onClick={() => handleDocumentAccess(doc.name, doc.creditsRequired || 1)}
        role="button"
        tabIndex={0}
        data-testid={`document-card-${doc.id}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleDocumentAccess(doc.name, doc.creditsRequired || 1);
          }
        }}
      >
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
              <IconComponent className="h-6 w-6" />
            </div>
            <div className="flex flex-col items-end gap-2">
              {doc.isPopular && (
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-sm" data-testid={`badge-popular-${doc.id}`}>
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  জনপ্রিয়
                </Badge>
              )}
              <Badge variant="outline" className={cn("border", difficultyConfig.color)} data-testid={`badge-difficulty-${doc.id}`}>
                {difficultyConfig.label}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors" data-testid={`document-name-${doc.id}`}>
              {language === 'bn' ? doc.nameBn : doc.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed" data-testid={`document-description-${doc.id}`}>
              {language === 'bn' ? doc.descriptionBn : doc.description}
            </p>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5" data-testid={`document-time-${doc.id}`}>
                <Clock className="h-4 w-4" />
                <span className="text-xs">{doc.estimatedTime || '২-৩ মিনিট'}</span>
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-primary" data-testid={`document-credits-${doc.id}`}>
                <CreditCard className="h-4 w-4" />
                <span className="text-xs">{doc.requiredCredits || doc.creditsRequired || 1}</span>
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
          </div>
        </CardContent>
      </Card>
    );
  };

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

        <div className="space-y-8 pb-8">
          <div className="text-center space-y-4 pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary mb-2">
              <Sparkles className="h-4 w-4" />
              <span>AI-Powered Document Generation</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              ডকুমেন্ট জেনারেটর
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              আপনার স্কুলের জন্য প্রয়োজনীয় সকল ডকুমেন্ট দ্রুত এবং সহজে তৈরি করুন
            </p>
          </div>

          {!creditLoading && creditBalance && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 text-white overflow-hidden" data-testid="credit-balance-card">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                      <Wallet className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">আপনার ক্রেডিট ব্যালেন্স</h3>
                      <p className="text-sm text-white/80">ডকুমেন্ট তৈরির জন্য উপলব্ধ ক্রেডিট</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-white mb-1" data-testid="credit-balance">{creditBalance.currentBalance || 0}</div>
                      <div className="text-sm text-white/80">উপলব্ধ</div>
                    </div>
                    
                    <div className="h-12 w-px bg-white/30"></div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-white mb-1" data-testid="credit-spent">{creditBalance.totalSpent || 0}</div>
                      <div className="text-sm text-white/80">ব্যবহৃত</div>
                    </div>
                    
                    <Link href="/credits/supabase-dashboard">
                      <Button className="bg-white text-emerald-600 hover:bg-white/90 shadow-lg font-semibold" data-testid="button-buy-credits">
                        <Plus className="h-4 w-4 mr-2" />
                        ক্রেডিট কিনুন
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {statsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                    <div className="h-8 bg-gray-300 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <StatCard
                title="মোট ডকুমেন্ট"
                value={stats?.totalGenerated || 0}
                subtitle="এই মাসে তৈরি"
                icon={FileText}
                color="text-blue-600"
                bgColor="bg-blue-100"
              />
              <StatCard
                title="ব্যবহৃত ক্রেডিট"
                value={creditBalance?.totalSpent || stats?.creditsUsed || 0}
                subtitle="সর্বমোট"
                icon={CreditCard}
                color="text-orange-600"
                bgColor="bg-orange-100"
              />
              <StatCard
                title="বর্তমান ব্যালেন্স"
                value={creditBalance?.currentBalance || stats?.creditsRemaining || 0}
                subtitle="উপলব্ধ ক্রেডিট"
                icon={Wallet}
                color="text-emerald-600"
                bgColor="bg-emerald-100"
              />
              <StatCard
                title="এ মাসে ব্যবহার"
                value={stats?.monthlyUsed || 0}
                subtitle="চলতি মাসে"
                icon={Target}
                color="text-purple-600"
                bgColor="bg-purple-100"
              />
            </div>
          )}

          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="ডকুমেন্ট খুঁজুন... (যেমন: আইডি কার্ড, রসিদ)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 md:h-14 text-base border-2 focus:border-primary"
                  data-testid="input-search"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setViewMode('grid')}
                  className="h-12 md:h-14 px-4"
                  data-testid="button-view-grid"
                >
                  <Grid3x3 className="h-5 w-5" />
                  <span className="ml-2 hidden sm:inline">Grid</span>
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setViewMode('list')}
                  className="h-12 md:h-14 px-4"
                  data-testid="button-view-list"
                >
                  <Rows3 className="h-5 w-5" />
                  <span className="ml-2 hidden sm:inline">List</span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-12 md:h-14 px-4"
                  data-testid="button-toggle-filters"
                >
                  <SlidersHorizontal className="h-5 w-5" />
                  <span className="ml-2 hidden sm:inline">Filters</span>
                </Button>
              </div>
            </div>

            {showFilters && (
              <Card className="border-2 border-primary/20 shadow-sm" data-testid="filters-panel">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      ফিল্টার
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCategory('all');
                        setSortBy('popular');
                        setSearchQuery('');
                      }}
                      data-testid="button-clear-filters"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      সাজান
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { value: 'popular', label: '⭐ জনপ্রিয়', icon: Star },
                        { value: 'usage', label: '📈 বেশি ব্যবহৃত', icon: TrendingUp },
                        { value: 'name', label: '📝 নাম', icon: FileText },
                        { value: 'category', label: '📂 ক্যাটাগরি', icon: FolderOpen }
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={sortBy === option.value ? 'default' : 'outline'}
                          onClick={() => setSortBy(option.value as any)}
                          className="justify-start h-auto py-3"
                          data-testid={`button-sort-${option.value}`}
                        >
                          <option.icon className="h-4 w-4 mr-2" />
                          <span className="text-sm">{option.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      ক্যাটাগরি
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {categoryConfigs.map((category) => {
                        const IconComponent = category.icon;
                        return (
                          <Button
                            key={category.id}
                            variant={selectedCategory === category.id ? 'default' : 'outline'}
                            onClick={() => setSelectedCategory(category.id)}
                            className={cn(
                              "justify-start h-auto py-3 transition-all duration-200",
                              selectedCategory === category.id && "shadow-md"
                            )}
                            data-testid={`button-category-${category.id}`}
                          >
                            <IconComponent className="h-4 w-4 mr-2 flex-shrink-0" />
                            <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                              <span className="text-sm truncate">{language === 'bn' ? category.nameBn : category.name}</span>
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5 flex-shrink-0">
                                {category.count}
                              </Badge>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {templatesLoading ? (
              <div className={cn(
                "grid gap-4 md:gap-6",
                viewMode === 'grid' 
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
                  : "grid-cols-1"
              )}>
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse border-0 shadow-sm">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between">
                        <div className="h-12 w-12 bg-gray-200 rounded-xl"></div>
                        <div className="h-6 w-16 bg-gray-200 rounded"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-6 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      </div>
                      <div className="flex gap-4 pt-2">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sortedAndFilteredDocuments.length > 0 ? (
              <div className={cn(
                "grid gap-4 md:gap-6",
                viewMode === 'grid' 
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                  : "grid-cols-1 max-w-4xl mx-auto"
              )}>
                {sortedAndFilteredDocuments.map((doc: any) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            ) : (
              <Card className="border-2 border-dashed" data-testid="empty-state">
                <CardContent className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">কোনো ডকুমেন্ট পাওয়া যায়নি</h3>
                  <p className="text-muted-foreground mb-6">
                    অন্য কিওয়ার্ড দিয়ে খোঁজ করুন বা ফিল্টার পরিবর্তন করুন
                  </p>
                  <Button 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    data-testid="button-reset-search"
                  >
                    <X className="h-4 w-4 mr-2" />
                    ফিল্টার রিসেট করুন
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </ResponsivePageLayout>
    </AppShell>
  );
}
