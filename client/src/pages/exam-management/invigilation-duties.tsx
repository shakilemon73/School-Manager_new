import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import { UserCheck, Plus, Pencil, Trash2, CalendarIcon, Clock, Filter } from "lucide-react";
import { format } from "date-fns";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsivePageLayout } from "@/components/layout/responsive-page-layout";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const invigilationDutySchema = z.object({
  examId: z.number().min(1, "Exam is required"),
  teacherId: z.number().min(1, "Teacher is required"),
  roomNumber: z.string().min(1, "Room number is required"),
  dutyType: z.string().min(1, "Duty type is required"),
  dutyDate: z.string().min(1, "Duty date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  notes: z.string().optional(),
});

type InvigilationDutyForm = z.infer<typeof invigilationDutySchema>;

const translations = {
  en: {
    title: "Invigilation Duties",
    assignDuty: "Assign Duty",
    assignDutyTitle: "Assign Invigilation Duty",
    editDutyTitle: "Edit Invigilation Duty",
    exam: "Exam",
    teacher: "Teacher",
    room: "Room",
    dutyType: "Duty Type",
    roomNumber: "Room Number",
    dutyDate: "Duty Date",
    startTime: "Start Time",
    endTime: "End Time",
    notes: "Notes",
    selectExam: "Select exam",
    selectTeacher: "Select teacher",
    selectDutyType: "Select duty type",
    enterRoom: "Enter room number",
    enterNotes: "Enter additional notes",
    cancel: "Cancel",
    create: "Assign",
    update: "Update",
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
    chief: "Chief Invigilator",
    assistant: "Assistant Invigilator",
    supervisor: "Supervisor",
  },
  bn: {
    title: "তত্ত্বাবধান দায়িত্ব",
    assignDuty: "দায়িত্ব নিয়োগ করুন",
    assignDutyTitle: "তত্ত্বাবধান দায়িত্ব নিয়োগ করুন",
    editDutyTitle: "তত্ত্বাবধান দায়িত্ব সম্পাদনা করুন",
    exam: "পরীক্ষা",
    teacher: "শিক্ষক",
    room: "রুম",
    dutyType: "দায়িত্বের ধরন",
    roomNumber: "রুম নম্বর",
    dutyDate: "দায়িত্বের তারিখ",
    startTime: "শুরুর সময়",
    endTime: "শেষ সময়",
    notes: "নোট",
    selectExam: "পরীক্ষা নির্বাচন করুন",
    selectTeacher: "শিক্ষক নির্বাচন করুন",
    selectDutyType: "দায়িত্বের ধরন নির্বাচন করুন",
    enterRoom: "রুম নম্বর লিখুন",
    enterNotes: "অতিরিক্ত নোট লিখুন",
    cancel: "বাতিল",
    create: "নিয়োগ করুন",
    update: "আপডেট করুন",
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
    chief: "প্রধান তত্ত্বাবধায়ক",
    assistant: "সহকারী তত্ত্বাবধায়ক",
    supervisor: "পরিদর্শক",
  },
};

const dutyTypes = [
  { value: "chief", labelEn: "Chief Invigilator", labelBn: "প্রধান তত্ত্বাবধায়ক" },
  { value: "assistant", labelEn: "Assistant Invigilator", labelBn: "সহকারী তত্ত্বাবধায়ক" },
  { value: "supervisor", labelEn: "Supervisor", labelBn: "পরিদর্শক" },
];

function InvigilationDutiesContent() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { schoolId, authReady } = useSupabaseDirectAuth();
  const t = translations[language] || translations.bn;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDuty, setEditingDuty] = useState<any>(null);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);

  const { data: duties, isLoading } = useQuery({
    queryKey: ["invigilation-duties", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not found');
      const { data, error } = await supabase
        .from("invigilation_duties")
        .select(`
          *,
          exams (
            id,
            name,
            type
          ),
          teachers (
            id,
            name,
            email
          )
        `)
        .eq("school_id", schoolId)
        .order("duty_date", { ascending: true })
        .order("start_time", { ascending: true });

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

  const form = useForm<InvigilationDutyForm>({
    resolver: zodResolver(invigilationDutySchema),
    defaultValues: {
      examId: 0,
      teacherId: 0,
      roomNumber: "",
      dutyType: "",
      dutyDate: "",
      startTime: "",
      endTime: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InvigilationDutyForm) => {
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("invigilation_duties")
        .insert([{ 
          exam_id: data.examId,
          teacher_id: data.teacherId,
          room_number: data.roomNumber,
          duty_type: data.dutyType,
          duty_date: data.dutyDate,
          start_time: data.startTime,
          end_time: data.endTime,
          notes: data.notes,
          school_id: schoolId 
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invigilation-duties", schoolId] });
      toast({
        title: t.success,
        description: t.dutyCreated,
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
    mutationFn: async ({ id, data }: { id: number; data: InvigilationDutyForm }) => {
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("invigilation_duties")
        .update({ 
          exam_id: data.examId,
          teacher_id: data.teacherId,
          room_number: data.roomNumber,
          duty_type: data.dutyType,
          duty_date: data.dutyDate,
          start_time: data.startTime,
          end_time: data.endTime,
          notes: data.notes,
          school_id: schoolId 
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invigilation-duties", schoolId] });
      toast({
        title: t.success,
        description: t.dutyUpdated,
      });
      setIsDialogOpen(false);
      setEditingDuty(null);
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
        .from("invigilation_duties")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invigilation-duties", schoolId] });
      toast({
        title: t.success,
        description: t.dutyDeleted,
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

  const onSubmit = (data: InvigilationDutyForm) => {
    if (editingDuty) {
      updateMutation.mutate({ id: editingDuty.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (duty: any) => {
    setEditingDuty(duty);
    form.reset({
      examId: duty.exam_id,
      teacherId: duty.teacher_id,
      roomNumber: duty.room_number,
      dutyType: duty.duty_type,
      dutyDate: duty.duty_date,
      startTime: duty.start_time,
      endTime: duty.end_time,
      notes: duty.notes || "",
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

  const filteredDuties = selectedExam
    ? duties?.filter((d) => d.exam_id === selectedExam)
    : duties;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-assign-duty">
              <Plus className="mr-2 h-4 w-4" />
              {t.assignDuty}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
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

      <div className="mb-4">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.invigilationDuties}</CardTitle>
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
                  <TableHead>{t.notes}</TableHead>
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
                      {dutyTypes.find(t => t.value === duty.duty_type)?.[language === 'bn' ? 'labelBn' : 'labelEn'] || duty.duty_type}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(new Date(duty.duty_date), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        {duty.start_time} - {duty.end_time}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {duty.notes || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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
    </div>
  );
}

export default function InvigilationDuties() {
  return (
    <AppShell>
      <ResponsivePageLayout>
        <InvigilationDutiesContent />
      </ResponsivePageLayout>
    </AppShell>
  );
}
