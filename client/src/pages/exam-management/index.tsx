import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Plus, Pencil, Trash2, FileText, Users, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsivePageLayout } from "@/components/layout/responsive-page-layout";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const examSchema = z.object({
  name: z.string().min(1, "Exam name is required"),
  description: z.string().optional(),
  type: z.string().min(1, "Exam type is required"),
  academicYearId: z.number().min(1, "Academic year is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

type ExamForm = z.infer<typeof examSchema>;

const examTypes = [
  { value: "midterm", labelEn: "Mid-Term Exam", labelBn: "মধ্যবর্ষীয় পরীক্ষা" },
  { value: "final", labelEn: "Final Exam", labelBn: "বার্ষিক পরীক্ষা" },
  { value: "half_yearly", labelEn: "Half-Yearly Exam", labelBn: "অর্ধ-বার্ষিক পরীক্ষা" },
  { value: "class_test", labelEn: "Class Test", labelBn: "শ্রেণী পরীক্ষা" },
  { value: "pre_test", labelEn: "Pre-Test Exam", labelBn: "প্রি-টেস্ট পরীক্ষা" },
  { value: "test", labelEn: "Test Exam", labelBn: "টেস্ট পরীক্ষা" },
  { value: "model_test", labelEn: "Model Test", labelBn: "মডেল টেস্ট" },
  { value: "selection_test", labelEn: "Selection Test", labelBn: "নির্বাচনী পরীক্ষা" },
];

const translations = {
  en: {
    title: "Exam Management",
    subtitle: "Create and manage exams for your school",
    addExam: "Create Exam",
    createExam: "Create New Exam",
    editExam: "Edit Exam",
    examName: "Exam Name",
    description: "Description",
    type: "Exam Type",
    academicYear: "Academic Year",
    startDate: "Start Date",
    endDate: "End Date",
    selectType: "Select exam type",
    selectYear: "Select academic year",
    enterName: "Enter exam name",
    enterDescription: "Enter exam description",
    cancel: "Cancel",
    create: "Create",
    update: "Update",
    exams: "Exams",
    duration: "Duration",
    status: "Status",
    actions: "Actions",
    loading: "Loading...",
    noExams: "No exams found. Create your first exam above.",
    deleteConfirm: "Are you sure you want to delete this exam? This will also delete all related schedules, results, and arrangements.",
    success: "Success",
    error: "Error",
    examCreated: "Exam created successfully",
    examUpdated: "Exam updated successfully",
    examDeleted: "Exam deleted successfully",
    active: "Active",
    inactive: "Inactive",
    upcoming: "Upcoming",
    completed: "Completed",
    ongoing: "Ongoing",
    totalExams: "Total Exams",
    activeExams: "Active Exams",
    upcomingExams: "Upcoming Exams",
  },
  bn: {
    title: "পরীক্ষা ব্যবস্থাপনা",
    subtitle: "আপনার স্কুলের জন্য পরীক্ষা তৈরি এবং পরিচালনা করুন",
    addExam: "পরীক্ষা তৈরি করুন",
    createExam: "নতুন পরীক্ষা তৈরি করুন",
    editExam: "পরীক্ষা সম্পাদনা করুন",
    examName: "পরীক্ষার নাম",
    description: "বিবরণ",
    type: "পরীক্ষার ধরন",
    academicYear: "শিক্ষাবর্ষ",
    startDate: "শুরুর তারিখ",
    endDate: "শেষ তারিখ",
    selectType: "পরীক্ষার ধরন নির্বাচন করুন",
    selectYear: "শিক্ষাবর্ষ নির্বাচন করুন",
    enterName: "পরীক্ষার নাম লিখুন",
    enterDescription: "পরীক্ষার বিবরণ লিখুন",
    cancel: "বাতিল",
    create: "তৈরি করুন",
    update: "আপডেট করুন",
    exams: "পরীক্ষা",
    duration: "সময়কাল",
    status: "অবস্থা",
    actions: "কার্যক্রম",
    loading: "লোড হচ্ছে...",
    noExams: "কোন পরীক্ষা পাওয়া যায়নি। উপরে প্রথম পরীক্ষা তৈরি করুন।",
    deleteConfirm: "আপনি কি নিশ্চিত এই পরীক্ষা মুছে ফেলতে চান? এটি সমস্ত সম্পর্কিত সময়সূচী, ফলাফল এবং বিন্যাস মুছে ফেলবে।",
    success: "সফল",
    error: "ত্রুটি",
    examCreated: "পরীক্ষা সফলভাবে তৈরি হয়েছে",
    examUpdated: "পরীক্ষা সফলভাবে আপডেট হয়েছে",
    examDeleted: "পরীক্ষা সফলভাবে মুছে ফেলা হয়েছে",
    active: "সক্রিয়",
    inactive: "নিষ্ক্রিয়",
    upcoming: "আসন্ন",
    completed: "সম্পন্ন",
    ongoing: "চলমান",
    totalExams: "মোট পরীক্ষা",
    activeExams: "সক্রিয় পরীক্ষা",
    upcomingExams: "আসন্ন পরীক্ষা",
  },
};

function ExamManagementContent() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { schoolId, authReady } = useSupabaseDirectAuth();
  const t = translations[language as 'en' | 'bn'] || translations.bn;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);

  const { data: exams, isLoading } = useQuery({
    queryKey: ["/api/exams", schoolId],
    enabled: !!schoolId,
    refetchInterval: 30000,
  });

  const { data: academicYears } = useQuery({
    queryKey: ["/api/academic-years", schoolId],
    enabled: !!schoolId,
  });

  const form = useForm<ExamForm>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "",
      academicYearId: 0,
      startDate: "",
      endDate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ExamForm) => {
      const response = await apiRequest("/api/exams", {
        method: "POST",
        body: {
          name: data.name,
          description: data.description,
          type: data.type,
          academic_year_id: data.academicYearId,
          start_date: data.startDate,
          end_date: data.endDate,
          is_active: true,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams", schoolId] });
      toast({
        title: t.success,
        description: t.examCreated,
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ExamForm }) => {
      const response = await apiRequest(`/api/exams/${id}`, {
        method: "PUT",
        body: {
          name: data.name,
          description: data.description,
          type: data.type,
          academic_year_id: data.academicYearId,
          start_date: data.startDate,
          end_date: data.endDate,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams", schoolId] });
      toast({
        title: t.success,
        description: t.examUpdated,
      });
      setIsDialogOpen(false);
      setEditingExam(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/exams/${id}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams", schoolId] });
      toast({
        title: t.success,
        description: t.examDeleted,
      });
    },
    onError: (error: any) => {
      toast({
        title: t.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExamForm) => {
    if (editingExam) {
      updateMutation.mutate({ id: editingExam.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (exam: any) => {
    setEditingExam(exam);
    form.reset({
      name: exam.name,
      description: exam.description || "",
      type: exam.type,
      academicYearId: exam.academic_year_id,
      startDate: exam.start_date,
      endDate: exam.end_date,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm(t.deleteConfirm)) {
      deleteMutation.mutate(id);
    }
  };

  const getExamStatus = (exam: any) => {
    const today = new Date();
    const startDate = new Date(exam.start_date);
    const endDate = new Date(exam.end_date);

    if (today < startDate) return { label: t.upcoming, color: "blue" };
    if (today > endDate) return { label: t.completed, color: "gray" };
    return { label: t.ongoing, color: "green" };
  };

  if (!authReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center py-8">{t.loading}</div>
      </div>
    );
  }

  const stats = {
    total: exams?.length || 0,
    active: exams?.filter((e: any) => e.is_active).length || 0,
    upcoming: exams?.filter((e: any) => new Date(e.start_date) > new Date()).length || 0,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-exam" size="lg">
              <Plus className="mr-2 h-4 w-4" />
              {t.addExam}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingExam ? t.editExam : t.createExam}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.examName}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-name" placeholder={t.enterName} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.type}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder={t.selectType} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {examTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {language === 'bn' ? type.labelBn : type.labelEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="academicYearId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.academicYear}</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-academic-year">
                            <SelectValue placeholder={t.selectYear} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {academicYears?.map((year: any) => (
                            <SelectItem key={year.id} value={year.id.toString()}>
                              {year.year}
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
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.startDate}</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.endDate}</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-end-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.description}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          data-testid="input-description"
                          placeholder={t.enterDescription}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingExam(null);
                      form.reset();
                    }}
                    data-testid="button-cancel"
                  >
                    {t.cancel}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {editingExam ? t.update : t.create}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.totalExams}</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.activeExams}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.upcomingExams}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
          </CardContent>
        </Card>
      </div>

      {/* Exams Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t.exams}</CardTitle>
          <CardDescription>
            {exams?.length || 0} {t.exams.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t.loading}</div>
          ) : exams && exams.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.examName}</TableHead>
                  <TableHead>{t.type}</TableHead>
                  <TableHead>{t.academicYear}</TableHead>
                  <TableHead>{t.duration}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead>{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam: any) => {
                  const status = getExamStatus(exam);
                  const examType = examTypes.find(t => t.value === exam.type);
                  
                  return (
                    <TableRow key={exam.id} data-testid={`row-exam-${exam.id}`}>
                      <TableCell className="font-medium">{exam.name}</TableCell>
                      <TableCell>
                        {examType ? (language === 'bn' ? examType.labelBn : examType.labelEn) : exam.type}
                      </TableCell>
                      <TableCell>{exam.academic_years?.year || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(new Date(exam.start_date), 'MMM dd')} - {format(new Date(exam.end_date), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.color === 'green' ? 'default' : status.color === 'blue' ? 'secondary' : 'outline'}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(exam)}
                            data-testid={`button-edit-${exam.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(exam.id)}
                            data-testid={`button-delete-${exam.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {t.noExams}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ExamManagement() {
  return (
    <AppShell>
      <ResponsivePageLayout title="Exam Management">
        <ExamManagementContent />
      </ResponsivePageLayout>
    </AppShell>
  );
}
