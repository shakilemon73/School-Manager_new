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
import { Checkbox } from "@/components/ui/checkbox";
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
  Users, Plus, Pencil, Trash2, Wand2, Filter, Download, CheckCircle, 
  XCircle, AlertCircle, BarChart3, Grid3x3, Printer
} from "lucide-react";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsivePageLayout } from "@/components/layout/responsive-page-layout";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { AutoSeatingEngine, ExamPDFGenerator, type SeatingPattern } from "@/lib/exam-management-utils";

const seatingArrangementSchema = z.object({
  examScheduleId: z.number().min(1, "Exam schedule is required"),
  studentId: z.number().min(1, "Student is required"),
  roomNumber: z.string().min(1, "Room number is required"),
  seatNumber: z.string().min(1, "Seat number is required"),
  rowNumber: z.number().min(1, "Row number is required"),
  columnNumber: z.number().min(1, "Column number is required"),
  isSpecialNeeds: z.boolean().default(false),
  specialNeedsNote: z.string().optional(),
});

type SeatingArrangementForm = z.infer<typeof seatingArrangementSchema>;

const autoSeatingSchema = z.object({
  examScheduleId: z.number().min(1, "Exam schedule is required"),
  pattern: z.enum(['zigzag', 'class-mixing', 'roll-sequential', 'roll-random']),
  prioritizeSpecialNeeds: z.boolean().default(true),
  preventClassAdjacency: z.boolean().default(true),
});

type AutoSeatingForm = z.infer<typeof autoSeatingSchema>;

