import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDesignSystem } from "@/hooks/use-design-system";
import { useRequireSchoolId } from "@/hooks/use-require-school-id";
import { Link } from "wouter";
import { useState } from "react";
import { format, addDays, startOfWeek, isSameDay, isToday } from "date-fns";
import { 
  ArrowLeft,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  MapPin,
  User,
  Bell
} from "lucide-react";

interface ClassSchedule {
  id: number;
  classId: number;
  subjectId: number;
  teacherId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  subject?: {
    id: number;
    name: string;
    code: string;
  };
  teacher?: {
    id: number;
    name: string;
  };
}

interface ExamSchedule {
  id: number;
  examName: string;
  subjectId: number;
  examDate: string;
  startTime: string;
  endTime: string;
  room: string;
  syllabus?: string;
  subject?: {
    id: number;
    name: string;
    code: string;
  };
}

export default function StudentSchedule() {
  useDesignSystem();
  const schoolId = useRequireSchoolId();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'classes' | 'exams'>('classes');

  const { data: classSchedule, isLoading: classLoading } = useQuery<ClassSchedule[]>({
    queryKey: ["/api/students/class-schedule"],
  });

  const { data: examSchedule, isLoading: examLoading } = useQuery<ExamSchedule[]>({
    queryKey: ["/api/students/exam-schedule"],
  });

  // Get week days
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Days of week mapping
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Group class schedule by day
  const scheduleByDay = classSchedule?.reduce((acc, item) => {
    const dayIndex = dayNames.indexOf(item.dayOfWeek);
    if (dayIndex !== -1) {
      if (!acc[dayIndex]) acc[dayIndex] = [];
      acc[dayIndex].push(item);
    }
    return acc;
  }, {} as Record<number, ClassSchedule[]>) || {};

  // Sort classes by time for each day
  Object.keys(scheduleByDay).forEach(day => {
    scheduleByDay[parseInt(day)].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  // Get upcoming exams
  const upcomingExams = examSchedule?.filter(exam => new Date(exam.examDate) >= new Date()) || [];

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  const getTimeSlot = (startTime: string, endTime: string) => {
    return `${format(new Date(`2000-01-01 ${startTime}`), 'h:mm a')} - ${format(new Date(`2000-01-01 ${endTime}`), 'h:mm a')}`;
  };

  if (classLoading || examLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-violet-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/student">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Portal
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Class Schedule
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  ক্লাসের সময়সূচী • Weekly timetable and exam schedule
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <Button
                  variant={viewMode === 'classes' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('classes')}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Classes
                </Button>
                <Button
                  variant={viewMode === 'exams' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('exams')}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Exams
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'classes' ? (
          <>
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Week of {format(weekStart, 'MMMM d, yyyy')}
                </h2>
                <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentWeek(new Date())}
              >
                Today
              </Button>
            </div>

            {/* Weekly Schedule Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
              {weekDays.map((day, dayIndex) => (
                <Card key={dayIndex} className={`shadow-lg ${isToday(day) ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-center">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {dayNamesShort[dayIndex]}
                      </div>
                      <div className={`text-2xl font-bold ${isToday(day) ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>
                        {format(day, 'd')}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {scheduleByDay[dayIndex]?.map((classItem) => (
                      <div key={classItem.id} className="p-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg border border-violet-200 dark:border-violet-700">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-violet-900 dark:text-violet-300 text-sm">
                              {classItem.subject?.name || 'Unknown Subject'}
                            </h4>
                            <p className="text-xs text-violet-700 dark:text-violet-400">
                              {classItem.subject?.code}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {getTimeSlot(classItem.startTime, classItem.endTime)}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{classItem.teacher?.name || 'TBA'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{classItem.room}</span>
                          </div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No classes</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          /* Exam Schedule */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="h-5 w-5 text-orange-600" />
                    <span>Upcoming Exams</span>
                  </CardTitle>
                  <CardDescription>
                    Scheduled examinations and important dates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingExams.map((exam) => (
                      <div key={exam.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-6 hover:shadow-md transition-all duration-200">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                              {exam.examName}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300">
                              {exam.subject?.name} ({exam.subject?.code})
                            </p>
                          </div>
                          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                            {format(new Date(exam.examDate), 'MMM d')}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span>{format(new Date(exam.examDate), 'EEEE, MMMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span>{getTimeSlot(exam.startTime, exam.endTime)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span>{exam.room}</span>
                          </div>
                        </div>
                        
                        {exam.syllabus && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-1">Syllabus Coverage</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-400">
                              {exam.syllabus}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {upcomingExams.length === 0 && (
                      <div className="text-center py-12">
                        <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          No Upcoming Exams
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          There are no scheduled exams at this time.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Today's Classes */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span>Today's Classes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {scheduleByDay[new Date().getDay()]?.slice(0, 3).map((classItem) => (
                      <div key={classItem.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                            {classItem.subject?.name}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {getTimeSlot(classItem.startTime, classItem.endTime)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {classItem.teacher?.name} • {classItem.room}
                        </p>
                      </div>
                    )) || (
                      <p className="text-gray-600 dark:text-gray-400 text-sm text-center py-4">
                        No classes today
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Info */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Schedule Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-1">Class Timings</h4>
                    <p className="text-blue-700 dark:text-blue-400">
                      Regular classes: 8:00 AM - 3:00 PM
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h4 className="font-medium text-green-900 dark:text-green-300 mb-1">Break Times</h4>
                    <p className="text-green-700 dark:text-green-400">
                      Lunch: 12:00 PM - 1:00 PM
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <h4 className="font-medium text-purple-900 dark:text-purple-300 mb-1">Weekly Classes</h4>
                    <p className="text-purple-700 dark:text-purple-400">
                      {classSchedule?.length || 0} total classes per week
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}