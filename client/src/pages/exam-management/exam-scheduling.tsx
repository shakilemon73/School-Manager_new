import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CalendarIcon, Clock, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsivePageLayout } from "@/components/layout/responsive-page-layout";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const examScheduleSchema = z.object({
  examId: z.number().min(1, "Exam is required"),
  subject: z.string().min(1, "Subject is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  fullMarks: z.number().min(1, "Full marks is required"),
  passMarks: z.number().min(1, "Pass marks is required"),
  classId: z.number().optional(),
});

type ExamScheduleForm = z.infer<typeof examScheduleSchema>;

const translations = {
  en: {
    title: "Exam Scheduling",
    addSchedule: "Add Schedule",
    createSchedule: "Create Exam Schedule",
    editSchedule: "Edit Exam Schedule",
    exam: "Exam",
    subject: "Subject",
    date: "Exam Date",
    startTime: "Start Time",
    endTime: "End Time",
    fullMarks: "Full Marks",
    passMarks: "Pass Marks",
    class: "Class (Optional)",
    selectExam: "Select exam",
    selectClass: "Select class",
    selectSubject: "Select subject",
    cancel: "Cancel",
    create: "Create",
    update: "Update",
    examSchedules: "Exam Schedules",
    time: "Time",
    marks: "Marks",
    actions: "Actions",
    loading: "Loading...",
    noSchedules: "No exam schedules found. Create your first schedule above.",
    deleteConfirm: "Are you sure you want to delete this exam schedule?",
    success: "Success",
    error: "Error",
    scheduleCreated: "Exam schedule created successfully",
    scheduleUpdated: "Exam schedule updated successfully",
    scheduleDeleted: "Exam schedule deleted successfully",
    all: "All",
    pass: "Pass",
  },
  bn: {
    title: "পরীক্ষার সময়সূচী",
    addSchedule: "সময়সূচী যোগ করুন",
    createSchedule: "পরীক্ষার সময়সূচী তৈরি করুন",
    editSchedule: "পরীক্ষার সময়সূচী সম্পাদনা করুন",
    exam: "পরীক্ষা",
    subject: "বিষয়",
    date: "পরীক্ষার তারিখ",
    startTime: "শুরুর সময়",
    endTime: "শেষ সময়",
    fullMarks: "পূর্ণ নম্বর",
    passMarks: "পাশ নম্বর",
    class: "শ্রেণী (ঐচ্ছিক)",
    selectExam: "পরীক্ষা নির্বাচন করুন",
    selectClass: "শ্রেণী নির্বাচন করুন",
    selectSubject: "বিষয় নির্বাচন করুন",
    cancel: "বাতিল",
    create: "তৈরি করুন",
    update: "আপডেট করুন",
    examSchedules: "পরীক্ষার সময়সূচী",
    time: "সময়",
    marks: "নম্বর",
    actions: "কার্যক্রম",
    loading: "লোড হচ্ছে...",
    noSchedules: "কোন পরীক্ষার সময়সূচী পাওয়া যায়নি। উপরে প্রথম সময়সূচী তৈরি করুন।",
    deleteConfirm: "আপনি কি নিশ্চিত এই পরীক্ষার সময়সূচী মুছে ফেলতে চান?",
    success: "সফল",
    error: "ত্রুটি",
    scheduleCreated: "পরীক্ষার সময়সূচী সফলভাবে তৈরি হয়েছে",
    scheduleUpdated: "পরীক্ষার সময়সূচী সফলভাবে আপডেট হয়েছে",
    scheduleDeleted: "পরীক্ষার সময়সূচী সফলভাবে মুছে ফেলা হয়েছে",
    all: "সব",
    pass: "পাশ",
  },
};

function ExamSchedulingContent() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { schoolId, authReady } = useSupabaseDirectAuth();
  const t = (translations as any)[language] || translations.bn;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["exam-schedules", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not found');
      const { data, error } = await supabase
        .from("exam_schedules")
        .select(`
          *,
          exams (
            id,
            name,
            type,
            academic_year_id
          ),
          classes (
            id,
            name
          )
        `)
        .eq("school_id", schoolId)
        .order("date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
    refetchInterval: 30000,
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000,
  });

  const { data: exams } = useQuery({
    queryKey: ["exams", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not found');
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("school_id", schoolId)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not found');
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("school_id", schoolId)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: classes } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not found');
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("school_id", schoolId)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const form = useForm<ExamScheduleForm>({
    resolver: zodResolver(examScheduleSchema),
    defaultValues: {
      examId: 0,
      subject: "",
      date: "",
      startTime: "",
      endTime: "",
      fullMarks: 100,
      passMarks: 33,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ExamScheduleForm) => {
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("exam_schedules")
        .insert([{ 
          exam_id: data.examId,
          subject: data.subject,
          date: data.date,
          start_time: data.startTime,
          end_time: data.endTime,
          full_marks: data.fullMarks,
          pass_marks: data.passMarks,
          class_id: data.classId,
          school_id: schoolId 
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-schedules", schoolId] });
      toast({
        title: t.success,
        description: t.scheduleCreated,
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
    mutationFn: async ({ id, data }: { id: number; data: ExamScheduleForm }) => {
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("exam_schedules")
        .update({ 
          exam_id: data.examId,
          subject: data.subject,
          date: data.date,
          start_time: data.startTime,
          end_time: data.endTime,
          full_marks: data.fullMarks,
          pass_marks: data.passMarks,
          class_id: data.classId,
          school_id: schoolId 
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-schedules", schoolId] });
      toast({
        title: t.success,
        description: t.scheduleUpdated,
      });
      setIsDialogOpen(false);
      setEditingSchedule(null);
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
      const { error } = await supabase
        .from("exam_schedules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-schedules", schoolId] });
      toast({
        title: t.success,
        description: t.scheduleDeleted,
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

  const onSubmit = (data: ExamScheduleForm) => {
    if (editingSchedule) {
      updateMutation.mutate({ id: editingSchedule.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (schedule: any) => {
    setEditingSchedule(schedule);
    form.reset({
      examId: schedule.exam_id,
      subject: schedule.subject,
      date: schedule.date,
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      fullMarks: schedule.full_marks,
      passMarks: schedule.pass_marks,
      classId: schedule.class_id,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm(t.deleteConfirm)) {
      deleteMutation.mutate(id);
    }
  };

  if (!authReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center py-8">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-schedule">
              <Plus className="mr-2 h-4 w-4" />
              {t.addSchedule}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSchedule ? t.editSchedule : t.createSchedule}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="examId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.exam}</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-exam">
                            <SelectValue placeholder={t.selectExam} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {exams?.map((exam) => (
                            <SelectItem key={exam.id} value={exam.id.toString()}>
                              {exam.name}
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
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.subject}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-subject">
                            <SelectValue placeholder={t.selectSubject} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subjects?.map((subject) => (
                            <SelectItem key={subject.id} value={subject.name}>
                              {language === 'bn' && subject.name_bn ? subject.name_bn : subject.name}
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
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.date}</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="classId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.class}</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-class">
                              <SelectValue placeholder={t.selectClass} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {classes?.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id.toString()}>
                                {language === 'bn' && cls.name_in_bangla ? cls.name_in_bangla : cls.name}
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
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.startTime}</FormLabel>
                        <FormControl>
                          <Input {...field} type="time" data-testid="input-start-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.endTime}</FormLabel>
                        <FormControl>
                          <Input {...field} type="time" data-testid="input-end-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fullMarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.fullMarks}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            data-testid="input-full-marks"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="passMarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.passMarks}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            data-testid="input-pass-marks"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingSchedule(null);
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
                    {editingSchedule ? t.update : t.create}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.examSchedules}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t.loading}</div>
          ) : schedules && schedules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.exam}</TableHead>
                  <TableHead>{t.subject}</TableHead>
                  <TableHead>{t.date}</TableHead>
                  <TableHead>{t.time}</TableHead>
                  <TableHead>{t.class}</TableHead>
                  <TableHead>{t.marks}</TableHead>
                  <TableHead>{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id} data-testid={`row-schedule-${schedule.id}`}>
                    <TableCell>{schedule.exams?.name || 'N/A'}</TableCell>
                    <TableCell>{schedule.subject}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(new Date(schedule.date), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        {schedule.start_time} - {schedule.end_time}
                      </div>
                    </TableCell>
                    <TableCell>{schedule.classes?.name || t.all}</TableCell>
                    <TableCell>
                      {schedule.full_marks} ({t.pass}: {schedule.pass_marks})
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(schedule)}
                          data-testid={`button-edit-${schedule.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(schedule.id)}
                          data-testid={`button-delete-${schedule.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {t.noSchedules}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ExamScheduling() {
  return (
    <AppShell>
      <ResponsivePageLayout title="Exam Scheduling" backButton={false}>
        <ExamSchedulingContent />
      </ResponsivePageLayout>
    </AppShell>
  );
}
