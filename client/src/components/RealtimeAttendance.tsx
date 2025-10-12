import { useEffect, useState } from 'react';
import { supabase } from '@shared/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { userProfile } from "@/hooks/use-supabase-direct-auth";

interface AttendanceRecord {
  id: number;
  studentId: number;
  classId: number;
  date: string;
  status: string;
  schoolId: number;
  createdAt: string;
}

interface Student {
  id: number;
  name: string;
  studentId: string;
  class: string;
  section: string;
}

export function RealtimeAttendance() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('present');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch initial data
    fetchAttendanceRecords();
    fetchStudents();

    // Setup real-time subscription for attendance updates
    const attendanceSubscription = supabase
      .channel('attendance_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'attendance' 
      }, (payload) => {
        console.log('Real-time attendance update:', payload);
        
        if (payload.eventType === 'INSERT') {
          setAttendanceRecords(prev => [payload.new as AttendanceRecord, ...prev]);
          toast({
            title: "Attendance Updated",
            description: "New attendance record added in real-time",
          });
        } else if (payload.eventType === 'UPDATE') {
          setAttendanceRecords(prev => 
            prev.map(record => 
              record.id === payload.new.id ? payload.new as AttendanceRecord : record
            )
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceSubscription);
    };
  }, [toast]);

  const fetchAttendanceRecords = async () => {
    try {
      const response = await fetch('/api/attendance?date=' + new Date().toISOString().split('T')[0]);
      const records = await response.json();
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      const studentData = await response.json();
      setStudents(studentData);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const markAttendance = async () => {
    if (!selectedStudent) {
      toast({
        title: "Error",
        description: "Please select a student",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const schoolId = await userProfile.getCurrentUserSchoolId();
      const attendanceData = {
        studentId: parseInt(selectedStudent),
        classId: 1, // Default class
        date: new Date().toISOString().split('T')[0],
        status: selectedStatus,
        schoolId: schoolId,
        updatedBy: 1
      };

      const response = await fetch('/api/attendance/realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendanceData),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: result.message || "Attendance marked successfully",
        });
        setSelectedStudent('');
        setSelectedStatus('present');
      } else {
        throw new Error('Failed to mark attendance');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'late': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Real-time Attendance Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Student</label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.name} ({student.studentId}) - {student.class} {student.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={markAttendance} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Marking...' : 'Mark Attendance'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today's Attendance Records</CardTitle>
          <p className="text-sm text-gray-600">Updates automatically in real-time</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {attendanceRecords.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No attendance records for today</p>
            ) : (
              attendanceRecords.map((record) => {
                const student = students.find(s => s.id === record.studentId);
                return (
                  <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {student ? `${student.name} (${student.studentId})` : `Student ID: ${record.studentId}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {student ? `${student.class} ${student.section}` : ''} • {record.date}
                      </p>
                    </div>
                    <Badge className={`${getStatusColor(record.status)} text-white`}>
                      {record.status.toUpperCase()}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}