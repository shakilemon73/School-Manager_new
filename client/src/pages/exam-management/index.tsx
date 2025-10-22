import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CalendarIcon, Plus, Pencil, Trash2, FileText, Users, BookOpen, Download, Copy, Lock, Unlock, Building, MoreVertical, Eye, EyeOff, DoorOpen, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { AppShell } from "@/components/layout/app-shell";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BulkOperations, ExamPDFGenerator } from "@/lib/exam-management-utils";
import { utils as xlsxUtils, write as xlsxWrite } from "xlsx";

const examSchema = z.object({
  name: z.string().min(1, "Exam name is required"),
  description: z.string().optional(),
  type: z.string().min(1, "Exam type is required"),
  academicYearId: z.number().min(1, "Academic year is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

type ExamForm = z.infer<typeof examSchema>;

const roomSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  nameBn: z.string().optional(),
  building: z.string().optional(),
  floor: z.string().optional(),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  rowsCount: z.number().min(1, "Rows count must be at least 1"),
  seatsPerRow: z.number().min(1, "Seats per row must be at least 1"),
  features: z.array(z.string()).optional(),
  isActive: z.boolean(),
});

type RoomForm = z.infer<typeof roomSchema>;

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

const roomFeatures = [
  { value: "projector", labelEn: "Projector", labelBn: "প্রজেক্টর" },
  { value: "ac", labelEn: "AC", labelBn: "এসি" },
  { value: "wheelchair_accessible", labelEn: "Wheelchair Accessible", labelBn: "হুইলচেয়ার অ্যাক্সেসযোগ্য" },
  { value: "whiteboard", labelEn: "Whiteboard", labelBn: "হোয়াইটবোর্ড" },
  { value: "smart_board", labelEn: "Smart Board", labelBn: "স্মার্ট বোর্ড" },
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
    publish: "Publish",
    unpublish: "Unpublish",
    published: "Published",
    draft: "Draft",
    lock: "Lock",
    unlock: "Unlock",
    publishedOn: "Published On",
    lockedOn: "Locked On",
    examPublished: "Exam published successfully",
    examUnpublished: "Exam unpublished successfully",
    examLocked: "Exam locked successfully",
    examUnlocked: "Exam unlocked successfully",
    delete: "Delete",
    edit: "Edit",
    locked: "Locked",
    unlocked: "Unlocked",
    // Room translations
    rooms: "Exam Rooms",
    addRoom: "Add Room",
    createRoom: "Create New Room",
    editRoom: "Edit Room",
    roomName: "Room Name",
    roomNameBn: "Room Name (Bengali)",
    capacity: "Capacity",
    building: "Building",
    floor: "Floor",
    features: "Features",
    rowsCount: "Rows Count",
    seatsPerRow: "Seats Per Row",
    isActive: "Active Status",
    noRooms: "No rooms found. Add your first room.",
    roomCreated: "Room created successfully",
    roomUpdated: "Room updated successfully",
    roomDeleted: "Room deleted successfully",
    deleteRoomConfirm: "Are you sure you want to delete this room?",
    totalRooms: "Total Rooms",
    activeRooms: "Active Rooms",
    totalCapacity: "Total Capacity",
    enterRoomName: "Enter room name",
    enterRoomNameBn: "Enter room name in Bengali",
    enterBuilding: "Enter building name",
    enterFloor: "Enter floor number",
    selectFeatures: "Select room features",
    roomsSubtitle: "Manage exam rooms and their facilities",
    buildingFloor: "Building/Floor",
    calendarView: "Calendar View",
    previousMonth: "Previous Month",
    nextMonth: "Next Month",
    noExamsOnThisDay: "No exams scheduled on this day",
    examsOnThisDay: "Exams on this day",
    viewDetails: "View Details",
    sunday: "Sun",
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
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
    publish: "প্রকাশ করুন",
    unpublish: "প্রকাশ বাতিল করুন",
    published: "প্রকাশিত",
    draft: "খসড়া",
    lock: "লক করুন",
    unlock: "আনলক করুন",
    publishedOn: "প্রকাশিত হয়েছে",
    lockedOn: "লক হয়েছে",
    examPublished: "পরীক্ষা সফলভাবে প্রকাশিত হয়েছে",
    examUnpublished: "পরীক্ষা প্রকাশ বাতিল হয়েছে",
    examLocked: "পরীক্ষা সফলভাবে লক হয়েছে",
    examUnlocked: "পরীক্ষা সফলভাবে আনলক হয়েছে",
    delete: "মুছে ফেলুন",
    edit: "সম্পাদনা করুন",
    locked: "লক",
    unlocked: "আনলক",
    // Room translations
    rooms: "পরীক্ষার কক্ষ",
    addRoom: "কক্ষ যোগ করুন",
    createRoom: "নতুন কক্ষ তৈরি করুন",
    editRoom: "কক্ষ সম্পাদনা করুন",
    roomName: "কক্ষের নাম",
    roomNameBn: "কক্ষের নাম (বাংলা)",
    capacity: "ধারণক্ষমতা",
    building: "ভবন",
    floor: "তলা",
    features: "সুবিধা",
    rowsCount: "সারির সংখ্যা",
    seatsPerRow: "প্রতি সারিতে আসন",
    isActive: "সক্রিয় অবস্থা",
    noRooms: "কোন কক্ষ পাওয়া যায়নি। প্রথম কক্ষ যোগ করুন।",
    roomCreated: "কক্ষ সফলভাবে তৈরি হয়েছে",
    roomUpdated: "কক্ষ সফলভাবে আপডেট হয়েছে",
    roomDeleted: "কক্ষ সফলভাবে মুছে ফেলা হয়েছে",
    deleteRoomConfirm: "আপনি কি নিশ্চিত এই কক্ষ মুছে ফেলতে চান?",
    totalRooms: "মোট কক্ষ",
    activeRooms: "সক্রিয় কক্ষ",
    totalCapacity: "মোট ধারণক্ষমতা",
    enterRoomName: "কক্ষের নাম লিখুন",
    enterRoomNameBn: "বাংলায় কক্ষের নাম লিখুন",
    enterBuilding: "ভবনের নাম লিখুন",
    enterFloor: "তলা নম্বর লিখুন",
    selectFeatures: "কক্ষের সুবিধা নির্বাচন করুন",
    roomsSubtitle: "পরীক্ষা কক্ষ এবং তাদের সুবিধাদি পরিচালনা করুন",
    buildingFloor: "ভবন/তলা",
    calendarView: "ক্যালেন্ডার ভিউ",
    previousMonth: "পূর্ববর্তী মাস",
    nextMonth: "পরবর্তী মাস",
    noExamsOnThisDay: "এই দিনে কোন পরীক্ষা নির্ধারিত নেই",
    examsOnThisDay: "এই দিনের পরীক্ষা",
    viewDetails: "বিস্তারিত দেখুন",
    sunday: "রবি",
    monday: "সোম",
    tuesday: "মঙ্গল",
    wednesday: "বুধ",
    thursday: "বৃহঃ",
    friday: "শুক্র",
    saturday: "শনি",
  },
};