const translations = {
  en: {
    title: "Seating Arrangements",
    subtitle: "Manage and generate seating arrangements for exams",
    autoGenerate: "Auto Generate",
    addArrangement: "Add Arrangement",
    createArrangement: "Create Seating Arrangement",
    editArrangement: "Edit Seating Arrangement",
    exam: "Exam",
    student: "Student",
    room: "Room",
    seat: "Seat",
    position: "Position",
    instructions: "Instructions",
    roomNumber: "Room Number",
    seatNumber: "Seat Number",
    rowNumber: "Row Number",
    columnNumber: "Column Number",
    selectExam: "Select exam",
    selectStudent: "Select student",
    selectPattern: "Select seating pattern",
    enterRoom: "Enter room number",
    enterSeat: "Enter seat number",
    enterInstructions: "Enter special instructions",
    cancel: "Cancel",
    create: "Create",
    update: "Update",
    generate: "Generate",
    seatingArrangements: "Seating Arrangements",
    actions: "Actions",
    loading: "Loading...",
    noArrangements: "No seating arrangements found. Create your first arrangement above.",
    deleteConfirm: "Are you sure you want to delete this seating arrangement?",
    success: "Success",
    error: "Error",
    arrangementCreated: "Seating arrangement created successfully",
    arrangementUpdated: "Seating arrangement updated successfully",
    arrangementDeleted: "Seating arrangement deleted successfully",
    autoGenerateSuccess: "Seating arrangements generated automatically",
    autoGeneratingTitle: "Auto-Generate Seating Arrangement",
    autoGeneratingDesc: "Configure settings for automatic seating generation",
    row: "Row",
    column: "Column",
    pattern: "Seating Pattern",
    zigzag: "Zigzag Pattern",
    classMixing: "Class Mixing",
    rollSequential: "Roll Sequential",
    rollRandom: "Roll Random",
    specialNeeds: "Special Needs",
    specialNeedsNote: "Special Needs Note",
    specialNeedsDesc: "Mark this student as having special needs for priority seating",
    prioritizeSpecialNeeds: "Prioritize Special Needs Students",
    preventClassAdjacency: "Prevent Class Adjacency",
    totalSeats: "Total Seats",
    filledSeats: "Filled Seats",
    availableSeats: "Available Seats",
    specialNeedsSeats: "Special Needs",
    statistics: "Statistics",
    approvalStatus: "Approval Status",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    approveAll: "Approve All",
    approve: "Approve",
    reject: "Reject",
    exportPDF: "Export PDF",
    printSeatingPlan: "Print Seating Plan",
    roomWise: "Room-wise",
    seatSlips: "Seat Slips",
    gridView: "Grid View",
    listView: "List View",
    statsView: "Statistics",
  },
  bn: {
    title: "আসন বিন্যাস",
    subtitle: "পরীক্ষার জন্য আসন বিন্যাস পরিচালনা এবং তৈরি করুন",
    autoGenerate: "স্বয়ংক্রিয় তৈরি",
    addArrangement: "বিন্যাস যোগ করুন",
    createArrangement: "আসন বিন্যাস তৈরি করুন",
    editArrangement: "আসন বিন্যাস সম্পাদনা করুন",
    exam: "পরীক্ষা",
    student: "শিক্ষার্থী",
    room: "রুম",
    seat: "আসন",
    position: "অবস্থান",
    instructions: "নির্দেশনা",
    roomNumber: "রুম নম্বর",
    seatNumber: "আসন নম্বর",
    rowNumber: "সারি নম্বর",
    columnNumber: "কলাম নম্বর",
    selectExam: "পরীক্ষা নির্বাচন করুন",
    selectStudent: "শিক্ষার্থী নির্বাচন করুন",
    selectPattern: "আসন প্যাটার্ন নির্বাচন করুন",
    enterRoom: "রুম নম্বর লিখুন",
    enterSeat: "আসন নম্বর লিখুন",
    enterInstructions: "বিশেষ নির্দেশনা লিখুন",
    cancel: "বাতিল",
    create: "তৈরি করুন",
    update: "আপডেট করুন",
    generate: "তৈরি করুন",
    seatingArrangements: "আসন বিন্যাস",
    actions: "কার্যক্রম",
    loading: "লোড হচ্ছে...",
    noArrangements: "কোন আসন বিন্যাস পাওয়া যায়নি। উপরে প্রথম বিন্যাস তৈরি করুন।",
    deleteConfirm: "আপনি কি নিশ্চিত এই আসন বিন্যাস মুছে ফেলতে চান?",
    success: "সফল",
    error: "ত্রুটি",
    arrangementCreated: "আসন বিন্যাস সফলভাবে তৈরি হয়েছে",
    arrangementUpdated: "আসন বিন্যাস সফলভাবে আপডেট হয়েছে",
    arrangementDeleted: "আসন বিন্যাস সফলভাবে মুছে ফেলা হয়েছে",
    autoGenerateSuccess: "আসন বিন্যাস স্বয়ংক্রিয়ভাবে তৈরি হয়েছে",
    autoGeneratingTitle: "স্বয়ংক্রিয় আসন বিন্যাস",
    autoGeneratingDesc: "স্বয়ংক্রিয় আসন তৈরির জন্য সেটিংস কনফিগার করুন",
    row: "সারি",
    column: "কলাম",
    pattern: "আসন প্যাটার্ন",
    zigzag: "জিগজ্যাগ প্যাটার্ন",
    classMixing: "শ্রেণী মিশ্রণ",
    rollSequential: "রোল ক্রমিক",
    rollRandom: "রোল র্যান্ডম",
    specialNeeds: "বিশেষ প্রয়োজন",
    specialNeedsNote: "বিশেষ প্রয়োজনের নোট",
    specialNeedsDesc: "অগ্রাধিকার আসনের জন্য এই শিক্ষার্থীকে বিশেষ প্রয়োজন হিসাবে চিহ্নিত করুন",
    prioritizeSpecialNeeds: "বিশেষ প্রয়োজন শিক্ষার্থীদের অগ্রাধিকার দিন",
    preventClassAdjacency: "শ্রেণী সংলগ্নতা প্রতিরোধ করুন",
    totalSeats: "মোট আসন",
    filledSeats: "পূর্ণ আসন",
    availableSeats: "উপলব্ধ আসন",
    specialNeedsSeats: "বিশেষ প্রয়োজন",
    statistics: "পরিসংখ্যান",
    approvalStatus: "অনুমোদনের অবস্থা",
    pending: "মুলতুবি",
    approved: "অনুমোদিত",
    rejected: "প্রত্যাখ্যাত",
    approveAll: "সব অনুমোদন করুন",
    approve: "অনুমোদন করুন",
    reject: "প্রত্যাখ্যান করুন",
    exportPDF: "PDF রপ্তানি করুন",
    printSeatingPlan: "আসন পরিকল্পনা মুদ্রণ করুন",
    roomWise: "রুম অনুযায়ী",
    seatSlips: "আসন স্লিপ",
    gridView: "গ্রিড ভিউ",
    listView: "তালিকা ভিউ",
    statsView: "পরিসংখ্যান",
  },
};

