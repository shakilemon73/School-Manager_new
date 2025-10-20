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
import { Users, Plus, Pencil, Trash2, Wand2, Filter } from "lucide-react";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsivePageLayout } from "@/components/layout/responsive-page-layout";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const seatingArrangementSchema = z.object({
  examId: z.number().min(1, "Exam is required"),
  studentId: z.number().min(1, "Student is required"),
  roomNumber: z.string().min(1, "Room number is required"),
  seatNumber: z.string().min(1, "Seat number is required"),
  rowNumber: z.number().min(1, "Row number is required"),
  columnNumber: z.number().min(1, "Column number is required"),
  instructions: z.string().optional(),
});

type SeatingArrangementForm = z.infer<typeof seatingArrangementSchema>;

const translations = {
  en: {
    title: "Seating Arrangements",
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
    enterRoom: "Enter room number",
    enterSeat: "Enter seat number",
    enterInstructions: "Enter special instructions",
    cancel: "Cancel",
    create: "Create",
    update: "Update",
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
    row: "Row",
    column: "Column",
  },
  bn: {
    title: "আসন বিন্যাস",
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
    enterRoom: "রুম নম্বর লিখুন",
    enterSeat: "আসন নম্বর লিখুন",
    enterInstructions: "বিশেষ নির্দেশনা লিখুন",
    cancel: "বাতিল",
    create: "তৈরি করুন",
    update: "আপডেট করুন",
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
    row: "সারি",
    column: "কলাম",
  },
};

function SeatingArrangementsContent() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { schoolId, authReady } = useSupabaseDirectAuth();
  const t = translations[language] || translations.bn;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArrangement, setEditingArrangement] = useState<any>(null);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);

  const { data: arrangements, isLoading } = useQuery({
    queryKey: ["seating-arrangements", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not found');
      const { data, error } = await supabase
        .from("seating_arrangements")
        .select(`
          *,
          exams (
            id,
            name,
            type
          ),
          students (
            id,
            name,
            roll_number
          )
        `)
        .order("room_number", { ascending: true })
        .order("seat_number", { ascending: true });

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
        .order("name");

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
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const form = useForm<SeatingArrangementForm>({
    resolver: zodResolver(seatingArrangementSchema),
    defaultValues: {
      examId: 0,
      studentId: 0,
      roomNumber: "",
      seatNumber: "",
      rowNumber: 1,
      columnNumber: 1,
      instructions: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SeatingArrangementForm) => {
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("seating_arrangements")
        .insert([{ ...data, school_id: schoolId }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seating-arrangements"] });
      toast({
        title: t.success,
        description: t.arrangementCreated,
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
    mutationFn: async ({ id, data }: { id: number; data: SeatingArrangementForm }) => {
      if (!schoolId) throw new Error('School ID not found');
      const { error } = await supabase
        .from("seating_arrangements")
        .update({ ...data, school_id: schoolId })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seating-arrangements"] });
      toast({
        title: t.success,
        description: t.arrangementUpdated,
      });
      setIsDialogOpen(false);
      setEditingArrangement(null);
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
        .from("seating_arrangements")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seating-arrangements"] });
      toast({
        title: t.success,
        description: t.arrangementDeleted,
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

  const onSubmit = (data: SeatingArrangementForm) => {
    if (editingArrangement) {
      updateMutation.mutate({ id: editingArrangement.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (arrangement: any) => {
    setEditingArrangement(arrangement);
    form.reset({
      examId: arrangement.exam_id,
      studentId: arrangement.student_id,
      roomNumber: arrangement.room_number,
      seatNumber: arrangement.seat_number,
      rowNumber: arrangement.row_number,
      columnNumber: arrangement.column_number,
      instructions: arrangement.instructions || "",
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

  const filteredArrangements = selectedExam
    ? arrangements?.filter((a) => a.exam_id === selectedExam)
    : arrangements;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-arrangement">
                <Plus className="mr-2 h-4 w-4" />
                {t.addArrangement}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
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
                    name="instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.instructions}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            data-testid="input-instructions"
                            placeholder={t.enterInstructions}
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
          <CardTitle>{t.seatingArrangements}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t.loading}</div>
          ) : filteredArrangements && filteredArrangements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.exam}</TableHead>
                  <TableHead>{t.student}</TableHead>
                  <TableHead>{t.room}</TableHead>
                  <TableHead>{t.seat}</TableHead>
                  <TableHead>{t.position}</TableHead>
                  <TableHead>{t.instructions}</TableHead>
                  <TableHead>{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArrangements.map((arrangement) => (
                  <TableRow key={arrangement.id} data-testid={`row-arrangement-${arrangement.id}`}>
                    <TableCell>{arrangement.exams?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {arrangement.students?.name || 'N/A'}
                      {arrangement.students?.roll_number && ` (${arrangement.students.roll_number})`}
                    </TableCell>
                    <TableCell>{arrangement.room_number}</TableCell>
                    <TableCell>{arrangement.seat_number}</TableCell>
                    <TableCell>
                      {t.row} {arrangement.row_number}, {t.column} {arrangement.column_number}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {arrangement.instructions || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SeatingArrangements() {
  return (
    <AppShell>
      <ResponsivePageLayout>
        <SeatingArrangementsContent />
      </ResponsivePageLayout>
    </AppShell>
  );
}