function ExamManagementContent() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { schoolId, authReady } = useSupabaseDirectAuth();
  const t = (translations as any)[language] || translations.bn;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Exam queries
  const { data: exams, isLoading } = useQuery({
    queryKey: ["exams", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not found');
      const { data, error } = await supabase
        .from("exams")
        .select("*, academic_years(id, year)")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
    refetchInterval: 30000,
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000,
  });

  const { data: academicYears } = useQuery({
    queryKey: ["academic-years", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not found');
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Room queries
  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ["exam-rooms", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not found');
      const { data, error } = await supabase
        .from("exam_rooms")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
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

  const roomForm = useForm<RoomForm>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: "",
      nameBn: "",
      building: "",
      floor: "",
      capacity: 30,
      rowsCount: 5,
      seatsPerRow: 6,
      features: [],
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ExamForm) => {
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("exams")
        .insert([{
          name: data.name,
          description: data.description,
          type: data.type,
          academic_year_id: data.academicYearId,
          start_date: data.startDate,
          end_date: data.endDate,
          is_active: true,
          school_id: schoolId,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams", schoolId] });
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
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("exams")
        .update({
          name: data.name,
          description: data.description,
          type: data.type,
          academic_year_id: data.academicYearId,
          start_date: data.startDate,
          end_date: data.endDate,
        })
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams", schoolId] });
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
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("exams")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams", schoolId] });
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

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: number; isPublished: boolean }) => {
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("exams")
        .update({
          is_published: isPublished,
          publish_status: isPublished ? 'published' : 'draft',
          published_at: isPublished ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["exams", schoolId] });
      toast({
        title: t.success,
        description: variables.isPublished ? t.examPublished : t.examUnpublished,
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

  const toggleLockMutation = useMutation({
    mutationFn: async ({ id, isLocked, userId }: { id: number; isLocked: boolean; userId?: string }) => {
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("exams")
        .update({
          is_locked: isLocked,
          locked_by: isLocked ? userId : null,
          locked_at: isLocked ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["exams", schoolId] });
      toast({
        title: t.success,
        description: variables.isLocked ? t.examLocked : t.examUnlocked,
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

  // Room mutations
  const createRoomMutation = useMutation({
    mutationFn: async (data: RoomForm) => {
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("exam_rooms")
        .insert([{
          name: data.name,
          name_bn: data.nameBn || null,
          building: data.building || null,
          floor: data.floor || null,
          capacity: data.capacity,
          rows_count: data.rowsCount,
          seats_per_row: data.seatsPerRow,
          features: data.features || [],
          is_active: data.isActive,
          school_id: schoolId,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-rooms", schoolId] });
      toast({
        title: t.success,
        description: t.roomCreated,
      });
      setIsRoomDialogOpen(false);
      roomForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: t.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: RoomForm }) => {
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("exam_rooms")
        .update({
          name: data.name,
          name_bn: data.nameBn || null,
          building: data.building || null,
          floor: data.floor || null,
          capacity: data.capacity,
          rows_count: data.rowsCount,
          seats_per_row: data.seatsPerRow,
          features: data.features || [],
          is_active: data.isActive,
        })
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-rooms", schoolId] });
      toast({
        title: t.success,
        description: t.roomUpdated,
      });
      setIsRoomDialogOpen(false);
      setEditingRoom(null);
      roomForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: t.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("exam_rooms")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-rooms", schoolId] });
      toast({
        title: t.success,
        description: t.roomDeleted,
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

  const onRoomSubmit = (data: RoomForm) => {
    if (editingRoom) {
      updateRoomMutation.mutate({ id: editingRoom.id, data });
    } else {
      createRoomMutation.mutate(data);
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

  const handleEditRoom = (room: any) => {
    setEditingRoom(room);
    roomForm.reset({
      name: room.name,
      nameBn: room.name_bn || "",
      building: room.building || "",
      floor: room.floor || "",
      capacity: room.capacity,
      rowsCount: room.rows_count || 5,
      seatsPerRow: room.seats_per_row || 6,
      features: room.features || [],
      isActive: room.is_active,
    });
    setIsRoomDialogOpen(true);
  };

  const handleDeleteRoom = (id: number) => {
    if (confirm(t.deleteRoomConfirm)) {
      deleteRoomMutation.mutate(id);
    }
  };

  const getExamStatus = (exam: any) => {
    const today = new Date();
    const start = new Date(exam.start_date);
    const end = new Date(exam.end_date);

    if (today < start) {
      return { label: t.upcoming, color: 'blue' };
    } else if (today > end) {
      return { label: t.completed, color: 'gray' };
    } else {
      return { label: t.ongoing, color: 'green' };
    }
  };

  const stats = {
    total: exams?.length || 0,
    active: exams?.filter((e: any) => e.is_active).length || 0,
    upcoming: exams?.filter((e: any) => {
      const status = getExamStatus(e);
      return status.color === 'blue';
    }).length || 0,
  };

  const roomStats = {
    total: rooms?.length || 0,
    active: rooms?.filter((r: any) => r.is_active).length || 0,
    totalCapacity: rooms?.reduce((sum: number, r: any) => sum + (r.capacity || 0), 0) || 0,
  };

  // Calendar utilities
  const generateCalendarDays = () => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  };

  const getExamsForDay = (day: Date) => {
    return exams?.filter((exam: any) => {
      const examStart = new Date(exam.start_date);
      const examEnd = new Date(exam.end_date);
      return day >= examStart && day <= examEnd;
    }) || [];
  };

  const weekDays = [t.sunday, t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday];

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold">{t.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-exam" className="h-11 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              {t.addExam}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                        <Input {...field} data-testid="input-exam-name" placeholder={t.enterName} className="h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.description}</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-exam-description" placeholder={t.enterDescription} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.type}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-exam-type">
                          <FormControl>
                            <SelectTrigger className="h-11">
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
                          value={field.value ? String(field.value) : ""}
                          data-testid="select-academic-year"
                        >
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder={t.selectYear} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {academicYears?.map((year: any) => (
                              <SelectItem key={year.id} value={String(year.id)}>
                                {year.name || year.year}
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
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.startDate}</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-start-date" className="h-11" />
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
                          <Input {...field} type="date" data-testid="input-end-date" className="h-11" />
                        </FormControl>
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
                      setEditingExam(null);
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
                    {editingExam ? t.update : t.create}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="exams" className="w-full">
        <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="exams" className="flex-1 sm:flex-initial">{t.exams}</TabsTrigger>
            <TabsTrigger value="rooms" className="flex-1 sm:flex-initial">{t.rooms}</TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1 sm:flex-initial">{t.calendarView}</TabsTrigger>
          </TabsList>
        </div>

        {/* Exams Tab */}
        <TabsContent value="exams" className="space-y-6 mt-6">
          {/* Stats Cards - Minimalistic Design */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.totalExams}</CardTitle>
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold" data-testid="stat-total-exams">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="border shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.activeExams}</CardTitle>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold" data-testid="stat-active-exams">{stats.active}</div>
              </CardContent>
            </Card>
            <Card className="border shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.upcomingExams}</CardTitle>
                <Users className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold" data-testid="stat-upcoming-exams">{stats.upcoming}</div>
              </CardContent>
            </Card>
          </div>

          {/* Exams Table */}
          <Card className="border shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">{t.exams}</CardTitle>
              <CardDescription>
                {exams?.length || 0} {t.exams.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">{t.loading}</div>
              ) : exams && exams.length > 0 ? (
                <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">{t.examName}</TableHead>
                        <TableHead className="min-w-[120px]">{t.type}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t.academicYear}</TableHead>
                        <TableHead className="min-w-[180px]">{t.duration}</TableHead>
                        <TableHead className="min-w-[120px]">{t.status}</TableHead>
                        <TableHead className="w-[60px]">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exams.map((exam: any) => {
                        const status = getExamStatus(exam);
                        const examType = examTypes.find(t => t.value === exam.type);
                        
                        return (
                          <TableRow key={exam.id} data-testid={`row-exam-${exam.id}`}>
                            <TableCell className="font-medium">{exam.name}</TableCell>
                            <TableCell className="text-sm">
                              {examType ? (language === 'bn' ? examType.labelBn : examType.labelEn) : exam.type}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm">{exam.academic_years?.name || 'N/A'}</TableCell>
                            <TableCell>
                              <div className="flex items-center text-sm">
                                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                <span className="whitespace-nowrap">{format(new Date(exam.start_date), 'MMM dd')} - {format(new Date(exam.end_date), 'MMM dd, yyyy')}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant={status.color === 'green' ? 'default' : status.color === 'blue' ? 'secondary' : 'outline'} data-testid={`badge-status-${exam.id}`}>
                                  {status.label}
                                </Badge>
                                {exam.is_published === true && (
                                  <Badge variant="default" className="bg-green-500" data-testid={`badge-published-${exam.id}`}>
                                    {t.published}
                                  </Badge>
                                )}
                                {exam.is_published === false && (
                                  <Badge variant="secondary" data-testid={`badge-draft-${exam.id}`}>
                                    {t.draft}
                                  </Badge>
                                )}
                                {exam.is_locked === true && (
                                  <Badge variant="outline" className="border-yellow-500 text-yellow-600" data-testid={`badge-locked-${exam.id}`}>
                                    {t.locked}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0" data-testid={`button-actions-${exam.id}`}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => togglePublishMutation.mutate({ id: exam.id, isPublished: !exam.is_published })}
                                    disabled={exam.is_locked === true}
                                    data-testid={`menu-item-publish-${exam.id}`}
                                  >
                                    {exam.is_published ? (
                                      <>
                                        <EyeOff className="mr-2 h-4 w-4" />
                                        {t.unpublish}
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="mr-2 h-4 w-4" />
                                        {t.publish}
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => toggleLockMutation.mutate({ id: exam.id, isLocked: !exam.is_locked })}
                                    data-testid={`menu-item-lock-${exam.id}`}
                                  >
                                    {exam.is_locked ? (
                                      <>
                                        <Unlock className="mr-2 h-4 w-4" />
                                        {t.unlock}
                                      </>
                                    ) : (
                                      <>
                                        <Lock className="mr-2 h-4 w-4" />
                                        {t.lock}
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(exam)}
                                    disabled={exam.is_locked === true}
                                    data-testid={`menu-item-edit-${exam.id}`}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    {t.edit}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(exam.id)}
                                    disabled={exam.is_locked === true}
                                    data-testid={`menu-item-delete-${exam.id}`}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                                    {t.delete}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">{t.noExams}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rooms Tab */}
        <TabsContent value="rooms" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-room" className="h-11 w-full sm:w-auto">
                  <Building className="mr-2 h-4 w-4" />
                  {t.addRoom}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingRoom ? t.editRoom : t.createRoom}
                  </DialogTitle>
                </DialogHeader>
                <Form {...roomForm}>
                  <form onSubmit={roomForm.handleSubmit(onRoomSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={roomForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.roomName}</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-room-name" placeholder={t.enterRoomName} className="h-11" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={roomForm.control}
                        name="nameBn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.roomNameBn}</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-room-name-bn" placeholder={t.enterRoomNameBn} className="h-11" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={roomForm.control}
                        name="building"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.building}</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-building" placeholder={t.enterBuilding} className="h-11" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={roomForm.control}
                        name="floor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.floor}</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-floor" placeholder={t.enterFloor} className="h-11" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField
                        control={roomForm.control}
                        name="capacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.capacity}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                data-testid="input-capacity"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="h-11"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={roomForm.control}
                        name="rowsCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.rowsCount}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                data-testid="input-rows-count"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="h-11"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={roomForm.control}
                        name="seatsPerRow"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.seatsPerRow}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                data-testid="input-seats-per-row"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="h-11"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={roomForm.control}
                      name="features"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.features}</FormLabel>
                          <FormDescription className="text-xs">{t.selectFeatures}</FormDescription>
                          <div className="space-y-3 pt-2">
                            {roomFeatures.map((feature) => (
                              <div key={feature.value} className="flex items-center space-x-3">
                                <Checkbox
                                  id={`feature-${feature.value}`}
                                  checked={field.value?.includes(feature.value)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, feature.value]);
                                    } else {
                                      field.onChange(current.filter((v: string) => v !== feature.value));
                                    }
                                  }}
                                  data-testid={`checkbox-feature-${feature.value}`}
                                />
                                <label
                                  htmlFor={`feature-${feature.value}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {language === 'bn' ? feature.labelBn : feature.labelEn}
                                </label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={roomForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">{t.isActive}</FormLabel>
                            <FormDescription className="text-xs">
                              {field.value ? t.active : t.inactive}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-is-active"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsRoomDialogOpen(false);
                          setEditingRoom(null);
                          roomForm.reset();
                        }}
                        data-testid="button-cancel-room"
                        className="h-11 w-full sm:w-auto"
                      >
                        {t.cancel}
                      </Button>
                      <Button
                        type="submit"
                        disabled={createRoomMutation.isPending || updateRoomMutation.isPending}
                        data-testid="button-submit-room"
                        className="h-11 w-full sm:w-auto"
                      >
                        {editingRoom ? t.update : t.create}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Room Stats Cards - Minimalistic Design */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.totalRooms}</CardTitle>
                <DoorOpen className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold" data-testid="stat-total-rooms">{roomStats.total}</div>
              </CardContent>
            </Card>
            <Card className="border shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.activeRooms}</CardTitle>
                <Building className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold" data-testid="stat-active-rooms">{roomStats.active}</div>
              </CardContent>
            </Card>
            <Card className="border shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.totalCapacity}</CardTitle>
                <Users className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold" data-testid="stat-total-capacity">{roomStats.totalCapacity}</div>
              </CardContent>
            </Card>
          </div>

          {/* Rooms Table */}
          <Card className="border shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">{t.rooms}</CardTitle>
              <CardDescription>
                {rooms?.length || 0} {t.rooms.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roomsLoading ? (
                <div className="text-center py-12 text-muted-foreground">{t.loading}</div>
              ) : rooms && rooms.length > 0 ? (
                <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">{t.roomName}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t.buildingFloor}</TableHead>
                        <TableHead>{t.capacity}</TableHead>
                        <TableHead className="min-w-[150px]">{t.features}</TableHead>
                        <TableHead>{t.status}</TableHead>
                        <TableHead className="w-[100px]">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rooms.map((room: any) => (
                        <TableRow key={room.id} data-testid={`row-room-${room.id}`}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{room.name}</div>
                              {room.name_bn && (
                                <div className="text-xs text-muted-foreground">{room.name_bn}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {[room.building, room.floor].filter(Boolean).join(' / ') || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              <span data-testid={`capacity-${room.id}`} className="text-sm">{room.capacity}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {room.features && room.features.length > 0 ? (
                                room.features.map((feature: string) => {
                                  const featureInfo = roomFeatures.find(f => f.value === feature);
                                  return (
                                    <Badge key={feature} variant="secondary" className="text-xs" data-testid={`badge-feature-${room.id}-${feature}`}>
                                      {featureInfo ? (language === 'bn' ? featureInfo.labelBn : featureInfo.labelEn) : feature}
                                    </Badge>
                                  );
                                })
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={room.is_active ? "default" : "secondary"}
                              data-testid={`badge-room-status-${room.id}`}
                            >
                              {room.is_active ? t.active : t.inactive}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0"
                                onClick={() => handleEditRoom(room)}
                                data-testid={`button-edit-room-${room.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0"
                                onClick={() => handleDeleteRoom(room.id)}
                                data-testid={`button-delete-room-${room.id}`}
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
                  <DoorOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">{t.noRooms}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar View Tab */}
        <TabsContent value="calendar" className="space-y-6 mt-6">
          <Card className="border shadow-none">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">{t.calendarView}</CardTitle>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousMonth}
                    data-testid="button-previous-month"
                    className="h-10 flex-1 sm:flex-initial"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">{t.previousMonth}</span>
                  </Button>
                  <div className="text-base sm:text-lg font-semibold px-2 sm:px-4 text-center flex-1 sm:flex-initial" data-testid="text-current-month">
                    {format(currentMonth, 'MMMM yyyy')}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextMonth}
                    data-testid="button-next-month"
                    className="h-10 flex-1 sm:flex-initial"
                  >
                    <span className="mr-1 hidden sm:inline">{t.nextMonth}</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Week days header */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {weekDays.map((day, index) => (
                    <div
                      key={index}
                      className="text-center font-semibold text-xs sm:text-sm py-2 border-b"
                      data-testid={`weekday-${index}`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {generateCalendarDays().map((day, index) => {
                    const dayExams = getExamsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, new Date());
                    
                    const upcomingExams = dayExams.filter(e => {
                      const status = getExamStatus(e);
                      return status.color === 'blue';
                    });
                    const ongoingExams = dayExams.filter(e => {
                      const status = getExamStatus(e);
                      return status.color === 'green';
                    });
                    const completedExams = dayExams.filter(e => {
                      const status = getExamStatus(e);
                      return status.color === 'gray';
                    });

                    return (
                      <Sheet key={index}>
                        <SheetTrigger asChild>
                          <button
                            className={`
                              relative min-h-[60px] sm:min-h-[80px] p-1.5 sm:p-2 rounded-lg border transition-colors
                              ${!isCurrentMonth ? 'opacity-40' : ''}
                              ${isToday ? 'border-primary border-2 bg-primary/5' : 'hover:bg-accent'}
                              ${dayExams.length > 0 ? 'cursor-pointer' : 'cursor-default'}
                            `}
                            disabled={dayExams.length === 0}
                            data-testid={`day-cell-${format(day, 'yyyy-MM-dd')}`}
                          >
                            <div className="text-xs sm:text-sm font-medium text-left">
                              {format(day, 'd')}
                            </div>
                            
                            {dayExams.length > 0 && (
                              <div className="mt-1 space-y-0.5 sm:space-y-1">
                                {upcomingExams.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-blue-500" />
                                    <span className="text-[10px] sm:text-xs" data-testid={`badge-upcoming-${format(day, 'yyyy-MM-dd')}`}>
                                      {upcomingExams.length}
                                    </span>
                                  </div>
                                )}
                                {ongoingExams.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-500" />
                                    <span className="text-[10px] sm:text-xs" data-testid={`badge-ongoing-${format(day, 'yyyy-MM-dd')}`}>
                                      {ongoingExams.length}
                                    </span>
                                  </div>
                                )}
                                {completedExams.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-gray-400" />
                                    <span className="text-[10px] sm:text-xs" data-testid={`badge-completed-${format(day, 'yyyy-MM-dd')}`}>
                                      {completedExams.length}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </button>
                        </SheetTrigger>

                        {dayExams.length > 0 && (
                          <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
                            <SheetHeader>
                              <SheetTitle>
                                {t.examsOnThisDay}
                              </SheetTitle>
                              <p className="text-sm text-muted-foreground">
                                {format(day, 'EEEE, MMMM d, yyyy')}
                              </p>
                            </SheetHeader>
                            
                            <div className="mt-6 space-y-4">
                              {dayExams.map((exam: any) => {
                                const status = getExamStatus(exam);
                                const examType = examTypes.find(t => t.value === exam.type);
                                
                                return (
                                  <Card key={exam.id} data-testid={`exam-card-${exam.id}`} className="border shadow-none">
                                    <CardHeader className="pb-3">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <CardTitle className="text-base">
                                            {exam.name}
                                          </CardTitle>
                                          <CardDescription className="mt-1 text-sm">
                                            {examType ? (language === 'bn' ? examType.labelBn : examType.labelEn) : exam.type}
                                          </CardDescription>
                                        </div>
                                      </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      <div className="flex items-center text-sm text-muted-foreground">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {format(new Date(exam.start_date), 'MMM dd')} - {format(new Date(exam.end_date), 'MMM dd, yyyy')}
                                      </div>
                                      
                                      <div className="flex flex-wrap gap-2">
                                        <Badge 
                                          variant={status.color === 'green' ? 'default' : status.color === 'blue' ? 'secondary' : 'outline'}
                                          data-testid={`exam-status-${exam.id}`}
                                        >
                                          {status.label}
                                        </Badge>
                                        
                                        {exam.is_published === true && (
                                          <Badge variant="default" className="bg-green-500">
                                            {t.published}
                                          </Badge>
                                        )}
                                        {exam.is_published === false && (
                                          <Badge variant="secondary">
                                            {t.draft}
                                          </Badge>
                                        )}
                                        {exam.is_locked === true && (
                                          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                                            {t.locked}
                                          </Badge>
                                        )}
                                      </div>

                                      {exam.description && (
                                        <p className="text-sm text-muted-foreground">
                                          {exam.description}
                                        </p>
                                      )}
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          </SheetContent>
                        )}
                      </Sheet>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-6 pt-4 border-t">
                  <div className="flex flex-wrap gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-blue-500" />
                      <span>{t.upcoming}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-green-500" />
                      <span>{t.ongoing}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-gray-400" />
                      <span>{t.completed}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ExamManagement() {
  return (
    <AppShell>
      <ExamManagementContent />
    </AppShell>
  );
}