const seatingPatterns = [
  { value: "zigzag", labelEn: "Zigzag Pattern", labelBn: "জিগজ্যাগ প্যাটার্ন", desc: "Alternating rows in opposite directions" },
  { value: "class-mixing", labelEn: "Class Mixing", labelBn: "শ্রেণী মিশ্রণ", desc: "Mix students from different classes" },
  { value: "roll-sequential", labelEn: "Roll Sequential", labelBn: "রোল ক্রমিক", desc: "Arrange by roll number sequentially" },
  { value: "roll-random", labelEn: "Roll Random", labelBn: "রোল র্যান্ডম", desc: "Random arrangement of roll numbers" },
];

function SeatingArrangementsContent() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { schoolId, authReady, user } = useSupabaseDirectAuth();
  const t = (translations as any)[language] || translations.en;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAutoDialogOpen, setIsAutoDialogOpen] = useState(false);
  const [editingArrangement, setEditingArrangement] = useState<any>(null);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<"list" | "grid" | "stats">("list");

  // Queries
  const { data: arrangements, isLoading } = useQuery({
    queryKey: ["seating-arrangements", schoolId, selectedExam],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not found');
      
      let query = supabase
        .from("seating_arrangements")
        .select(`
          *,
          exam_schedules (id, subject, exam_date, start_time, end_time),
          students (id, name, roll_number, class, section)
        `)
        .eq("school_id", schoolId)
        .order("room_number", { ascending: true })
        .order("seat_number", { ascending: true });
      
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

  const { data: students } = useQuery({
    queryKey: ["students", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not found');
      const { data, error } = await supabase
        .from("students")
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

  // Forms
  const form = useForm<SeatingArrangementForm>({
    resolver: zodResolver(seatingArrangementSchema),
    defaultValues: {
      examScheduleId: 0,
      studentId: 0,
      roomNumber: "",
      seatNumber: "",
      rowNumber: 1,
      columnNumber: 1,
      isSpecialNeeds: false,
      specialNeedsNote: "",
    },
  });

  const autoForm = useForm<AutoSeatingForm>({
    resolver: zodResolver(autoSeatingSchema),
    defaultValues: {
      examScheduleId: 0,
      pattern: 'zigzag',
      prioritizeSpecialNeeds: true,
      preventClassAdjacency: true,
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: SeatingArrangementForm) => {
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("seating_arrangements")
        .insert([{
          exam_schedule_id: data.examScheduleId,
          student_id: data.studentId,
          room_number: data.roomNumber,
          seat_number: data.seatNumber,
          row_number: data.rowNumber,
          column_number: data.columnNumber,
          is_special_needs: data.isSpecialNeeds,
          special_needs_note: data.specialNeedsNote,
          school_id: schoolId,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seating-arrangements"] });
      toast({ title: t.success, description: t.arrangementCreated });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SeatingArrangementForm }) => {
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("seating_arrangements")
        .update({
          exam_schedule_id: data.examScheduleId,
          student_id: data.studentId,
          room_number: data.roomNumber,
          seat_number: data.seatNumber,
          row_number: data.rowNumber,
          column_number: data.columnNumber,
          is_special_needs: data.isSpecialNeeds,
          special_needs_note: data.specialNeedsNote,
          school_id: schoolId,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seating-arrangements"] });
      toast({ title: t.success, description: t.arrangementUpdated });
      setIsDialogOpen(false);
      setEditingArrangement(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("seating_arrangements")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seating-arrangements"] });
      toast({ title: t.success, description: t.arrangementDeleted });
    },
    onError: (error: any) => {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    },
  });

  // Auto-generation mutation
  const autoGenerateMutation = useMutation({
    mutationFn: async (data: AutoSeatingForm) => {
      if (!schoolId || !rooms || !students) throw new Error('Required data not found');
      
      // Get students for the selected exam
      const examStudents = students.filter(s => s.class).map(s => ({
        id: s.id,
        name: s.name,
        studentId: s.student_id,
        class: s.class || '',
        section: s.section || '',
        rollNumber: s.roll_number || '',
        isSpecialNeeds: false, // Could be enhanced to read from student record
      }));

      if (examStudents.length === 0) {
        throw new Error('No students found for this exam');
      }

      // Prepare rooms data
      const examRooms = rooms.map(r => ({
        id: r.id,
        name: r.name,
        capacity: r.capacity,
        rowsCount: r.rows_count || 5,
        seatsPerRow: r.seats_per_row || Math.ceil(r.capacity / 5),
      }));

      if (examRooms.length === 0) {
        throw new Error('No rooms available. Please create exam rooms first.');
      }

      // Generate seating using the engine
      const result = await AutoSeatingEngine.generateSeating(
        examStudents,
        examRooms,
        data.pattern as SeatingPattern,
        {
          prioritizeSpecialNeeds: data.prioritizeSpecialNeeds,
          preventClassAdjacency: data.preventClassAdjacency,
        }
      );

      // Delete existing arrangements for this exam
      await supabase
        .from("seating_arrangements")
        .delete()
        .eq("exam_schedule_id", data.examScheduleId)
        .eq("school_id", schoolId);

      // Insert new arrangements
      const insertData = result.arrangements.map(arr => ({
        exam_schedule_id: data.examScheduleId,
        student_id: arr.studentId,
        room_id: arr.roomId,
        room_number: arr.roomNumber,
        seat_number: arr.seatNumber,
        row_number: arr.rowNumber,
        column_number: arr.columnNumber,
        is_special_needs: arr.isSpecialNeeds || false,
        special_needs_note: arr.specialNeedsNote,
        school_id: schoolId,
      }));

      const { error } = await supabase
        .from("seating_arrangements")
        .insert(insertData);

      if (error) throw error;

      return result.stats;
    },
    onSuccess: (stats) => {
      queryClient.invalidateQueries({ queryKey: ["seating-arrangements"] });
      toast({
        title: t.success,
        description: `${t.autoGenerateSuccess}. ${stats.totalStudents} students seated in ${stats.roomsUsed} rooms.`,
      });
      setIsAutoDialogOpen(false);
      autoForm.reset();
    },
    onError: (error: any) => {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    },
  });

  // Approval mutation
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!schoolId || !user) throw new Error('Required data not found');
      const { error } = await supabase
        .from("seating_arrangements")
        .update({
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seating-arrangements"] });
      toast({ title: t.success, description: "Arrangement approved" });
    },
  });

  const approveAllMutation = useMutation({
    mutationFn: async () => {
      if (!schoolId || !user || !selectedExam) throw new Error('Required data not found');
      const { error } = await supabase
        .from("seating_arrangements")
        .update({
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("exam_schedule_id", selectedExam)
        .eq("school_id", schoolId)
        .eq("approval_status", "pending");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seating-arrangements"] });
      toast({ title: t.success, description: "All arrangements approved" });
    },
  });

  // Handlers
  const onSubmit = (data: SeatingArrangementForm) => {
    if (editingArrangement) {
      updateMutation.mutate({ id: editingArrangement.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const onAutoGenerate = (data: AutoSeatingForm) => {
    autoGenerateMutation.mutate(data);
  };

  const handleEdit = (arrangement: any) => {
    setEditingArrangement(arrangement);
    form.reset({
      examScheduleId: arrangement.exam_schedule_id,
      studentId: arrangement.student_id,
      roomNumber: arrangement.room_number,
      seatNumber: arrangement.seat_number,
      rowNumber: arrangement.row_number,
      columnNumber: arrangement.column_number,
      isSpecialNeeds: arrangement.is_special_needs || false,
      specialNeedsNote: arrangement.special_needs_note || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm(t.deleteConfirm)) {
      deleteMutation.mutate(id);
    }
  };

  const handleExportPDF = async () => {
    if (!arrangements || !schoolId) return;
    
    try {
      const groupedByRoom = arrangements.reduce((acc: any, arr: any) => {
        if (!acc[arr.room_number]) acc[arr.room_number] = [];
        acc[arr.room_number].push(arr);
        return acc;
      }, {});

      for (const [roomNumber, roomArrangements] of Object.entries<any>(groupedByRoom)) {
        const pdf = await ExamPDFGenerator.generateSeatingPDF(
          arrangements[0]?.exams?.name || "Exam",
          roomNumber,
          roomArrangements.map((a: any) => ({
            seatNumber: a.seat_number,
            rollNumber: a.students?.roll_number || '',
            studentName: a.students?.name || '',
            class: a.students?.class || '',
            studentId: a.students?.student_id || '',
          })),
          { name: "School Name", address: "School Address" }
        );
        pdf.save(`seating-${roomNumber}.pdf`);
      }

      toast({ title: t.success, description: "PDF exported successfully" });
    } catch (error: any) {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    }
  };

  if (!authReady) {
    return <div className="flex items-center justify-center h-screen"><div className="text-center py-8">{t.loading}</div></div>;
  }

  // Calculate statistics
  const stats = {
    total: arrangements?.length || 0,
    specialNeeds: arrangements?.filter((a: any) => a.is_special_needs).length || 0,
    pending: arrangements?.filter((a: any) => a.approval_status === 'pending').length || 0,
    approved: arrangements?.filter((a: any) => a.approval_status === 'approved').length || 0,
  };

  const totalCapacity = rooms?.reduce((sum, r) => sum + r.capacity, 0) || 0;
  const available = totalCapacity - stats.total;

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
              <Button data-testid="button-auto-generate" size="lg" variant="default">
                <Wand2 className="mr-2 h-4 w-4" />
                {t.autoGenerate}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t.autoGeneratingTitle}</DialogTitle>
                <DialogDescription>{t.autoGeneratingDesc}</DialogDescription>
              </DialogHeader>
              <Form {...autoForm}>
                <form onSubmit={autoForm.handleSubmit(onAutoGenerate)} className="space-y-4">
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

                  <FormField
                    control={autoForm.control}
                    name="pattern"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.pattern}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-pattern">
                              <SelectValue placeholder={t.selectPattern} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {seatingPatterns.map((pattern) => (
                              <SelectItem key={pattern.value} value={pattern.value}>
                                <div className="flex flex-col">
                                  <span>{language === 'bn' ? pattern.labelBn : pattern.labelEn}</span>
                                  <span className="text-xs text-muted-foreground">{pattern.desc}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={autoForm.control}
                    name="prioritizeSpecialNeeds"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-special-needs"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t.prioritizeSpecialNeeds}</FormLabel>
                          <FormDescription>
                            Assign front row seats to students with special needs
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={autoForm.control}
                    name="preventClassAdjacency"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-prevent-adjacency"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t.preventClassAdjacency}</FormLabel>
                          <FormDescription>
                            Mix students from different classes to prevent cheating
                          </FormDescription>
                        </div>
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
                      disabled={autoGenerateMutation.isPending}
                      data-testid="button-submit-auto"
                    >
                      {autoGenerateMutation.isPending ? t.loading : t.generate}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-arrangement">
                <Plus className="mr-2 h-4 w-4" />
                {t.addArrangement}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingArrangement ? t.editArrangement : t.createArrangement}
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
                      name="studentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.student}</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(Number(value))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-student">
                                <SelectValue placeholder={t.selectStudent} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {students?.map((student) => (
                                <SelectItem key={student.id} value={student.id.toString()}>
                                  {student.name} ({student.roll_number})
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
                      name="seatNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.seatNumber}</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-seat" placeholder={t.enterSeat} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rowNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.rowNumber}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              data-testid="input-row"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="columnNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.columnNumber}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              data-testid="input-column"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="isSpecialNeeds"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-special-needs-form"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t.specialNeeds}</FormLabel>
                          <FormDescription>{t.specialNeedsDesc}</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch("isSpecialNeeds") && (
                    <FormField
                      control={form.control}
                      name="specialNeedsNote"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.specialNeedsNote}</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="input-special-needs-note" rows={2} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}


                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingArrangement(null);
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
                      {editingArrangement ? t.update : t.create}
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
            <CardTitle className="text-sm font-medium">{t.totalSeats}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCapacity}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.filledSeats}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.availableSeats}</CardTitle>
            <XCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.specialNeedsSeats}</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.specialNeeds}</div>
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
          {selectedExam && stats.pending > 0 && (
            <Button
              onClick={() => approveAllMutation.mutate()}
              disabled={approveAllMutation.isPending}
              data-testid="button-approve-all"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {t.approveAll}
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
              <DropdownMenuItem onClick={handleExportPDF} data-testid="menu-export-pdf">
                <Printer className="mr-2 h-4 w-4" />
                {t.roomWise}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t.seatingArrangements}</CardTitle>
            <Tabs value={currentView} onValueChange={(v: any) => setCurrentView(v)}>
              <TabsList>
                <TabsTrigger value="list" data-testid="tab-list">
                  {t.listView}
                </TabsTrigger>
                <TabsTrigger value="grid" data-testid="tab-grid">
                  <Grid3x3 className="h-4 w-4 mr-2" />
                  {t.gridView}
                </TabsTrigger>
                <TabsTrigger value="stats" data-testid="tab-stats">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {t.statsView}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <CardDescription>
            {arrangements?.length || 0} {t.seatingArrangements.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t.loading}</div>
          ) : currentView === "list" ? (
            arrangements && arrangements.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.exam}</TableHead>
                    <TableHead>{t.student}</TableHead>
                    <TableHead>{t.room}</TableHead>
                    <TableHead>{t.seat}</TableHead>
                    <TableHead>{t.position}</TableHead>
                    <TableHead>{t.approvalStatus}</TableHead>
                    <TableHead>{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arrangements.map((arrangement: any) => (
                    <TableRow key={arrangement.id} data-testid={`row-arrangement-${arrangement.id}`}>
                      <TableCell>{arrangement.exams?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {arrangement.students?.name || 'N/A'}
                          {arrangement.students?.roll_number && ` (${arrangement.students.roll_number})`}
                          {arrangement.is_special_needs && (
                            <Badge variant="outline" className="text-yellow-600">
                              {t.specialNeeds}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{arrangement.room_number}</TableCell>
                      <TableCell>{arrangement.seat_number}</TableCell>
                      <TableCell>
                        {t.row} {arrangement.row_number}, {t.column} {arrangement.column_number}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            arrangement.approval_status === 'approved'
                              ? 'default'
                              : arrangement.approval_status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {t[arrangement.approval_status || 'pending']}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {arrangement.approval_status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => approveMutation.mutate(arrangement.id)}
                              data-testid={`button-approve-${arrangement.id}`}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(arrangement)}
                            data-testid={`button-edit-${arrangement.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(arrangement.id)}
                            data-testid={`button-delete-${arrangement.id}`}
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
                {t.noArrangements}
              </div>
            )
          ) : currentView === "grid" ? (
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {arrangements?.map((arrangement: any) => (
                <div
                  key={arrangement.id}
                  className={`p-3 border rounded-lg text-center cursor-pointer hover:shadow-md transition-shadow ${
                    arrangement.is_special_needs ? 'bg-yellow-50 border-yellow-300' : 'bg-blue-50 border-blue-300'
                  }`}
                  title={`${arrangement.students?.name} - ${arrangement.seat_number}`}
                  data-testid={`seat-${arrangement.id}`}
                >
                  <div className="text-xs font-semibold">{arrangement.seat_number}</div>
                  <div className="text-xs truncate">{arrangement.students?.roll_number}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Approval Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>{t.pending}:</span>
                        <span className="font-bold">{stats.pending}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t.approved}:</span>
                        <span className="font-bold text-green-600">{stats.approved}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Capacity Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Utilization:</span>
                        <span className="font-bold">
                          {totalCapacity > 0 ? Math.round((stats.total / totalCapacity) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${totalCapacity > 0 ? (stats.total / totalCapacity) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SeatingArrangements() {
  return (
    <AppShell>
      <ResponsivePageLayout title="Seating Arrangements" backButton={false}>
        <SeatingArrangementsContent />
      </ResponsivePageLayout>
    </AppShell>
  );
}
