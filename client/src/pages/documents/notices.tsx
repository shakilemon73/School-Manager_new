import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { AppShell } from '@/components/layout/app-shell';
import { useMobile } from '@/hooks/use-mobile';
import { LanguageText } from '@/components/ui/language-text';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Megaphone, Plus, Edit, Trash2, Eye, Download, Search } from 'lucide-react';
import { format } from 'date-fns';

// Define schema for notice information
const noticeSchema = z.object({
  title: z.string().min(2, { message: "Notice title is required" }),
  titleInBangla: z.string().optional(),
  noticeType: z.string().min(1, { message: "Notice type is required" }),
  issueDate: z.string().min(1, { message: "Issue date is required" }),
  referenceNumber: z.string().optional(),
  schoolName: z.string().min(1, { message: "School name is required" }),
  schoolNameInBangla: z.string().optional(),
  principalName: z.string().min(1, { message: "Principal name is required" }),
  content: z.string().min(10, { message: "Notice content is required" }),
  contentInBangla: z.string().optional(),
  targetAudience: z.string().min(1, { message: "Target audience is required" }),
  importantNote: z.string().optional()
});

interface Notice {
  id: number;
  title: string;
  title_bn: string | null;
  content: string;
  content_bn: string | null;
  notice_type: string;
  issue_date: string;
  reference_number: string | null;
  school_name: string | null;
  school_name_bn: string | null;
  principal_name: string | null;
  target_audience: string;
  important_note: string | null;
  is_published: boolean;
  views_count: number;
  school_id: number;
  created_at: string;
}

