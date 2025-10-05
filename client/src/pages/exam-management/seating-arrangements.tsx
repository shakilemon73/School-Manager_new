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

const seatingArrangementSchema = z.object({
  examId: z.number().min(1, "Exam is required"),
  studentId: z.number().min(1, "Student is required"),
  roomNumber: z.string().min(1, "Room number is required"),
  seatNumber: z.string().min(1, "Seat number is required"),
  rowNumber: z.number().min(1, "Row number is required"),
  columnNumber: z.number().min(1, "Column number is required"),
  instructions: z.string().optional(),
  schoolId: z.number(),
});

type SeatingArrangementForm = z.infer<typeof seatingArrangementSchema>;

export default function SeatingArrangements() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArrangement, setEditingArrangement] = useState<any>(null);
  const [filterExam, setFilterExam] = useState<string>("all");
  const [filterRoom, setFilterRoom] = useState<string>("");

  const { data: arrangements, isLoading } = useQuery({
    queryKey: ["/api/seating-arrangements", filterExam, filterRoom],
    queryFn: async () => {
      let query = supabase
        .from("seating_arrangements")
        .select(`
          *,
          students (
            id,
            name,
            student_id
          ),
          exams (
            id,
            name,
            type
          )
        `)
        .order("room_number", { ascending: true })
        .order("seat_number", { ascending: true });

      if (filterExam && filterExam !== 'all') {
        query = query.eq("exam_id", filterExam);
      }
      if (filterRoom) {
        query = query.eq("room_number", filterRoom);
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

  const { data: students } = useQuery({
    queryKey: ["/api/students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, name, student_id, class, section")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data;
    },
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
      schoolId: 1,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SeatingArrangementForm) => {
      const { error } = await supabase
        .from("seating_arrangements")
        .insert([data]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seating-arrangements"] });
      toast({
        title: "Success",
        description: "Seating arrangement created successfully",
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
    mutationFn: async ({ id, data }: { id: number; data: SeatingArrangementForm }) => {
      const { error } = await supabase
        .from("seating_arrangements")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seating-arrangements"] });
      toast({
        title: "Success",
        description: "Seating arrangement updated successfully",
      });
      setIsDialogOpen(false);
      setEditingArrangement(null);
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
        .from("seating_arrangements")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seating-arrangements"] });
      toast({
        title: "Success",
        description: "Seating arrangement deleted successfully",
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

  const autoGenerateMutation = useMutation({
    mutationFn: async ({ examId, roomNumber, rows, columns }: { examId: number; roomNumber: string; rows: number; columns: number }) => {
      const { data: examStudents, error: studentsError } = await supabase
        .from("students")
        .select("id")
        .eq("status", "active")
        .limit(rows * columns);

      if (studentsError) throw studentsError;

      const arrangements = examStudents.map((student, index) => ({
        exam_id: examId,
        student_id: student.id,
        room_number: roomNumber,
        seat_number: `S${index + 1}`,
        row_number: Math.floor(index / columns) + 1,
        column_number: (index % columns) + 1,
        school_id: 1,
      }));

      const { error } = await supabase
        .from("seating_arrangements")
        .insert(arrangements);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seating-arrangements"] });
      toast({
        title: "Success",
        description: "Seating plan auto-generated successfully",
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
      schoolId: arrangement.school_id,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this seating arrangement?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAutoGenerate = () => {
    const examId = prompt("Enter Exam ID:");
    const roomNumber = prompt("Enter Room Number:");
    const rows = prompt("Enter number of rows:");
    const columns = prompt("Enter number of columns:");

    if (examId && roomNumber && rows && columns) {
      autoGenerateMutation.mutate({
        examId: Number(examId),
        roomNumber,
        rows: Number(rows),
        columns: Number(columns),
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Seating Arrangements</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleAutoGenerate}
            data-testid="button-auto-generate"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Auto Generate
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-arrangement">
                <Plus className="mr-2 h-4 w-4" />
                Add Arrangement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingArrangement ? "Edit" : "Create"} Seating Arrangement
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
                      name="studentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Student</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(Number(value))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-student">
                                <SelectValue placeholder="Select student" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {students?.map((student) => (
                                <SelectItem key={student.id} value={student.id.toString()}>
                                  {student.name} ({student.student_id})
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
                      name="seatNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seat Number</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-seat-number" placeholder="e.g., S1" />
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
                          <FormLabel>Row Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              data-testid="input-row-number"
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
                          <FormLabel>Column Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              data-testid="input-column-number"
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
                        <FormLabel>Instructions (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            data-testid="textarea-instructions"
                            placeholder="Any special instructions for this seating"
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
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit"
                    >
                      {editingArrangement ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
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
              <label className="text-sm font-medium mb-2 block">Filter by Room</label>
              <Input
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
                placeholder="Enter room number"
                data-testid="filter-room"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Seating Arrangements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : arrangements && arrangements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Seat</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Instructions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arrangements.map((arrangement) => (
                  <TableRow key={arrangement.id} data-testid={`row-arrangement-${arrangement.id}`}>
                    <TableCell>{arrangement.exams?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {arrangement.students?.name || 'N/A'}
                      <br />
                      <span className="text-xs text-gray-500">
                        ({arrangement.students?.student_id || 'N/A'})
                      </span>
                    </TableCell>
                    <TableCell>{arrangement.room_number}</TableCell>
                    <TableCell>{arrangement.seat_number}</TableCell>
                    <TableCell>
                      Row {arrangement.row_number}, Col {arrangement.column_number}
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
              No seating arrangements found. Create your first arrangement above.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
