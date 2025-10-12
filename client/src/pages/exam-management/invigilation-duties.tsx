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
import { userProfile } from "@/hooks/use-supabase-direct-auth";

const invigilationDutySchema = z.object({
  examId: z.number().min(1, "Exam is required"),
  teacherId: z.number().min(1, "Teacher is required"),
  roomNumber: z.string().min(1, "Room number is required"),
  dutyType: z.string().min(1, "Duty type is required"),
  dutyDate: z.string().min(1, "Duty date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  notes: z.string().optional(),
  schoolId: z.number(),
});

type InvigilationDutyForm = z.infer<typeof invigilationDutySchema>;

export default function InvigilationDuties() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDuty, setEditingDuty] = useState<any>(null);
  const [filterExam, setFilterExam] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");

  const { data: duties, isLoading } = useQuery({
    queryKey: ["/api/invigilation-duties", filterExam, filterDate],
    queryFn: async () => {
      let query = supabase
        .from("invigilation_duties")
        .select(`
          *,
          teachers (
            id,
            name,
            teacher_id
          ),
          exams (
            id,
            name,
            type
          )
        `)
        .order("duty_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (filterExam && filterExam !== 'all') {
        query = query.eq("exam_id", filterExam);
      }
      if (filterDate) {
        query = query.eq("duty_date", filterDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  const { data: exams } = useQuery({
    queryKey: ["/api/exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, name, teacher_id, subject")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const form = useForm<InvigilationDutyForm>({
    resolver: zodResolver(invigilationDutySchema),
    defaultValues: async () => {
      const schoolId = await userProfile.getCurrentUserSchoolId();
      return {
        examId: 0,
        teacherId: 0,
        roomNumber: "",
        dutyType: "Main Invigilator",
        dutyDate: "",
        startTime: "",
        endTime: "",
        notes: "",
        schoolId: schoolId,
      };
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InvigilationDutyForm) => {
      const { error } = await supabase
        .from("invigilation_duties")
        .insert([data]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invigilation-duties"] });
      toast({
        title: "Success",
        description: "Invigilation duty assigned successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InvigilationDutyForm }) => {
      const { error } = await supabase
        .from("invigilation_duties")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invigilation-duties"] });
      toast({
        title: "Success",
        description: "Invigilation duty updated successfully",
      });
      setIsDialogOpen(false);
      setEditingDuty(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
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
      queryClient.invalidateQueries({ queryKey: ["/api/invigilation-duties"] });
      toast({
        title: "Success",
        description: "Invigilation duty deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
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
      schoolId: duty.school_id,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this invigilation duty?")) {
      deleteMutation.mutate(id);
    }
  };

  const dutyTypes = [
    "Main Invigilator",
    "Assistant Invigilator",
    "Room Supervisor",
    "Hall Supervisor",
    "Flying Squad",
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Invigilation Duties</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-duty">
              <Plus className="mr-2 h-4 w-4" />
              Assign Duty
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingDuty ? "Edit" : "Assign"} Invigilation Duty
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
                        <FormLabel>Exam</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-exam">
                              <SelectValue placeholder="Select exam" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {exams?.map((exam) => (
                              <SelectItem key={exam.id} value={exam.id.toString()}>
                                {exam.name} ({exam.type})
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
                        <FormLabel>Teacher</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-teacher">
                              <SelectValue placeholder="Select teacher" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {teachers?.map((teacher) => (
                              <SelectItem key={teacher.id} value={teacher.id.toString()}>
                                {teacher.name} ({teacher.teacher_id})
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
                        <FormLabel>Room Number</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-room-number" placeholder="e.g., Room 101" />
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
                        <FormLabel>Duty Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-duty-type">
                              <SelectValue placeholder="Select duty type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {dutyTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
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
                      <FormLabel>Duty Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-duty-date" />
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
                        <FormLabel>Start Time</FormLabel>
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
                        <FormLabel>End Time</FormLabel>
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
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          data-testid="textarea-notes"
                          placeholder="Any special notes or instructions"
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
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {editingDuty ? "Update" : "Assign"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Exam</label>
              <Select value={filterExam} onValueChange={setFilterExam}>
                <SelectTrigger data-testid="filter-exam">
                  <SelectValue placeholder="All Exams" />
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
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Date</label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                data-testid="filter-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="mr-2 h-5 w-5" />
            Invigilation Duty Roster
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : duties && duties.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Duty Type</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duties.map((duty) => (
                  <TableRow key={duty.id} data-testid={`row-duty-${duty.id}`}>
                    <TableCell>{duty.exams?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {duty.teachers?.name || 'N/A'}
                      <br />
                      <span className="text-xs text-gray-500">
                        ({duty.teachers?.teacher_id || 'N/A'})
                      </span>
                    </TableCell>
                    <TableCell>{duty.room_number}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {duty.duty_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(new Date(duty.duty_date), 'MMM dd, yyyy')}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="mr-2 h-3 w-3" />
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
              No invigilation duties found. Assign duties above.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
