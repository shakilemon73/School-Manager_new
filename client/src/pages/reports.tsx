import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, 
  Download, 
  Users, 
  BarChart3, 
  Calendar, 
  Award,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import type { 
  StudentWithDetails, 
  TeacherWithDetails, 
  ClassWithDetails, 
  AttendanceWithDetails,
  GradeWithDetails 
} from "@shared/details";

export default function Reports() {
  const [selectedReportType, setSelectedReportType] = useState("overview");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");

  const { data: students = [] } = useQuery<StudentWithDetails[]>({
    queryKey: ["/api/students"],
  });

  const { data: teachers = [] } = useQuery<TeacherWithDetails[]>({
    queryKey: ["/api/teachers"],
  });

  const { data: classes = [] } = useQuery<ClassWithDetails[]>({
    queryKey: ["/api/classes"],
  });

  const { data: attendance = [] } = useQuery<AttendanceWithDetails[]>({
    queryKey: ["/api/attendance"],
  });

  const { data: grades = [] } = useQuery<GradeWithDetails[]>({
    queryKey: ["/api/grades"],
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // In a real application, this would generate and download a file
    alert("Export functionality would be implemented here");
  };

  // Calculate statistics
  const totalStudents = students.length;
  const totalTeachers = teachers.length;
  const totalClasses = classes.length;

  // Attendance statistics
  const totalAttendanceRecords = attendance.length;
  const presentRecords = attendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalAttendanceRecords > 0 
    ? Math.round((presentRecords / totalAttendanceRecords) * 100)
    : 0;

  // Grade statistics
  const totalGrades = grades.length;
  const averageGrade = grades.length > 0
    ? Math.round(grades.reduce((sum, grade) => sum + grade.percentage, 0) / grades.length * 100) / 100
    : 0;

  // Students by grade
  const studentsByGrade = students.reduce((acc, student) => {
    acc[student.grade] = (acc[student.grade] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Recent performance trends
  const recentGrades = grades
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const filteredStudents = selectedGrade && selectedGrade !== 'all'
    ? students.filter(s => s.grade.toString() === selectedGrade)
    : students;

  const renderOverviewReport = () => (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Students</p>
                <p className="text-2xl font-bold text-slate-900">{totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Teachers</p>
                <p className="text-2xl font-bold text-slate-900">{totalTeachers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 bg-amber-100 rounded-full">
                <BarChart3 className="w-6 h-6 text-amber-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Attendance Rate</p>
                <p className="text-2xl font-bold text-slate-900">{attendanceRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Average Grade</p>
                <p className="text-2xl font-bold text-slate-900">{averageGrade}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students by Grade */}
      <Card>
        <CardHeader>
          <CardTitle>Student Distribution by Grade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(studentsByGrade).map(([grade, count]) => (
              <div key={grade} className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-900">{Number(count)}</p>
                <p className="text-sm text-slate-600">Grade {grade}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Grade Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentGrades.slice(0, 5).map((grade) => (
                <TableRow key={grade.id}>
                  <TableCell>{grade.studentName}</TableCell>
                  <TableCell>{grade.assignment}</TableCell>
                  <TableCell>
                    <Badge 
                      className={
                        grade.percentage >= 80 
                          ? "bg-green-100 text-green-800"
                          : grade.percentage >= 60
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {grade.percentage}%
                    </Badge>
                  </TableCell>
                  <TableCell>{grade.date}</TableCell>
                  <TableCell>
                    {grade.percentage >= 75 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderStudentReport = () => (
    <Card>
      <CardHeader>
        <CardTitle>Student List Report</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Parent Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enrollment Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell>{student.fullName}</TableCell>
                <TableCell>Grade {student.grade}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell>{student.parentContact}</TableCell>
                <TableCell>
                  <Badge 
                    className={
                      student.status === "active" 
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {student.status}
                  </Badge>
                </TableCell>
                <TableCell>{student.enrollmentDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderAttendanceReport = () => (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Summary Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {attendance.filter(a => a.status === 'present').length}
              </p>
              <p className="text-sm text-green-700">Present</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {attendance.filter(a => a.status === 'absent').length}
              </p>
              <p className="text-sm text-red-700">Absent</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                {attendance.filter(a => a.status === 'late').length}
              </p>
              <p className="text-sm text-yellow-700">Late</p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.slice(0, 20).map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.date}</TableCell>
                  <TableCell>{record.studentName}</TableCell>
                  <TableCell>{record.className}</TableCell>
                  <TableCell>
                    <Badge 
                      className={
                        record.status === 'present'
                          ? "bg-green-100 text-green-800"
                          : record.status === 'absent'
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {record.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{record.notes || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const renderGradeReport = () => (
    <Card>
      <CardHeader>
        <CardTitle>Academic Performance Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {grades.filter(g => g.percentage >= 90).length}
              </p>
              <p className="text-sm text-green-700">A Grades (90%+)</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {grades.filter(g => g.percentage >= 80 && g.percentage < 90).length}
              </p>
              <p className="text-sm text-blue-700">B Grades (80-89%)</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                {grades.filter(g => g.percentage >= 70 && g.percentage < 80).length}
              </p>
              <p className="text-sm text-yellow-700">C Grades (70-79%)</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {grades.filter(g => g.percentage < 70).length}
              </p>
              <p className="text-sm text-red-700">{'Below C (&lt;70%)'}</p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grades.slice(0, 20).map((grade) => (
                <TableRow key={grade.id}>
                  <TableCell>{grade.studentName}</TableCell>
                  <TableCell>{grade.className}</TableCell>
                  <TableCell>{grade.assignment}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{grade.type}</Badge>
                  </TableCell>
                  <TableCell>{grade.score}/{grade.maxScore}</TableCell>
                  <TableCell>
                    <Badge 
                      className={
                        grade.percentage >= 80 
                          ? "bg-green-100 text-green-800"
                          : grade.percentage >= 60
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {grade.percentage}%
                    </Badge>
                  </TableCell>
                  <TableCell>{grade.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
          <p className="text-slate-600">Generate comprehensive reports and analytics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handlePrint}>
            <FileText className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Report Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={selectedReportType} onValueChange={setSelectedReportType}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Select Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview Report</SelectItem>
                <SelectItem value="students">Student List</SelectItem>
                <SelectItem value="attendance">Attendance Report</SelectItem>
                <SelectItem value="grades">Grade Report</SelectItem>
              </SelectContent>
            </Select>
            
            {selectedReportType === "students" && (
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="9">Grade 9</SelectItem>
                  <SelectItem value="10">Grade 10</SelectItem>
                  <SelectItem value="11">Grade 11</SelectItem>
                  <SelectItem value="12">Grade 12</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <div className="print:shadow-none">
        {selectedReportType === "overview" && renderOverviewReport()}
        {selectedReportType === "students" && renderStudentReport()}
        {selectedReportType === "attendance" && renderAttendanceReport()}
        {selectedReportType === "grades" && renderGradeReport()}
      </div>
    </div>
  );
}