export default function NoticesPage() {
  const isMobile = useMobile();
  const schoolId = useRequireSchoolId();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('list');
  const [previewMode, setPreviewMode] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Notice form setup
  const noticeForm = useForm<z.infer<typeof noticeSchema>>({
    resolver: zodResolver(noticeSchema),
    defaultValues: {
      title: "",
      titleInBangla: "",
      noticeType: "Academic",
      issueDate: new Date().toISOString().split('T')[0],
      referenceNumber: "",
      schoolName: "",
      schoolNameInBangla: "",
      principalName: "",
      content: "",
      contentInBangla: "",
      targetAudience: "All Students and Parents",
      importantNote: ""
    }
  });

  // Fetch notices from Supabase
  const { data: notices = [], isLoading, refetch } = useQuery({
    queryKey: ['notices', schoolId],
    queryFn: async () => {
      console.log('📋 Fetching notices');
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Notice[];
    },
    refetchInterval: 30000,
  });

  // Calculate statistics from real data
  const stats = {
    total: notices.length,
    thisMonth: notices.filter(n => {
      const date = new Date(n.created_at);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
    published: notices.filter(n => n.is_published).length,
    totalViews: notices.reduce((sum, n) => sum + n.views_count, 0),
    types: [...new Set(notices.map(n => n.notice_type))].length,
  };

  // Create notice mutation
  const createNoticeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof noticeSchema>) => {
      const { data: notice, error } = await supabase
        .from('notices')
        .insert({
          title: data.title,
          title_bn: data.titleInBangla || null,
          content: data.content,
          content_bn: data.contentInBangla || null,
          notice_type: data.noticeType,
          issue_date: data.issueDate,
          reference_number: data.referenceNumber || `NOTICE/${new Date().getFullYear()}/${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          school_name: data.schoolName,
          school_name_bn: data.schoolNameInBangla || null,
          principal_name: data.principalName,
          target_audience: data.targetAudience,
          important_note: data.importantNote || null,
          is_published: true,
          school_id: schoolId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return notice;
    },
    onSuccess: () => {
      toast({
        title: "নোটিশ তৈরি হয়েছে",
        description: "আপনার নোটিশ সফলভাবে ডাটাবেসে সেভ হয়েছে",
      });
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      setPreviewMode(false);
      setActiveTab('list');
      noticeForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "ত্রুটি",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update notice mutation
  const updateNoticeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof noticeSchema> }) => {
      const { error } = await supabase
        .from('notices')
        .update({
          title: data.title,
          title_bn: data.titleInBangla || null,
          content: data.content,
          content_bn: data.contentInBangla || null,
          notice_type: data.noticeType,
          issue_date: data.issueDate,
          reference_number: data.referenceNumber,
          school_name: data.schoolName,
          school_name_bn: data.schoolNameInBangla || null,
          principal_name: data.principalName,
          target_audience: data.targetAudience,
          important_note: data.importantNote || null,
        })
        .eq('id', id)
        .eq('school_id', schoolId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "নোটিশ আপডেট হয়েছে",
        description: "নোটিশ সফলভাবে আপডেট করা হয়েছে",
      });
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      setEditingNotice(null);
      setIsDialogOpen(false);
      noticeForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "ত্রুটি",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete notice mutation
  const deleteNoticeMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "নোটিশ মুছে ফেলা হয়েছে",
        description: "নোটিশ সফলভাবে মুছে ফেলা হয়েছে",
      });
      queryClient.invalidateQueries({ queryKey: ['notices'] });
    },
    onError: (error: any) => {
      toast({
        title: "ত্রুটি",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onNoticeSubmit = (data: z.infer<typeof noticeSchema>) => {
    if (editingNotice) {
      updateNoticeMutation.mutate({ id: editingNotice.id, data });
    } else {
      createNoticeMutation.mutate(data);
    }
  };
  
  // Generate PDF function
  const generatePDF = async () => {
    const noticeElement = document.getElementById('notice-preview');
    if (!noticeElement) return;

    const canvas = await html2canvas(noticeElement, {
      scale: 2,
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`notice-${noticeForm.getValues('referenceNumber')}.pdf`);
    
    toast({
      title: "পিডিএফ তৈরি হয়েছে",
      description: "আপনার নোটিশ পিডিএফ হিসেবে সেভ করা হয়েছে",
    });
  };
  
  // Reset form and preview
  const resetForm = () => {
    setPreviewMode(false);
    setEditingNotice(null);
    noticeForm.reset();
  };

  // Handle edit notice
  const handleEditNotice = (notice: Notice) => {
    setEditingNotice(notice);
    noticeForm.reset({
      title: notice.title,
      titleInBangla: notice.title_bn || "",
      noticeType: notice.notice_type,
      issueDate: notice.issue_date,
      referenceNumber: notice.reference_number || "",
      schoolName: notice.school_name || "",
      schoolNameInBangla: notice.school_name_bn || "",
      principalName: notice.principal_name || "",
      content: notice.content,
      contentInBangla: notice.content_bn || "",
      targetAudience: notice.target_audience,
      importantNote: notice.important_note || "",
    });
    setIsDialogOpen(true);
  };

  // Filter notices based on search
  const filteredNotices = notices.filter(notice => 
    !searchQuery || 
    notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (notice.title_bn && notice.title_bn.includes(searchQuery)) ||
    notice.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="container mx-auto p-6 max-w-7xl">
          {/* Modern Gradient Hero Section */}
          <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-8 text-white shadow-2xl mb-8">
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-bold flex items-center gap-4" data-testid="page-title">
                  <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                    <Megaphone className="w-10 h-10" />
                  </div>
                  <LanguageText en="Notice System" bn="বিজ্ঞপ্তি সিস্টেম" ar="نظام الإشعارات" />
                </h1>
                <p className="text-orange-100 text-lg ml-1">
                  <LanguageText 
                    en="Create and manage important notices and announcements" 
                    bn="গুরুত্বপূর্ণ বিজ্ঞপ্তি ও ঘোষণা তৈরি ও পরিচালনা করুন" 
                    ar="إنشاء وإدارة الإشعارات والإعلانات المهمة"
                  />
                </p>
              </div>
              <Button
                onClick={() => {
                  resetForm();
                  setActiveTab('create');
                }}
                className="bg-white text-orange-600 hover:bg-orange-50 shadow-lg"
                size="lg"
                data-testid="button-create-notice"
              >
                <Plus className="w-5 h-5 mr-2" />
                <LanguageText en="New Notice" bn="নতুন বিজ্ঞপ্তি" ar="إشعار جديد" />
              </Button>
            </div>
          </div>

          {/* Enhanced Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white dark:bg-gray-800" data-testid="stat-total">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Megaphone className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      <LanguageText en="Total Notices" bn="মোট বিজ্ঞপ্তি" ar="إجمالي الإشعارات" />
                    </p>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.total}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white dark:bg-gray-800" data-testid="stat-month">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-icons text-blue-600 dark:text-blue-400 text-xl">calendar_today</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">এ মাসের নোটিশ</p>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.thisMonth}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white dark:bg-gray-800" data-testid="stat-published">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      <LanguageText en="Published" bn="প্রকাশিত" ar="منشور" />
                    </p>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.published}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white dark:bg-gray-800" data-testid="stat-views">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-icons text-purple-600 dark:text-purple-400 text-xl">visibility</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      <LanguageText en="Total Views" bn="মোট দর্শক" ar="إجمالي المشاهدات" />
                    </p>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.totalViews}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white dark:bg-gray-800" data-testid="stat-types">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-icons text-amber-600 dark:text-amber-400 text-xl">category</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">নোটিশের ধরন</p>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.types}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for List and Create */}
          <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-notices">
            <TabsList>
              <TabsTrigger value="list" data-testid="tab-list">
                <span className="material-icons mr-2 text-sm">list</span>
                <LanguageText en="Notice List" bn="বিজ্ঞপ্তি তালিকা" ar="قائمة الإشعارات" />
              </TabsTrigger>
              <TabsTrigger value="create" data-testid="tab-create">
                <Plus className="w-4 h-4 mr-2" />
                <LanguageText en="Create New Notice" bn="নতুন বিজ্ঞপ্তি তৈরি করুন" ar="إنشاء إشعار جديد" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-6">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="নোটিশ খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>

              {/* Notices List */}
              {isLoading ? (
                <div className="text-center py-12" data-testid="loading-notices">
                  <p className="text-muted-foreground">লোড হচ্ছে...</p>
                </div>
              ) : filteredNotices.length === 0 ? (
                <Card data-testid="empty-notices">
                  <CardContent className="text-center py-12">
                    <Megaphone className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">কোনো নোটিশ পাওয়া যায়নি</p>
                    <Button
                      variant="link"
                      onClick={() => setActiveTab('create')}
                      className="mt-2"
                    >
                      প্রথম নোটিশ তৈরি করুন
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredNotices.map((notice) => (
                    <Card key={notice.id} className="hover:shadow-lg transition-shadow" data-testid={`notice-card-${notice.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline">{notice.notice_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(notice.created_at), 'dd MMM yyyy')}
                          </span>
                        </div>
                        <CardTitle className="text-xl">{notice.title_bn || notice.title}</CardTitle>
                        {notice.reference_number && (
                          <p className="text-sm text-muted-foreground">Ref: {notice.reference_number}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-4 line-clamp-3">{notice.content_bn || notice.content}</p>
                        <div className="flex gap-2 pt-4 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditNotice(notice)}
                            data-testid={`button-edit-${notice.id}`}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            সম্পাদনা
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm('আপনি কি এই নোটিশটি মুছে ফেলতে চান?')) {
                                deleteNoticeMutation.mutate(notice.id);
                              }
                            }}
                            data-testid={`button-delete-${notice.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="create" className="mt-6">
              <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                <CardHeader className="border-b border-gray-100 dark:border-gray-700">
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    নোটিশ কনফিগারেশন
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                    গুরুত্বপূর্ণ বিজ্ঞপ্তির বিস্তারিত তথ্য প্রদান করুন
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="p-6">
                  <Form {...noticeForm}>
                    <form onSubmit={noticeForm.handleSubmit(onNoticeSubmit)} className="space-y-6">
                      {/* Notice Information Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={noticeForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>শিরোনাম (ইংরেজি)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Half-Yearly Examination Notice" data-testid="input-title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={noticeForm.control}
                          name="titleInBangla"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>শিরোনাম (বাংলা)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="অর্ধ-বার্ষিক পরীক্ষা সংক্রান্ত বিজ্ঞপ্তি" data-testid="input-title-bn" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={noticeForm.control}
                          name="noticeType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>নোটিশের ধরন</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-notice-type">
                                    <SelectValue placeholder="ধরন নির্বাচন করুন" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Academic">একাডেমিক</SelectItem>
                                  <SelectItem value="Administrative">প্রশাসনিক</SelectItem>
                                  <SelectItem value="Event">ইভেন্ট</SelectItem>
                                  <SelectItem value="Emergency">জরুরি</SelectItem>
                                  <SelectItem value="General">সাধারণ</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={noticeForm.control}
                          name="targetAudience"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>লক্ষ্য দর্শক</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-target-audience">
                                    <SelectValue placeholder="দর্শক নির্বাচন করুন" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="All Students">সকল শিক্ষার্থী</SelectItem>
                                  <SelectItem value="All Teachers">সকল শিক্ষক</SelectItem>
                                  <SelectItem value="All Staff">সকল কর্মচারী</SelectItem>
                                  <SelectItem value="All Students and Parents">সকল শিক্ষার্থী ও অভিভাবক</SelectItem>
                                  <SelectItem value="All">সকলের জন্য</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={noticeForm.control}
                          name="issueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ইস্যু তারিখ</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-issue-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={noticeForm.control}
                          name="referenceNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>রেফারেন্স নম্বর (ঐচ্ছিক)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="NOTICE/2025/..." data-testid="input-reference" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={noticeForm.control}
                          name="schoolName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>স্কুলের নাম (ইংরেজি)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Dhaka Public School" data-testid="input-school-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={noticeForm.control}
                          name="schoolNameInBangla"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>স্কুলের নাম (বাংলা)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="ঢাকা পাবলিক স্কুল" data-testid="input-school-name-bn" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={noticeForm.control}
                          name="principalName"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>প্রধান শিক্ষকের নাম</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Professor Mohammad Rahman" data-testid="input-principal-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-4">
                        <FormField
                          control={noticeForm.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>নোটিশ বিষয়বস্তু (ইংরেজি)</FormLabel>
                              <FormControl>
                                <Textarea {...field} rows={5} placeholder="Enter notice content..." data-testid="textarea-content" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={noticeForm.control}
                          name="contentInBangla"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>নোটিশ বিষয়বস্তু (বাংলা)</FormLabel>
                              <FormControl>
                                <Textarea {...field} rows={5} placeholder="বাংলায় নোটিশ বিষয়বস্তু লিখুন..." data-testid="textarea-content-bn" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={noticeForm.control}
                          name="importantNote"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>গুরুত্বপূর্ণ নোট (ঐচ্ছিক)</FormLabel>
                              <FormControl>
                                <Textarea {...field} rows={2} placeholder="Any important notes..." data-testid="textarea-important-note" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="flex gap-4 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <Button 
                          type="submit"
                          disabled={createNoticeMutation.isPending || updateNoticeMutation.isPending}
                          className="flex-1 bg-orange-600 hover:bg-orange-700"
                          data-testid="button-submit"
                        >
                          {createNoticeMutation.isPending || updateNoticeMutation.isPending ? (
                            <>
                              <span className="material-icons mr-2 animate-spin">autorenew</span>
                              সেভ হচ্ছে...
                            </>
                          ) : editingNotice ? (
                            <>
                              <Edit className="w-4 h-4 mr-2" />
                              নোটিশ আপডেট করুন
                            </>
                          ) : (
                            <>
                              <Megaphone className="w-4 h-4 mr-2" />
                              নোটিশ তৈরি করুন
                            </>
                          )}
                        </Button>
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={resetForm}
                          className="px-6"
                          data-testid="button-reset"
                        >
                          <span className="material-icons mr-2">refresh</span>
                          রিসেট
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Edit Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-notice">
              <DialogHeader>
                <DialogTitle>নোটিশ সম্পাদনা করুন</DialogTitle>
                <DialogDescription>নোটিশের তথ্য আপডেট করুন</DialogDescription>
              </DialogHeader>
              <Form {...noticeForm}>
                <form onSubmit={noticeForm.handleSubmit(onNoticeSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={noticeForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>শিরোনাম (ইংরেজি)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={noticeForm.control}
                      name="titleInBangla"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>শিরোনাম (বাংলা)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={noticeForm.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>বিষয়বস্তু</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={6} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      বাতিল
                    </Button>
                    <Button type="submit" disabled={updateNoticeMutation.isPending}>
                      {updateNoticeMutation.isPending ? 'আপডেট হচ্ছে...' : 'আপডেট করুন'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AppShell>
  );
}
