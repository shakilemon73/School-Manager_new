import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { 
  UserCheck, Plus, Pencil, Trash2, CalendarIcon, Clock, Filter, Wand2, 
  Download, Printer, Bell, RefreshCw, CheckCircle, XCircle, Users
} from "lucide-react";
import { format } from "date-fns";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsivePageLayout } from "@/components/layout/responsive-page-layout";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { AutoDutyAssigner, ExamPDFGenerator } from "@/lib/exam-management-utils";

const invigilationDutySchema = z.object({
  examScheduleId: z.number().min(1, "Exam schedule is required"),
  teacherId: z.number().min(1, "Teacher is required"),
  roomNumber: z.string().min(1, "Room number is required"),
  dutyType: z.string().min(1, "Duty type is required"),
  dutyDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
});

type InvigilationDutyForm = z.infer<typeof invigilationDutySchema>;

const autoAssignSchema = z.object({
  examScheduleId: z.number().min(1, "Exam schedule is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  chiefToAssistantRatio: z.string().default("1:3"),
});

type AutoAssignForm = z.infer<typeof autoAssignSchema>;

const dutySwapSchema = z.object({
  dutyId: z.number().min(1, "Duty is required"),
  toTeacherId: z.number().min(1, "Replacement teacher is required"),
  reason: z.string().min(1, "Reason is required"),
});

type DutySwapForm = z.infer<typeof dutySwapSchema>;

const translations = {
  en: {
    title: "Invigilation Duties",
    subtitle: "Manage teacher duties for exam invigilation",
    assignDuty: "Assign Duty",
    autoAssign: "Auto-Assign",
    assignDutyTitle: "Assign Invigilation Duty",
    editDutyTitle: "Edit Invigilation Duty",
    autoAssignTitle: "Auto-Assign Duties",
    autoAssignDesc: "Automatically assign duties to teachers based on availability",
    exam: "Exam",
    teacher: "Teacher",
    room: "Room",
    dutyType: "Duty Type",
    roomNumber: "Room Number",
    dutyDate: "Duty Date",
    startTime: "Start Time",
    endTime: "End Time",
    startDate: "Start Date",
    endDate: "End Date",
    notes: "Notes",
    selectExam: "Select exam",
    selectTeacher: "Select teacher",
    selectDutyType: "Select duty type",
    enterRoom: "Enter room number",
    enterNotes: "Enter additional notes",
    cancel: "Cancel",
    create: "Assign",
    update: "Update",
    assign: "Assign",
    generate: "Generate",
    invigilationDuties: "Invigilation Duties",
    date: "Date",
    time: "Time",
    actions: "Actions",
    loading: "Loading...",
    noDuties: "No invigilation duties found. Assign the first duty above.",
    deleteConfirm: "Are you sure you want to delete this invigilation duty?",
    success: "Success",
    error: "Error",
    dutyCreated: "Invigilation duty assigned successfully",
    dutyUpdated: "Invigilation duty updated successfully",
    dutyDeleted: "Invigilation duty deleted successfully",
    dutiesAssigned: "Duties assigned automatically",
    chief: "Chief Invigilator",
    assistant: "Assistant Invigilator",
    supervisor: "Supervisor",
    availability: "Teacher Availability",
    swaps: "Duty Swaps",
    requestSwap: "Request Swap",
    swapDuty: "Swap Duty",
    swapReason: "Reason for Swap",
    replacementTeacher: "Replacement Teacher",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    approve: "Approve",
    reject: "Reject",
    notifyAll: "Notify All Teachers",
    exportPDF: "Export PDF",
    teacherWise: "Teacher-wise",
    roomWise: "Room-wise",
    dutyCards: "Duty Cards",
    ratioIndicator: "Chief:Assistant Ratio",
    totalDuties: "Total Duties",
    chiefDuties: "Chief Duties",
    assistantDuties: "Assistant Duties",
    teachersAssigned: "Teachers Assigned",
  },
  bn: {
    title: "তত্ত্বাবধান দায়িত্ব",
    subtitle: "পরীক্ষা তত্ত্বাবধানের জন্য শিক্ষক দায়িত্ব পরিচালনা করুন",
    assignDuty: "দায়িত্ব নিয়োগ করুন",
    autoAssign: "স্বয়ংক্রিয় নিয়োগ",
    assignDutyTitle: "তত্ত্বাবধান দায়িত্ব নিয়োগ করুন",
    editDutyTitle: "তত্ত্বাবধান দায়িত্ব সম্পাদনা করুন",
    autoAssignTitle: "স্বয়ংক্রিয় দায়িত্ব নিয়োগ",
    autoAssignDesc: "উপলব্ধতার ভিত্তিতে শিক্ষকদের স্বয়ংক্রিয়ভাবে দায়িত্ব নিয়োগ করুন",
    exam: "পরীক্ষা",
    teacher: "শিক্ষক",
    room: "রুম",
    dutyType: "দায়িত্বের ধরন",
    roomNumber: "রুম নম্বর",
    dutyDate: "দায়িত্বের তারিখ",
    startTime: "শুরুর সময়",
    endTime: "শেষ সময়",
    startDate: "শুরুর তারিখ",
    endDate: "শেষ তারিখ",
    notes: "নোট",
    selectExam: "পরীক্ষা নির্বাচন করুন",
    selectTeacher: "শিক্ষক নির্বাচন করুন",
    selectDutyType: "দায়িত্বের ধরন নির্বাচন করুন",
    enterRoom: "রুম নম্বর লিখুন",
    enterNotes: "অতিরিক্ত নোট লিখুন",
    cancel: "বাতিল",
    create: "নিয়োগ করুন",
    update: "আপডেট করুন",
    assign: "নিয়োগ করুন",
    generate: "তৈরি করুন",
    invigilationDuties: "তত্ত্বাবধান দায়িত্ব",
    date: "তারিখ",
    time: "সময়",
    actions: "কার্যক্রম",
    loading: "লোড হচ্ছে...",
    noDuties: "কোন তত্ত্বাবধান দায়িত্ব পাওয়া যায়নি। উপরে প্রথম দায়িত্ব নিয়োগ করুন।",
    deleteConfirm: "আপনি কি নিশ্চিত এই তত্ত্বাবধান দায়িত্ব মুছে ফেলতে চান?",
    success: "সফল",
    error: "ত্রুটি",
    dutyCreated: "তত্ত্বাবধান দায়িত্ব সফলভাবে নিয়োগ হয়েছে",
    dutyUpdated: "তত্ত্বাবধান দায়িত্ব সফলভাবে আপডেট হয়েছে",
    dutyDeleted: "তত্ত্বাবধান দায়িত্ব সফলভাবে মুছে ফেলা হয়েছে",
    dutiesAssigned: "দায়িত্ব স্বয়ংক্রিয়ভাবে নিয়োগ হয়েছে",
    chief: "প্রধান তত্ত্বাবধায়ক",
    assistant: "সহকারী তত্ত্বাবধায়ক",
    supervisor: "পরিদর্শক",
    availability: "শিক্ষক উপলব্ধতা",
    swaps: "দায়িত্ব বিনিময়",
    requestSwap: "বিনিময় অনুরোধ",
    swapDuty: "দায়িত্ব বিনিময়",
    swapReason: "বিনিময়ের কারণ",
    replacementTeacher: "প্রতিস্থাপন শিক্ষক",
    pending: "মুলতুবি",
    approved: "অনুমোদিত",
    rejected: "প্রত্যাখ্যাত",
    approve: "অনুমোদন করুন",
    reject: "প্রত্যাখ্যান করুন",
    notifyAll: "সব শিক্ষককে জানান",
    exportPDF: "PDF রপ্তানি করুন",
    teacherWise: "শিক্ষক অনুযায়ী",
    roomWise: "রুম অনুযায়ী",
    dutyCards: "দায়িত্ব কার্ড",
    ratioIndicator: "প্রধান:সহকারী অনুপাত",
    totalDuties: "মোট দায়িত্ব",
    chiefDuties: "প্রধান দায়িত্ব",
    assistantDuties: "সহকারী দায়িত্ব",
    teachersAssigned: "নিয়োজিত শিক্ষক",
  },
};

const dutyTypes = [
  { value: "chief", labelEn: "Chief Invigilator", labelBn: "প্রধান তত্ত্বাবধায়ক" },
  { value: "assistant", labelEn: "Assistant Invigilator", labelBn: "সহকারী তত্ত্বাবধায়ক" },
  { value: "supervisor", labelEn: "Supervisor", labelBn: "পরিদর্শক" },
];

const ratioOptions = [
  { value: "1:2", label: "1:2" },
  { value: "1:3", label: "1:3" },
  { value: "1:4", label: "1:4" },
  { value: "2:5", label: "2:5" },
];

function InvigilationDutiesContent() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { schoolId, authReady, user } = useSupabaseDirectAuth();
  const t = (translations as any)[language] || translations.en;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAutoDialogOpen, setIsAutoDialogOpen] = useState(false);
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [editingDuty, setEditingDuty] = useState<any>(null);
  const [selectedDutyForSwap, setSelectedDutyForSwap] = useState<any>(null);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [currentTab, setCurrentTab] = useState<"duties" | "availability" | "swaps">("duties");

  // Queries
  const { data: duties, isLoading } = useQuery({
    queryKey: ["invigilation-duties", schoolId, selectedExam],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not found');
      
      let query = supabase
        .from("invigilation_duties")
        .select(`
          *,
          exam_schedules (id, subject, exam_date, start_time, end_time),
          teachers (id, name, email)
        `)
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (selectedExam) {
        query = query.eq("exam_schedule_id", selectedExam);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
    refetchInterval: 30000,
  });

  const { data: exams } = useQuery({
    queryKey: ["exam-schedules", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not found');
      const { data, error } = await supabase
        .from("exam_schedules")
        .select("*")
        .eq("school_id", schoolId)
        .order("exam_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: teachers } = useQuery({
    queryKey: ["teachers", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not found');
      const { data, error } = await supabase
        .from("teachers")
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
      if (!schoolId) throw new Error('School ID not found');
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

  const { data: dutySwaps } = useQuery({
    queryKey: ["duty-swaps", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not found');
      const { data, error } = await supabase
        .from("duty_swaps")
        .select(`
          *,
          invigilation_duties!duty_swaps_original_duty_id_fkey (
            id,
            room_number,
            duty_date,
            duty_type,
            exams (name)
          ),
          teachers!duty_swaps_from_teacher_id_fkey (
            id,
            name
          ),
          to_teacher:teachers!duty_swaps_to_teacher_id_fkey (
            id,
            name
          )
        `)
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId && currentTab === "swaps",
  });

  // Forms
  const form = useForm<InvigilationDutyForm>({
    resolver: zodResolver(invigilationDutySchema),
    defaultValues: {
      examScheduleId: 0,
      teacherId: 0,
      roomNumber: "",
      dutyType: "",
      dutyDate: "",
      startTime: "",
      endTime: "",
      notes: "",
    },
  });

  const autoForm = useForm<AutoAssignForm>({
    resolver: zodResolver(autoAssignSchema),
    defaultValues: {
      examScheduleId: 0,
      startDate: "",
      endDate: "",
      chiefToAssistantRatio: "1:3",
    },
  });

  const swapForm = useForm<DutySwapForm>({
    resolver: zodResolver(dutySwapSchema),
    defaultValues: {
      dutyId: 0,
      toTeacherId: 0,
      reason: "",
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: InvigilationDutyForm) => {
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("invigilation_duties")
        .insert([{ 
          exam_schedule_id: data.examScheduleId,
          teacher_id: data.teacherId,
          room_number: data.roomNumber,
          duty_type: data.dutyType,
          duty_date: data.dutyDate || null,
          start_time: data.startTime || null,
          end_time: data.endTime || null,
          notes: data.notes || null,
          school_id: schoolId 
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invigilation-duties"] });
      toast({ title: t.success, description: t.dutyCreated });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InvigilationDutyForm }) => {
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("invigilation_duties")
        .update({ 
          exam_schedule_id: data.examScheduleId,
          teacher_id: data.teacherId,
          room_number: data.roomNumber,
          duty_type: data.dutyType,
          duty_date: data.dutyDate || null,
          start_time: data.startTime || null,
          end_time: data.endTime || null,
          notes: data.notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invigilation-duties"] });
      toast({ title: t.success, description: t.dutyUpdated });
      setIsDialogOpen(false);
      setEditingDuty(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("invigilation_duties")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invigilation-duties"] });
      toast({ title: t.success, description: t.dutyDeleted });
    },
    onError: (error: any) => {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    },
  });

  // Auto-assign mutation
  const autoAssignMutation = useMutation({
    mutationFn: async (data: AutoAssignForm) => {
      if (!schoolId || !teachers || !rooms) throw new Error('Required data not found');

      const [chiefRatio, assistantRatio] = data.chiefToAssistantRatio.split(':').map(Number);
      
      // Prepare teachers data
      const teachersList = teachers.map(t => ({
        id: t.id,
        name: t.name,
        email: t.email || '',
        availability: [], // Could be enhanced to read from teacher_availability table
      }));

      // Prepare rooms data
      const roomsList = rooms.map(r => ({
        id: r.id,
        name: r.name,
        capacity: r.capacity,
      }));

      if (teachersList.length === 0) {
        throw new Error('No teachers available for assignment');
      }

      if (roomsList.length === 0) {
        throw new Error('No rooms available. Please create exam rooms first.');
      }

      // Generate date range
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      const dates: string[] = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }

      // Generate assignments using the engine
      const result = await AutoDutyAssigner.assignDuties(
        teachersList,
        roomsList,
        dates,
        { chiefRatio, assistantRatio }
      );

      // Delete existing duties for this exam schedule
      await supabase
        .from("invigilation_duties")
        .delete()
        .eq("exam_schedule_id", data.examScheduleId)
        .eq("school_id", schoolId);

      // Insert new duties
      const insertData = result.assignments.map(duty => ({
        exam_schedule_id: data.examScheduleId,
        teacher_id: duty.teacherId,
        room_number: duty.roomName,
        duty_type: duty.dutyType,
        school_id: schoolId,
      }));

      const { error } = await supabase
        .from("invigilation_duties")
        .insert(insertData);

      if (error) throw error;

      return result.stats;
    },
    onSuccess: (stats) => {
      queryClient.invalidateQueries({ queryKey: ["invigilation-duties"] });
      toast({
        title: t.success,
        description: `${t.dutiesAssigned}. ${stats.totalAssignments} duties assigned to ${stats.teachersUsed} teachers.`,
      });
      setIsAutoDialogOpen(false);
      autoForm.reset();
    },
    onError: (error: any) => {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    },
  });

  // Duty swap mutations
  const createSwapMutation = useMutation({
    mutationFn: async (data: DutySwapForm) => {
      if (!schoolId || !user) throw new Error('Required data not found');
      
      const duty = duties?.find(d => d.id === data.dutyId);
      if (!duty) throw new Error('Duty not found');

      const { error } = await supabase
        .from("duty_swaps")
        .insert([{
          original_duty_id: data.dutyId,
          from_teacher_id: duty.teacher_id,
          to_teacher_id: data.toTeacherId,
          reason: data.reason,
          status: 'pending',
          school_id: schoolId,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["duty-swaps"] });
      toast({ title: t.success, description: "Swap request created" });
      setIsSwapDialogOpen(false);
      swapForm.reset();
    },
    onError: (error: any) => {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    },
  });

  const approveSwapMutation = useMutation({
    mutationFn: async (swapId: number) => {
      if (!schoolId || !user) throw new Error('Required data not found');
      
      const swap = dutySwaps?.find(s => s.id === swapId);
      if (!swap) throw new Error('Swap not found');

      // Update swap status
      const { error: swapError } = await supabase
        .from("duty_swaps")
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", swapId);
      if (swapError) throw swapError;

      // Update the original duty with new teacher
      const { error: dutyError } = await supabase
        .from("invigilation_duties")
        .update({ teacher_id: swap.to_teacher_id })
        .eq("id", swap.original_duty_id);
      if (dutyError) throw dutyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["duty-swaps"] });
      queryClient.invalidateQueries({ queryKey: ["invigilation-duties"] });
      toast({ title: t.success, description: "Swap approved" });
    },
  });

  const rejectSwapMutation = useMutation({
    mutationFn: async (swapId: number) => {
      if (!user) throw new Error('User not found');
      const { error } = await supabase
        .from("duty_swaps")
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", swapId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["duty-swaps"] });
      toast({ title: t.success, description: "Swap rejected" });
    },
  });

  // Notification mutation
  const notifyAllMutation = useMutation({
    mutationFn: async () => {
      if (!schoolId || !selectedExam) throw new Error('Required data not found');
      
      const examDuties = duties?.filter(d => d.exam_schedule_id === selectedExam);
      if (!examDuties || examDuties.length === 0) {
        throw new Error('No duties found for this exam');
      }

      const uniqueTeachers = [...new Set(examDuties.map(d => d.teacher_id))];
      const exam = exams?.find(e => e.id === selectedExam);

      const notifications = uniqueTeachers.map(teacherId => ({
        title: `Invigilation Duty Assigned`,
        title_bn: `তত্ত্বাবধান দায়িত্ব নিয়োগ`,
        message: `You have been assigned invigilation duty for ${exam?.subject || 'exam'}. Please check your schedule.`,
        message_bn: `আপনাকে ${exam?.subject || 'পরীক্ষার'} জন্য তত্ত্বাবধান দায়িত্ব দেওয়া হয়েছে। অনুগ্রহ করে আপনার সময়সূচী দেখুন।`,
        type: 'info',
        priority: 'high',
        category: 'Invigilation',
        category_bn: 'তত্ত্বাবধান',
        recipient_id: teacherId,
        school_id: schoolId,
      }));

      const { error } = await supabase
        .from("notifications")
        .insert(notifications);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t.success, description: "All teachers notified" });
    },
  });

  // PDF export handler
  const handleExportPDF = async (type: 'teacher' | 'room' | 'cards') => {
    if (!duties || !schoolId) return;
    
    try {
      const exam = exams?.find(e => e.id === selectedExam);
      const examName = exam?.subject || "Exam";

      if (type === 'teacher') {
        const groupedByTeacher = duties.reduce((acc: any, duty: any) => {
          const teacherName = duty.teachers?.name || 'Unknown';
          if (!acc[teacherName]) acc[teacherName] = [];
          acc[teacherName].push(duty);
          return acc;
        }, {});

        for (const [teacherName, teacherDuties] of Object.entries<any>(groupedByTeacher)) {
          const pdf = await ExamPDFGenerator.generateDutyRosterPDF(
            examName,
            teacherDuties.map((d: any) => ({
              teacherName: d.teachers?.name || '',
              roomNumber: d.room_number,
              date: d.duty_date,
              startTime: d.start_time,
              endTime: d.end_time,
              dutyType: d.duty_type,
            })),
            { name: "School Name", address: "School Address" },
            'teacher'
          );
          pdf.save(`duty-roster-${teacherName}.pdf`);
        }
      } else if (type === 'room') {
        const groupedByRoom = duties.reduce((acc: any, duty: any) => {
          if (!acc[duty.room_number]) acc[duty.room_number] = [];
          acc[duty.room_number].push(duty);
          return acc;
        }, {});

        for (const [roomNumber, roomDuties] of Object.entries<any>(groupedByRoom)) {
          const pdf = await ExamPDFGenerator.generateDutyRosterPDF(
            examName,
            roomDuties.map((d: any) => ({
              teacherName: d.teachers?.name || '',
              roomNumber: d.room_number,
              date: d.duty_date,
              startTime: d.start_time,
              endTime: d.end_time,
              dutyType: d.duty_type,
            })),
            { name: "School Name", address: "School Address" },
            'room'
          );
          pdf.save(`duty-roster-${roomNumber}.pdf`);
        }
      }

      toast({ title: t.success, description: "PDF exported successfully" });
    } catch (error: any) {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    }
  };

  // Handlers
  const onSubmit = (data: InvigilationDutyForm) => {
    if (editingDuty) {
      updateMutation.mutate({ id: editingDuty.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const onAutoAssign = (data: AutoAssignForm) => {
    autoAssignMutation.mutate(data);
  };

  const onSwapRequest = (data: DutySwapForm) => {
    createSwapMutation.mutate(data);
  };

  const handleEdit = (duty: any) => {
    setEditingDuty(duty);
    form.reset({
      examScheduleId: duty.exam_schedule_id,
      teacherId: duty.teacher_id,
      roomNumber: duty.room_number,
      dutyType: duty.duty_type,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm(t.deleteConfirm)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSwapRequest = (duty: any) => {
    setSelectedDutyForSwap(duty);
    swapForm.reset({
      dutyId: duty.id,
      toTeacherId: 0,
      reason: "",
    });
    setIsSwapDialogOpen(true);
  };

  if (!authReady) {
    return <div className="flex items-center justify-center h-screen"><div className="text-center py-8">{t.loading}</div></div>;
  }

  // Calculate statistics
  const stats = {
    total: duties?.length || 0,
    chief: duties?.filter((d: any) => d.duty_type === 'chief').length || 0,
    assistant: duties?.filter((d: any) => d.duty_type === 'assistant').length || 0,
    teachers: new Set(duties?.map((d: any) => d.teacher_id)).size || 0,
  };

  const currentRatio = stats.chief > 0 ? `1:${Math.round(stats.assistant / stats.chief)}` : '0:0';

  const filteredDuties = selectedExam
    ? duties?.filter((d) => d.exam_schedule_id === selectedExam)
    : duties;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAutoDialogOpen} onOpenChange={setIsAutoDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-auto-assign" size="lg" variant="default">
                <Wand2 className="mr-2 h-4 w-4" />
                {t.autoAssign}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t.autoAssignTitle}</DialogTitle>
                <DialogDescription>{t.autoAssignDesc}</DialogDescription>
              </DialogHeader>
              <Form {...autoForm}>
                <form onSubmit={autoForm.handleSubmit(onAutoAssign)} className="space-y-4">
                  <FormField
                    control={autoForm.control}
                    name="examScheduleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.exam}</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-auto-exam">
                              <SelectValue placeholder={t.selectExam} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {exams?.map((exam) => (
                              <SelectItem key={exam.id} value={exam.id.toString()}>
                                {exam.subject} - {exam.exam_date}
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
                      control={autoForm.control}
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
                      control={autoForm.control}
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
                    control={autoForm.control}
                    name="chiefToAssistantRatio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.ratioIndicator}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-ratio">
                              <SelectValue placeholder="Select ratio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ratioOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Ratio of chief invigilators to assistant invigilators
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAutoDialogOpen(false)}
                      data-testid="button-cancel-auto"
                    >
                      {t.cancel}
                    </Button>
                    <Button
                      type="submit"
                      disabled={autoAssignMutation.isPending}
                      data-testid="button-submit-auto"
                    >
                      {autoAssignMutation.isPending ? t.loading : t.assign}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-assign-duty">
                <Plus className="mr-2 h-4 w-4" />
                {t.assignDuty}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingDuty ? t.editDutyTitle : t.assignDutyTitle}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="examScheduleId"
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
                                  {exam.subject} - {exam.exam_date}
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
                              <SelectTrigger data-testid="select-teacher">
                                <SelectValue placeholder={t.selectTeacher} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teachers?.map((teacher) => (
                                <SelectItem key={teacher.id} value={teacher.id.toString()}>
                                  {teacher.name}
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
                      name="roomNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.roomNumber}</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-room" placeholder={t.enterRoom} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dutyType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.dutyType}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-duty-type">
                                <SelectValue placeholder={t.selectDutyType} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {dutyTypes.map((type) => (
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
                  </div>

                  <FormField
                    control={form.control}
                    name="dutyDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.dutyDate}</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.notes}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            data-testid="input-notes"
                            placeholder={t.enterNotes}
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
                        setEditingDuty(null);
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
                      {editingDuty ? t.update : t.create}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.totalDuties}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.chiefDuties}</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.chief}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.assistantDuties}</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assistant}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.ratioIndicator}</CardTitle>
            <RefreshCw className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentRatio}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Actions */}
      <div className="flex justify-between items-center">
        <Select
          value={selectedExam?.toString() || "all"}
          onValueChange={(value) => setSelectedExam(value === "all" ? null : Number(value))}
        >
          <SelectTrigger className="w-64" data-testid="filter-exam">
            <SelectValue placeholder={t.exam} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exams</SelectItem>
            {exams?.map((exam) => (
              <SelectItem key={exam.id} value={exam.id.toString()}>
                {exam.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          {selectedExam && duties && duties.length > 0 && (
            <Button
              onClick={() => notifyAllMutation.mutate()}
              disabled={notifyAllMutation.isPending}
              variant="outline"
              data-testid="button-notify-all"
            >
              <Bell className="mr-2 h-4 w-4" />
              {t.notifyAll}
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-export">
                <Download className="mr-2 h-4 w-4" />
                {t.exportPDF}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExportPDF('teacher')} data-testid="menu-export-teacher">
                <Printer className="mr-2 h-4 w-4" />
                {t.teacherWise}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportPDF('room')} data-testid="menu-export-room">
                <Printer className="mr-2 h-4 w-4" />
                {t.roomWise}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={(v: any) => setCurrentTab(v)}>
        <TabsList>
          <TabsTrigger value="duties" data-testid="tab-duties">{t.invigilationDuties}</TabsTrigger>
          <TabsTrigger value="swaps" data-testid="tab-swaps">{t.swaps}</TabsTrigger>
        </TabsList>

        <TabsContent value="duties">
          <Card>
            <CardHeader>
              <CardTitle>{t.invigilationDuties}</CardTitle>
              <CardDescription>
                {filteredDuties?.length || 0} {t.invigilationDuties.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">{t.loading}</div>
              ) : filteredDuties && filteredDuties.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.exam}</TableHead>
                      <TableHead>{t.teacher}</TableHead>
                      <TableHead>{t.room}</TableHead>
                      <TableHead>{t.dutyType}</TableHead>
                      <TableHead>{t.date}</TableHead>
                      <TableHead>{t.time}</TableHead>
                      <TableHead>{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDuties.map((duty) => (
                      <TableRow key={duty.id} data-testid={`row-duty-${duty.id}`}>
                        <TableCell>{duty.exams?.name || 'N/A'}</TableCell>
                        <TableCell>{duty.teachers?.name || 'N/A'}</TableCell>
                        <TableCell>{duty.room_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {dutyTypes.find(t => t.value === duty.duty_type)?.[language === 'bn' ? 'labelBn' : 'labelEn'] || duty.duty_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(duty.duty_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{duty.start_time} - {duty.end_time}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSwapRequest(duty)}
                              data-testid={`button-swap-${duty.id}`}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(duty)}
                              data-testid={`button-edit-${duty.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(duty.id)}
                              data-testid={`button-delete-${duty.id}`}
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
                  {t.noDuties}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="swaps">
          <Card>
            <CardHeader>
              <CardTitle>{t.swaps}</CardTitle>
              <CardDescription>Manage duty swap requests</CardDescription>
            </CardHeader>
            <CardContent>
              {dutySwaps && dutySwaps.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From Teacher</TableHead>
                      <TableHead>To Teacher</TableHead>
                      <TableHead>Duty</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dutySwaps.map((swap) => (
                      <TableRow key={swap.id}>
                        <TableCell>{swap.teachers?.name}</TableCell>
                        <TableCell>{swap.to_teacher?.name}</TableCell>
                        <TableCell>
                          {swap.invigilation_duties?.exams?.name} - {swap.invigilation_duties?.room_number}
                        </TableCell>
                        <TableCell>{swap.reason}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              swap.status === 'approved' ? 'default' :
                              swap.status === 'rejected' ? 'destructive' : 'secondary'
                            }
                          >
                            {t[swap.status || 'pending']}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {swap.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => approveSwapMutation.mutate(swap.id)}
                                data-testid={`button-approve-swap-${swap.id}`}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => rejectSwapMutation.mutate(swap.id)}
                                data-testid={`button-reject-swap-${swap.id}`}
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No swap requests found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Swap Dialog */}
      <Dialog open={isSwapDialogOpen} onOpenChange={setIsSwapDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.swapDuty}</DialogTitle>
            <DialogDescription>Request a duty swap with another teacher</DialogDescription>
          </DialogHeader>
          <Form {...swapForm}>
            <form onSubmit={swapForm.handleSubmit(onSwapRequest)} className="space-y-4">
              <FormField
                control={swapForm.control}
                name="toTeacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.replacementTeacher}</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-swap-teacher">
                          <SelectValue placeholder={t.selectTeacher} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teachers?.filter(t => t.id !== selectedDutyForSwap?.teacher_id).map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id.toString()}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={swapForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.swapReason}</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-swap-reason" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSwapDialogOpen(false)}
                  data-testid="button-cancel-swap"
                >
                  {t.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={createSwapMutation.isPending}
                  data-testid="button-submit-swap"
                >
                  {t.requestSwap}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InvigilationDuties() {
  return (
    <AppShell>
      <ResponsivePageLayout title="Invigilation Duties" backButton={false}>
        <InvigilationDutiesContent />
      </ResponsivePageLayout>
    </AppShell>
  );
}
