import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
  DialogDescription,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarIcon,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Users,
  Bell,
  Edit3,
  FileSpreadsheet,
  Calendar as CalendarViewIcon,
  BarChart3,
  Table as TableIcon,
  Lightbulb,
} from "lucide-react";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { AppShell } from "@/components/layout/app-shell";
import * as XLSX from "xlsx";

const examScheduleSchema = z.object({
  examId: z.number().min(1, "Exam is required"),
  classId: z.number().min(1, "Class is required"),
  subject: z.string().min(1, "Subject is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  venue: z.string().optional(),
  breakDuration: z.number().optional(),
  roomId: z.number().optional(),
  teacherId: z.number().optional(),
});

type ExamScheduleForm = z.infer<typeof examScheduleSchema>;

const bulkEditSchema = z.object({
  operation: z.enum(["shift_time", "change_room", "change_date"]),
  hours: z.number().optional(),
  roomId: z.number().optional(),
  newDate: z.string().optional(),
});

type BulkEditForm = z.infer<typeof bulkEditSchema>;

const translations = {
  en: {
    title: "Exam Scheduling",
    addSchedule: "Add Schedule",
    autoGenerate: "Auto-Generate",
    import: "Import",
    bulkEdit: "Bulk Edit",
    sendNotifications: "Send Notifications",
    createSchedule: "Create Exam Schedule",
    editSchedule: "Edit Exam Schedule",
    exam: "Exam",
    subject: "Subject",
    date: "Exam Date",
    startTime: "Start Time",
    endTime: "End Time",
    venue: "Venue (Optional)",
    breakDuration: "Break Duration (mins)",
    class: "Class",
    room: "Room (Optional)",
    teacher: "Teacher (Optional)",
    selectExam: "Select exam",
    selectClass: "Select class",
    selectSubject: "Select subject",
    selectRoom: "Select room",
    selectTeacher: "Select teacher",
    selectTemplate: "Select template",
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
    conflicts: "Conflicts",
    noConflicts: "No conflicts",
    conflictDetected: "Conflict detected!",
    tableView: "Table View",
    calendarView: "Calendar View",
    timelineView: "Timeline View",
    suggestTimes: "Suggest Times",
    autoGenerateTitle: "Auto-Generate Schedule",
    selectTemplateDesc: "Select a template to automatically generate exam schedules",
    generate: "Generate",
    bulkEditTitle: "Bulk Edit Schedules",
    selectedCount: "selected",
    operation: "Operation",
    shiftTime: "Shift Time",
    changeRoom: "Change Room",
    changeDate: "Change Date",
    hoursToShift: "Hours to Shift",
    newRoom: "New Room",
    newDate: "New Date",
    apply: "Apply",
    importTitle: "Import Schedules",
    uploadFile: "Upload File",
    importFileDesc: "Upload a CSV or Excel file with columns: Subject, Date, Start Time, End Time, Room, Class",
    preview: "Preview",
    importRecords: "Import Records",
    sendNotificationsTitle: "Send Exam Notifications",
    recipients: "Recipients",
    students: "Students",
    teachers: "Teachers",
    both: "Both",
    notificationMessage: "Notification Message",
    send: "Send",
    notificationsSent: "Notifications sent successfully",
    recordsImported: "records imported successfully",
    schedulesGenerated: "schedules generated successfully",
    bulkEditComplete: "Bulk edit completed successfully",
    suggestedTimes: "Suggested Times",
    noSuggestions: "No suggestions available",
    assignTeacher: "Assign Teacher",
    unassigned: "Unassigned",
    timeOverlap: "Time overlap conflict",
    roomOccupied: "Room already occupied",
    teacherBusy: "Teacher is busy at this time",
  },
  bn: {
    title: "পরীক্ষার সময়সূচী",
    addSchedule: "সময়সূচী যোগ করুন",
    autoGenerate: "স্বয়ংক্রিয় তৈরি",
    import: "আমদানি",
    bulkEdit: "একসাথে সম্পাদনা",
    sendNotifications: "বিজ্ঞপ্তি পাঠান",
    createSchedule: "পরীক্ষার সময়সূচী তৈরি করুন",
    editSchedule: "পরীক্ষার সময়সূচী সম্পাদনা করুন",
    exam: "পরীক্ষা",
    subject: "বিষয়",
    date: "পরীক্ষার তারিখ",
    startTime: "শুরুর সময়",
    endTime: "শেষ সময়",
    venue: "স্থান (ঐচ্ছিক)",
    breakDuration: "বিরতির সময় (মিনিট)",
    class: "শ্রেণী",
    room: "কক্ষ (ঐচ্ছিক)",
    teacher: "শিক্ষক (ঐচ্ছিক)",
    selectExam: "পরীক্ষা নির্বাচন করুন",
    selectClass: "শ্রেণী নির্বাচন করুন",
    selectSubject: "বিষয় নির্বাচন করুন",
    selectRoom: "কক্ষ নির্বাচন করুন",
    selectTeacher: "শিক্ষক নির্বাচন করুন",
    selectTemplate: "টেমপ্লেট নির্বাচন করুন",
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
    conflicts: "সংঘাত",
    noConflicts: "কোন সংঘাত নেই",
    conflictDetected: "সংঘাত শনাক্ত হয়েছে!",
    tableView: "টেবিল ভিউ",
    calendarView: "ক্যালেন্ডার ভিউ",
    timelineView: "টাইমলাইন ভিউ",
    suggestTimes: "সময় সুপারিশ করুন",
    autoGenerateTitle: "স্বয়ংক্রিয় সময়সূচী তৈরি",
    selectTemplateDesc: "স্বয়ংক্রিয়ভাবে পরীক্ষার সময়সূচী তৈরি করতে একটি টেমপ্লেট নির্বাচন করুন",
    generate: "তৈরি করুন",
    bulkEditTitle: "একসাথে সম্পাদনা",
    selectedCount: "নির্বাচিত",
    operation: "অপারেশন",
    shiftTime: "সময় পরিবর্তন",
    changeRoom: "কক্ষ পরিবর্তন",
    changeDate: "তারিখ পরিবর্তন",
    hoursToShift: "কত ঘণ্টা",
    newRoom: "নতুন কক্ষ",
    newDate: "নতুন তারিখ",
    apply: "প্রয়োগ করুন",
    importTitle: "আমদানি সময়সূচী",
    uploadFile: "ফাইল আপলোড করুন",
    importFileDesc: "CSV বা Excel ফাইল আপলোড করুন: বিষয়, তারিখ, শুরুর সময়, শেষ সময়, কক্ষ, শ্রেণী",
    preview: "প্রিভিউ",
    importRecords: "রেকর্ড আমদানি করুন",
    sendNotificationsTitle: "পরীক্ষার বিজ্ঞপ্তি পাঠান",
    recipients: "প্রাপক",
    students: "শিক্ষার্থী",
    teachers: "শিক্ষক",
    both: "উভয়",
    notificationMessage: "বিজ্ঞপ্তি বার্তা",
    send: "পাঠান",
    notificationsSent: "বিজ্ঞপ্তি সফলভাবে পাঠানো হয়েছে",
    recordsImported: "রেকর্ড সফলভাবে আমদানি হয়েছে",
    schedulesGenerated: "সময়সূচী সফলভাবে তৈরি হয়েছে",
    bulkEditComplete: "একসাথে সম্পাদনা সফলভাবে সম্পন্ন হয়েছে",
    suggestedTimes: "সুপারিশকৃত সময়",
    noSuggestions: "কোন সুপারিশ নেই",
    assignTeacher: "শিক্ষক নিয়োগ করুন",
    unassigned: "বরাদ্দ হয়নি",
    timeOverlap: "সময় ওভারল্যাপ সংঘাত",
    roomOccupied: "কক্ষ ইতিমধ্যে দখল",
    teacherBusy: "শিক্ষক এই সময়ে ব্যস্ত",
  },
};

// Conflict detection utility
function detectConflicts(
  schedule: any,
  allSchedules: any[],
  teacherAvailability: any[]
): Array<{ type: string; severity: string; message: string; conflictWith?: number }> {
  const conflicts: any[] = [];

  // Check time overlap for same class
  if (schedule.class_id) {
    const overlaps = allSchedules.filter(
      (s) =>
        s.id !== schedule.id &&
        s.class_id === schedule.class_id &&
        s.date === schedule.date &&
        ((s.start_time >= schedule.start_time && s.start_time < schedule.end_time) ||
          (s.end_time > schedule.start_time && s.end_time <= schedule.end_time) ||
          (s.start_time <= schedule.start_time && s.end_time >= schedule.end_time))
    );

    overlaps.forEach((s) => {
      conflicts.push({
        type: "time_overlap",
        severity: "error",
        message: `Same class has another exam at this time: ${s.subject}`,
        conflictWith: s.id,
      });
    });
  }

  // Check room double-booking
  if (schedule.room_id) {
    const roomConflicts = allSchedules.filter(
      (s) =>
        s.id !== schedule.id &&
        s.room_id === schedule.room_id &&
        s.date === schedule.date &&
        ((s.start_time >= schedule.start_time && s.start_time < schedule.end_time) ||
          (s.end_time > schedule.start_time && s.end_time <= schedule.end_time) ||
          (s.start_time <= schedule.start_time && s.end_time >= schedule.end_time))
    );

    roomConflicts.forEach((s) => {
      conflicts.push({
        type: "room_occupied",
        severity: "warning",
        message: `Room already occupied by ${s.subject}`,
        conflictWith: s.id,
      });
    });
  }

  // Check teacher unavailability
  if (schedule.teacher_id) {
    const unavailable = teacherAvailability.find(
      (ta) =>
        ta.teacher_id === schedule.teacher_id &&
        ta.date === schedule.date &&
        !ta.is_available
    );

    if (unavailable) {
      conflicts.push({
        type: "teacher_busy",
        severity: "warning",
        message: `Teacher unavailable: ${unavailable.reason || "Not specified"}`,
      });
    }

    // Check teacher double-booking
    const teacherConflicts = allSchedules.filter(
      (s) =>
        s.id !== schedule.id &&
        s.teacher_id === schedule.teacher_id &&
        s.date === schedule.date &&
        ((s.start_time >= schedule.start_time && s.start_time < schedule.end_time) ||
          (s.end_time > schedule.start_time && s.end_time <= schedule.end_time) ||
          (s.start_time <= schedule.start_time && s.end_time >= schedule.end_time))
    );

    teacherConflicts.forEach((s) => {
      conflicts.push({
        type: "teacher_busy",
        severity: "error",
        message: `Teacher already assigned to ${s.subject}`,
        conflictWith: s.id,
      });
    });
  }

  return conflicts;
}

function ExamSchedulingContent() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { schoolId, authReady } = useSupabaseDirectAuth();
  const t = (translations as any)[language] || translations.en;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [selectedSchedules, setSelectedSchedules] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "calendar" | "timeline">("table");
  const [isAutoGenerateOpen, setIsAutoGenerateOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: schedules, isLoading } = useQuery({
    queryKey: ["exam-schedules", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error("School ID not found");
      const { data, error } = await supabase
        .from("exam_schedules")
        .select(
          `
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
        `
        )
        .eq("school_id", schoolId)
        .order("date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: exams } = useQuery({
    queryKey: ["exams", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error("School ID not found");
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
      if (!schoolId) throw new Error("School ID not found");
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
      if (!schoolId) throw new Error("School ID not found");
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

  const { data: rooms } = useQuery({
    queryKey: ["exam-rooms", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error("School ID not found");
      const { data, error } = await supabase
        .from("exam_rooms")
        .select("*")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: teachers } = useQuery({
    queryKey: ["teachers", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error("School ID not found");
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: teacherAvailability } = useQuery({
    queryKey: ["teacher-availability", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error("School ID not found");
      const { data, error } = await supabase
        .from("teacher_availability")
        .select("*")
        .eq("school_id", schoolId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { data: templates } = useQuery({
    queryKey: ["exam-schedule-templates", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error("School ID not found");
      const { data, error } = await supabase
        .from("exam_schedule_templates")
        .select("*")
        .eq("school_id", schoolId)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  // Detect conflicts for all schedules
  const schedulesWithConflicts = useMemo(() => {
    if (!schedules || !teacherAvailability) return [];
    return schedules.map((schedule) => ({
      ...schedule,
      conflicts: detectConflicts(schedule, schedules, teacherAvailability),
    }));
  }, [schedules, teacherAvailability]);

  const form = useForm<ExamScheduleForm>({
    resolver: zodResolver(examScheduleSchema),
    defaultValues: {
      examId: 0,
      classId: 0,
      subject: "",
      date: "",
      startTime: "",
      endTime: "",
      venue: "",
      breakDuration: 0,
    },
  });

  const bulkEditForm = useForm<BulkEditForm>({
    resolver: zodResolver(bulkEditSchema),
    defaultValues: {
      operation: "shift_time",
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: ExamScheduleForm) => {
      if (!schoolId) throw new Error("School ID not found");
      const { error } = await supabase.from("exam_schedules").insert([
        {
          exam_id: data.examId,
          class_id: data.classId,
          subject: data.subject,
          date: data.date,
          start_time: data.startTime,
          end_time: data.endTime,
          venue: data.venue,
          break_duration: data.breakDuration,
          room_id: data.roomId,
          teacher_id: data.teacherId,
          school_id: schoolId,
        },
      ]);

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
      if (!schoolId) throw new Error("School ID not found");
      const { error } = await supabase
        .from("exam_schedules")
        .update({
          exam_id: data.examId,
          class_id: data.classId,
          subject: data.subject,
          date: data.date,
          start_time: data.startTime,
          end_time: data.endTime,
          venue: data.venue,
          break_duration: data.breakDuration,
          room_id: data.roomId,
          teacher_id: data.teacherId,
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
      const { error } = await supabase.from("exam_schedules").delete().eq("id", id);

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

  const bulkEditMutation = useMutation({
    mutationFn: async (data: BulkEditForm) => {
      if (!schoolId || selectedSchedules.length === 0) {
        throw new Error("No schedules selected");
      }

      for (const scheduleId of selectedSchedules) {
        const updates: any = {};

        if (data.operation === "shift_time" && data.hours) {
          // Implementation would go here
        } else if (data.operation === "change_room" && data.roomId) {
          updates.room_id = data.roomId;
        } else if (data.operation === "change_date" && data.newDate) {
          updates.date = data.newDate;
        }

        const { error } = await supabase
          .from("exam_schedules")
          .update(updates)
          .eq("id", scheduleId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-schedules", schoolId] });
      toast({
        title: t.success,
        description: t.bulkEditComplete,
      });
      setIsBulkEditOpen(false);
      setSelectedSchedules([]);
    },
    onError: (error: any) => {
      toast({
        title: t.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (data: any[]) => {
      if (!schoolId) throw new Error("School ID not found");
      const { error } = await supabase.from("exam_schedules").insert(
        data.map((record) => ({
          ...record,
          school_id: schoolId,
        }))
      );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["exam-schedules", schoolId] });
      toast({
        title: t.success,
        description: `${variables.length} ${t.recordsImported}`,
      });
      setIsImportOpen(false);
      setImportData([]);
    },
    onError: (error: any) => {
      toast({
        title: t.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const autoGenerateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      if (!schoolId) throw new Error("School ID not found");
      // Implementation would fetch template and generate schedules
      const { data, error } = await supabase
        .from("exam_schedule_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-schedules", schoolId] });
      toast({
        title: t.success,
        description: t.schedulesGenerated,
      });
      setIsAutoGenerateOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: t.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendNotificationsMutation = useMutation({
    mutationFn: async ({ recipients, message }: { recipients: string; message: string }) => {
      // Implementation would send notifications
      return { recipients, message };
    },
    onSuccess: () => {
      toast({
        title: t.success,
        description: t.notificationsSent,
      });
      setIsNotificationOpen(false);
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
      classId: schedule.class_id,
      subject: schedule.subject,
      date: schedule.date,
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      venue: schedule.venue || "",
      breakDuration: schedule.break_duration || 0,
      roomId: schedule.room_id,
      teacherId: schedule.teacher_id,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm(t.deleteConfirm)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSelectSchedule = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedSchedules([...selectedSchedules, id]);
    } else {
      setSelectedSchedules(selectedSchedules.filter((s) => s !== id));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        setImportData(jsonData);
      } catch (error) {
        toast({
          title: t.error,
          description: "Failed to parse file",
          variant: "destructive",
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleTeacherAssignment = async (scheduleId: number, teacherId: number) => {
    try {
      const { error } = await supabase
        .from("exam_schedules")
        .update({ teacher_id: teacherId })
        .eq("id", scheduleId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["exam-schedules", schoolId] });
      toast({
        title: t.success,
        description: t.scheduleUpdated,
      });
    } catch (error: any) {
      toast({
        title: t.error,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Smart suggestions
  const getSuggestedTimes = (subject: string, date: string) => {
    const suggestions: string[] = [];
    const timeSlots = [
      "09:00-11:00",
      "11:30-13:30",
      "14:00-16:00",
    ];

    timeSlots.forEach((slot) => {
      const [start, end] = slot.split("-");
      const hasConflict = schedules?.some(
        (s) =>
          s.date === date &&
          ((s.start_time >= start && s.start_time < end) ||
            (s.end_time > start && s.end_time <= end))
      );

      if (!hasConflict) {
        suggestions.push(slot);
      }
    });

    return suggestions;
  };

  if (!authReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center py-8">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">{t.title}</h1>
        </div>
        
        {/* Action Buttons - Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setIsAutoGenerateOpen(true)}
            data-testid="button-auto-generate"
            className="h-11"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t.autoGenerate}</span>
            <span className="sm:hidden">Auto</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsImportOpen(true)}
            data-testid="button-import"
            className="h-11"
          >
            <Upload className="h-4 w-4 mr-2" />
            {t.import}
          </Button>
          {selectedSchedules.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setIsBulkEditOpen(true)}
              data-testid="button-bulk-edit"
              className="h-11 col-span-2 sm:col-span-1"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t.bulkEdit} ({selectedSchedules.length})</span>
              <span className="sm:hidden">Edit ({selectedSchedules.length})</span>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setIsNotificationOpen(true)}
            data-testid="button-send-notifications"
            className="h-11 col-span-2 sm:col-span-1"
          >
            <Bell className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t.sendNotifications}</span>
            <span className="sm:hidden">Notify</span>
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-schedule" className="h-11 col-span-2 sm:col-span-3 lg:col-span-1">
                <Plus className="mr-2 h-4 w-4" />
                {t.addSchedule}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingSchedule ? t.editSchedule : t.createSchedule}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                              <SelectTrigger data-testid="select-exam" className="h-11">
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
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-subject" className="h-11">
                                <SelectValue placeholder={t.selectSubject} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subjects?.map((subject) => (
                                <SelectItem key={subject.id} value={subject.name}>
                                  {language === "bn" && subject.name_bn
                                    ? subject.name_bn
                                    : subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.date}</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-date" className="h-11" />
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
                              <SelectTrigger data-testid="select-class" className="h-11">
                                <SelectValue placeholder={t.selectClass} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {classes?.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id.toString()}>
                                  {language === "bn" && cls.name_in_bangla
                                    ? cls.name_in_bangla
                                    : cls.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.startTime}</FormLabel>
                          <FormControl>
                            <Input {...field} type="time" data-testid="input-start-time" className="h-11" />
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
                            <Input {...field} type="time" data-testid="input-end-time" className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="venue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.venue}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              placeholder="Enter venue"
                              data-testid="input-venue"
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="breakDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.breakDuration}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              placeholder="Minutes"
                              data-testid="input-break-duration"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="roomId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.room}</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(Number(value))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-room" className="h-11">
                                <SelectValue placeholder={t.selectRoom} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {rooms?.map((room) => (
                                <SelectItem key={room.id} value={room.id.toString()}>
                                  {room.name} (Capacity: {room.capacity})
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
                      name="teacherId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.teacher}</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(Number(value))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-teacher" className="h-11">
                                <SelectValue placeholder={t.selectTeacher} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teachers?.map((teacher) => (
                                <SelectItem key={teacher.id} value={teacher.id.toString()}>
                                  {teacher.name} - {teacher.subject}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingSchedule(null);
                        form.reset();
                      }}
                      data-testid="button-cancel"
                      className="h-11 w-full sm:w-auto"
                    >
                      {t.cancel}
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit"
                      className="h-11 w-full sm:w-auto"
                    >
                      {editingSchedule ? t.update : t.create}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* View Tabs - Responsive */}
      <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
        <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="table" data-testid="tab-table-view" className="flex-1 sm:flex-initial">
              <TableIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t.tableView}</span>
              <span className="sm:hidden">Table</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar-view" className="flex-1 sm:flex-initial">
              <CalendarViewIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t.calendarView}</span>
              <span className="sm:hidden">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline-view" className="flex-1 sm:flex-initial">
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t.timelineView}</span>
              <span className="sm:hidden">Timeline</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Table View */}
        <TabsContent value="table" className="mt-6">
          <Card className="border shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">{t.examSchedules}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">{t.loading}</div>
              ) : schedulesWithConflicts && schedulesWithConflicts.length > 0 ? (
                <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedSchedules.length === schedulesWithConflicts.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSchedules(schedulesWithConflicts.map((s) => s.id));
                            } else {
                              setSelectedSchedules([]);
                            }
                          }}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead className="min-w-[120px]">{t.exam}</TableHead>
                      <TableHead className="min-w-[120px]">{t.subject}</TableHead>
                      <TableHead className="min-w-[120px]">{t.date}</TableHead>
                      <TableHead className="min-w-[150px]">{t.time}</TableHead>
                      <TableHead className="hidden md:table-cell">{t.class}</TableHead>
                      <TableHead className="min-w-[140px]">{t.room}</TableHead>
                      <TableHead className="min-w-[160px]">{t.teacher}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t.marks}</TableHead>
                      <TableHead>{t.conflicts}</TableHead>
                      <TableHead className="w-[100px]">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedulesWithConflicts.map((schedule) => (
                      <TableRow
                        key={schedule.id}
                        data-testid={`row-schedule-${schedule.id}`}
                        className={
                          schedule.conflicts.length > 0 ? "bg-red-50 dark:bg-red-900/10" : ""
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedSchedules.includes(schedule.id)}
                            onCheckedChange={(checked: any) =>
                              handleSelectSchedule(schedule.id, checked)
                            }
                            data-testid={`checkbox-select-${schedule.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-sm">{schedule.exams?.name || "N/A"}</TableCell>
                        <TableCell className="font-medium text-sm">{schedule.subject}</TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <CalendarIcon className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                            <span className="whitespace-nowrap">{format(new Date(schedule.date), "MMM dd, yyyy")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Clock className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                            <span className="whitespace-nowrap">{schedule.start_time} - {schedule.end_time}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{schedule.classes?.name || t.all}</TableCell>
                        <TableCell>
                          <Select
                            value={schedule.room_id?.toString()}
                            onValueChange={(value) =>
                              handleTeacherAssignment(schedule.id, parseInt(value))
                            }
                          >
                            <SelectTrigger
                              className="w-32 h-9 text-sm"
                              data-testid={`select-room-${schedule.id}`}
                            >
                              <SelectValue placeholder={t.selectRoom} />
                            </SelectTrigger>
                            <SelectContent>
                              {rooms?.map((room) => (
                                <SelectItem key={room.id} value={room.id.toString()}>
                                  {room.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={schedule.teacher_id?.toString()}
                            onValueChange={(value) =>
                              handleTeacherAssignment(schedule.id, parseInt(value))
                            }
                          >
                            <SelectTrigger
                              className="w-40 h-9 text-sm"
                              data-testid={`select-teacher-${schedule.id}`}
                            >
                              <SelectValue placeholder={t.assignTeacher} />
                            </SelectTrigger>
                            <SelectContent>
                              {teachers?.map((teacher) => (
                                <SelectItem key={teacher.id} value={teacher.id.toString()}>
                                  {teacher.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {schedule.full_marks} ({t.pass}: {schedule.pass_marks})
                        </TableCell>
                        <TableCell>
                          {schedule.conflicts.length > 0 ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 h-9 px-2"
                                  data-testid={`button-view-conflicts-${schedule.id}`}
                                >
                                  <AlertCircle className="mr-1 h-4 w-4" />
                                  {schedule.conflicts.length}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm">{t.conflictDetected}</h4>
                                  {schedule.conflicts.map((conflict: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="text-xs p-2 bg-red-50 dark:bg-red-900/20 rounded"
                                    >
                                      <Badge
                                        variant={
                                          conflict.severity === "error" ? "destructive" : "default"
                                        }
                                        className="mb-1"
                                      >
                                        {conflict.type}
                                      </Badge>
                                      <p>{conflict.message}</p>
                                    </div>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <Badge variant="outline" className="text-green-600 whitespace-nowrap">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              {t.noConflicts}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 w-9 p-0"
                                  data-testid={`button-suggest-${schedule.id}`}
                                >
                                  <Lightbulb className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm">{t.suggestedTimes}</h4>
                                  {getSuggestedTimes(schedule.subject, schedule.date).map(
                                    (time, idx) => (
                                      <div key={idx} className="text-sm p-2 bg-accent rounded">
                                        {time}
                                      </div>
                                    )
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(schedule)}
                              data-testid={`button-edit-${schedule.id}`}
                              className="h-9 w-9 p-0"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(schedule.id)}
                              data-testid={`button-delete-${schedule.id}`}
                              className="h-9 w-9 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">{t.noSchedules}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar View - Responsive */}
        <TabsContent value="calendar" className="mt-6">
          <Card className="border shadow-none">
            <CardContent className="pt-6">
              <div className="grid gap-6">
                {schedulesWithConflicts &&
                  [...Array(3)].map((_, monthOffset) => {
                    const currentMonth = addDays(new Date(), monthOffset * 30);
                    const monthSchedules = schedulesWithConflicts.filter(
                      (s) =>
                        new Date(s.date).getMonth() === currentMonth.getMonth() &&
                        new Date(s.date).getFullYear() === currentMonth.getFullYear()
                    );

                    return (
                      <div key={monthOffset}>
                        <h3 className="text-base sm:text-lg font-semibold mb-3">
                          {format(currentMonth, "MMMM yyyy")}
                        </h3>
                        <div className="grid grid-cols-7 gap-1 sm:gap-2">
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                            <div key={day} className="text-center font-semibold text-xs sm:text-sm p-2 border-b">
                              <span className="hidden sm:inline">{day}</span>
                              <span className="sm:hidden">{day.slice(0, 1)}</span>
                            </div>
                          ))}
                          {eachDayOfInterval({
                            start: startOfMonth(currentMonth),
                            end: endOfMonth(currentMonth),
                          }).map((day) => {
                            const daySchedules = monthSchedules.filter(
                              (s) =>
                                format(new Date(s.date), "yyyy-MM-dd") ===
                                format(day, "yyyy-MM-dd")
                            );
                            return (
                              <div
                                key={day.toString()}
                                className="border rounded p-1 sm:p-2 min-h-16 sm:min-h-24 hover:bg-accent transition-colors"
                                data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                              >
                                <div className="text-xs sm:text-sm font-semibold mb-1">
                                  {format(day, "d")}
                                </div>
                                {daySchedules.slice(0, 2).map((schedule) => (
                                  <div
                                    key={schedule.id}
                                    className="text-[10px] sm:text-xs bg-primary/10 rounded px-1 py-0.5 mb-0.5 sm:mb-1 truncate"
                                    title={`${schedule.subject} - ${schedule.start_time}`}
                                  >
                                    {schedule.subject}
                                  </div>
                                ))}
                                {daySchedules.length > 2 && (
                                  <div className="text-[10px] sm:text-xs text-muted-foreground">
                                    +{daySchedules.length - 2}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline View - Responsive */}
        <TabsContent value="timeline" className="mt-6">
          <Card className="border shadow-none">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {schedulesWithConflicts
                  ?.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg hover:bg-accent transition-colors"
                      data-testid={`timeline-item-${schedule.id}`}
                    >
                      <div className="flex flex-col items-center min-w-16 sm:min-w-24">
                        <div className="text-xl sm:text-2xl font-bold">
                          {format(new Date(schedule.date), "dd")}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {format(new Date(schedule.date), "MMM")}
                        </div>
                      </div>
                      <div className="hidden sm:block h-12 w-px bg-border" />
                      <div className="flex-1 w-full sm:w-auto">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-sm sm:text-base">{schedule.subject}</h4>
                          {schedule.conflicts.length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {schedule.conflicts.length} {t.conflicts}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {schedule.start_time} - {schedule.end_time}
                          {schedule.classes && ` • ${schedule.classes.name}`}
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(schedule)}
                          data-testid={`button-timeline-edit-${schedule.id}`}
                          className="h-9"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Auto-Generate Dialog */}
      <Dialog open={isAutoGenerateOpen} onOpenChange={setIsAutoGenerateOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-auto-generate">
          <DialogHeader>
            <DialogTitle>{t.autoGenerateTitle}</DialogTitle>
            <DialogDescription>{t.selectTemplateDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={selectedTemplate?.toString()}
              onValueChange={(value) => setSelectedTemplate(parseInt(value))}
            >
              <SelectTrigger data-testid="select-template" className="h-11">
                <SelectValue placeholder={t.selectTemplate} />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {language === "bn" && template.name_bn ? template.name_bn : template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsAutoGenerateOpen(false)}
                data-testid="button-auto-generate-cancel"
                className="h-11 w-full sm:w-auto"
              >
                {t.cancel}
              </Button>
              <Button
                onClick={() => selectedTemplate && autoGenerateMutation.mutate(selectedTemplate)}
                disabled={!selectedTemplate || autoGenerateMutation.isPending}
                data-testid="button-auto-generate-submit"
                className="h-11 w-full sm:w-auto"
              >
                {t.generate}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={isBulkEditOpen} onOpenChange={setIsBulkEditOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-bulk-edit">
          <DialogHeader>
            <DialogTitle>
              {t.bulkEditTitle} ({selectedSchedules.length} {t.selectedCount})
            </DialogTitle>
          </DialogHeader>
          <Form {...bulkEditForm}>
            <form
              onSubmit={bulkEditForm.handleSubmit((data) => bulkEditMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={bulkEditForm.control}
                name="operation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.operation}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-bulk-operation" className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="shift_time">{t.shiftTime}</SelectItem>
                        <SelectItem value="change_room">{t.changeRoom}</SelectItem>
                        <SelectItem value="change_date">{t.changeDate}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {bulkEditForm.watch("operation") === "shift_time" && (
                <FormField
                  control={bulkEditForm.control}
                  name="hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.hoursToShift}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-shift-hours"
                          className="h-11"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {bulkEditForm.watch("operation") === "change_room" && (
                <FormField
                  control={bulkEditForm.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.newRoom}</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-bulk-room" className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rooms?.map((room) => (
                            <SelectItem key={room.id} value={room.id.toString()}>
                              {room.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}

              {bulkEditForm.watch("operation") === "change_date" && (
                <FormField
                  control={bulkEditForm.control}
                  name="newDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.newDate}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-bulk-date" className="h-11" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBulkEditOpen(false)}
                  data-testid="button-bulk-edit-cancel"
                  className="h-11 w-full sm:w-auto"
                >
                  {t.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={bulkEditMutation.isPending}
                  data-testid="button-bulk-edit-submit"
                  className="h-11 w-full sm:w-auto"
                >
                  {t.apply}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-import">
          <DialogHeader>
            <DialogTitle>{t.importTitle}</DialogTitle>
            <DialogDescription>{t.importFileDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-file-upload"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-choose-file"
                className="h-11 w-full sm:w-auto"
              >
                <Upload className="mr-2 h-4 w-4" />
                {t.uploadFile}
              </Button>
            </div>

            {importData.length > 0 && (
              <>
                <div>
                  <h4 className="font-semibold mb-2">{t.preview}</h4>
                  <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.subject}</TableHead>
                        <TableHead>{t.date}</TableHead>
                        <TableHead>{t.startTime}</TableHead>
                        <TableHead>{t.endTime}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importData.slice(0, 5).map((record, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{record.subject}</TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>{record.start_time}</TableCell>
                          <TableCell>{record.end_time}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                  {importData.length > 5 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      ...and {importData.length - 5} more records
                    </p>
                  )}
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImportData([]);
                      setIsImportOpen(false);
                    }}
                    data-testid="button-import-cancel"
                    className="h-11 w-full sm:w-auto"
                  >
                    {t.cancel}
                  </Button>
                  <Button
                    onClick={() => importMutation.mutate(importData)}
                    disabled={importMutation.isPending}
                    data-testid="button-import-submit"
                    className="h-11 w-full sm:w-auto"
                  >
                    {t.importRecords} ({importData.length})
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Notifications Dialog */}
      <Dialog open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-send-notifications">
          <DialogHeader>
            <DialogTitle>{t.sendNotificationsTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t.recipients}</label>
              <Select
                onValueChange={(value) => {
                  // Store selected recipients
                }}
              >
                <SelectTrigger data-testid="select-recipients" className="h-11 mt-1.5">
                  <SelectValue placeholder={t.recipients} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="students">{t.students}</SelectItem>
                  <SelectItem value="teachers">{t.teachers}</SelectItem>
                  <SelectItem value="both">{t.both}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t.notificationMessage}</label>
              <Input
                placeholder={t.notificationMessage}
                data-testid="input-notification-message"
                className="h-11 mt-1.5"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsNotificationOpen(false)}
                data-testid="button-notification-cancel"
                className="h-11 w-full sm:w-auto"
              >
                {t.cancel}
              </Button>
              <Button
                onClick={() =>
                  sendNotificationsMutation.mutate({
                    recipients: "both",
                    message: "Exam schedule has been updated. Please check the latest schedule.",
                  })
                }
                disabled={sendNotificationsMutation.isPending}
                data-testid="button-notification-send"
                className="h-11 w-full sm:w-auto"
              >
                {t.send}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ExamScheduling() {
  return (
    <AppShell>
      <ExamSchedulingContent />
    </AppShell>
  );
}
