import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { userProfile } from '@/hooks/use-supabase-direct-auth';
import { 
  Plus, 
  Trophy, 
  Search, 
  Users,
  Medal,
  Award,
  CalendarDays,
  MapPin,
  UserPlus,
  Star,
  Upload,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

const categoryColors = {
  sports: 'bg-blue-100 text-blue-800',
  cultural: 'bg-purple-100 text-purple-800',
  academic: 'bg-green-100 text-green-800',
  social: 'bg-orange-100 text-orange-800',
};

const achievementLevelColors = {
  school: 'bg-blue-100 text-blue-800',
  district: 'bg-green-100 text-green-800',
  national: 'bg-orange-100 text-orange-800',
  international: 'bg-red-100 text-red-800',
};

export default function CoCurricularActivitiesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('activities');
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [isEnrollStudentOpen, setIsEnrollStudentOpen] = useState(false);
  const [isAddAchievementOpen, setIsAddAchievementOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  const [newActivity, setNewActivity] = useState({
    name: '',
    nameBn: '',
    category: 'sports',
    description: '',
    coordinator: '',
    schedule: '',
    location: '',
    maxParticipants: '',
    isActive: true,
  });

  const [newEnrollment, setNewEnrollment] = useState({
    activityId: '',
    studentId: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [newAchievement, setNewAchievement] = useState({
    activityId: '',
    studentId: '',
    achievementType: 'trophy',
    achievementName: '',
    achievementNameBn: '',
    level: 'school',
    position: '',
    achievementDate: new Date().toISOString().split('T')[0],
    certificateUrl: '',
  });

  const getCurrentSchoolId = async (): Promise<number> => {
    const schoolId = await userProfile.getCurrentUserSchoolId();
    if (!schoolId) throw new Error('User school ID not found');
    return schoolId;
  };

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('activities')
        .select('*, enrollments:activity_enrollments(count)')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-for-activities'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('students')
        .select('id, student_id, name, class, section')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['activity-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_enrollments')
        .select(`
          *,
          activity:activities(id, name, name_bn, category),
          student:students(id, student_id, name, class, section)
        `)
        .eq('is_active', true)
        .order('enrollment_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: achievements = [], isLoading: achievementsLoading } = useQuery({
    queryKey: ['activity-achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_achievements')
        .select(`
          *,
          activity:activities(id, name, name_bn, category),
          student:students(id, student_id, name, class, section)
        `)
        .order('achievement_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: async (activityData: any) => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('activities')
        .insert({
          name: activityData.name,
          name_bn: activityData.nameBn,
          category: activityData.category,
          description: activityData.description,
          coordinator: activityData.coordinator,
          schedule: activityData.schedule,
          location: activityData.location,
          max_participants: activityData.maxParticipants ? parseInt(activityData.maxParticipants) : null,
          is_active: activityData.isActive,
          school_id: schoolId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({
        title: "Activity Created",
        description: "Co-curricular activity has been created successfully",
      });
      setIsAddActivityOpen(false);
      setNewActivity({
        name: '',
        nameBn: '',
        category: 'sports',
        description: '',
        coordinator: '',
        schedule: '',
        location: '',
        maxParticipants: '',
        isActive: true,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create activity",
        variant: "destructive",
      });
    },
  });

  const enrollStudentMutation = useMutation({
    mutationFn: async (enrollmentData: any) => {
      const { data, error } = await supabase
        .from('activity_enrollments')
        .insert({
          activity_id: parseInt(enrollmentData.activityId),
          student_id: parseInt(enrollmentData.studentId),
          enrollment_date: enrollmentData.enrollmentDate,
          notes: enrollmentData.notes || null,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({
        title: "Student Enrolled",
        description: "Student has been enrolled in the activity successfully",
      });
      setIsEnrollStudentOpen(false);
      setNewEnrollment({
        activityId: '',
        studentId: '',
        enrollmentDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to enroll student",
        variant: "destructive",
      });
    },
  });

  const recordAchievementMutation = useMutation({
    mutationFn: async (achievementData: any) => {
      const { data, error } = await supabase
        .from('activity_achievements')
        .insert({
          activity_id: parseInt(achievementData.activityId),
          student_id: parseInt(achievementData.studentId),
          achievement_type: achievementData.achievementType,
          achievement_name: achievementData.achievementName,
          achievement_name_bn: achievementData.achievementNameBn || null,
          level: achievementData.level,
          position: achievementData.position || null,
          achievement_date: achievementData.achievementDate,
          certificate_url: achievementData.certificateUrl || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-achievements'] });
      toast({
        title: "Achievement Recorded",
        description: "Student achievement has been recorded successfully",
      });
      setIsAddAchievementOpen(false);
      setNewAchievement({
        activityId: '',
        studentId: '',
        achievementType: 'trophy',
        achievementName: '',
        achievementNameBn: '',
        level: 'school',
        position: '',
        achievementDate: new Date().toISOString().split('T')[0],
        certificateUrl: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record achievement",
        variant: "destructive",
      });
    },
  });

  const filteredActivities = activities.filter((activity: any) => {
    const matchesSearch = searchText === '' || 
      activity.name.toLowerCase().includes(searchText.toLowerCase()) ||
      activity.name_bn?.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = filterCategory === 'all' || activity.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && activity.is_active) ||
      (filterStatus === 'inactive' && !activity.is_active);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    totalActivities: activities.length,
    activeActivities: activities.filter((a: any) => a.is_active).length,
    totalEnrollments: enrollments.length,
    totalAchievements: achievements.length,
  };

  return (
    <AppShell>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="page-title">
              <Activity className="h-8 w-8 text-blue-600" />
              Co-Curricular Activities
            </h1>
            <p className="text-muted-foreground mt-1">Manage student activities and achievements</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddActivityOpen} onOpenChange={setIsAddActivityOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-activity">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Activity
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl" data-testid="dialog-add-activity">
                <DialogHeader>
                  <DialogTitle>Create New Activity</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Activity Name (English)</Label>
                      <Input
                        data-testid="input-activity-name"
                        value={newActivity.name}
                        onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                        placeholder="e.g., Football Team"
                      />
                    </div>
                    <div>
                      <Label>Activity Name (বাংলা)</Label>
                      <Input
                        data-testid="input-activity-name-bn"
                        value={newActivity.nameBn}
                        onChange={(e) => setNewActivity({ ...newActivity, nameBn: e.target.value })}
                        placeholder="e.g., ফুটবল দল"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select value={newActivity.category} onValueChange={(value) => setNewActivity({ ...newActivity, category: value })}>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sports">Sports</SelectItem>
                          <SelectItem value="cultural">Cultural</SelectItem>
                          <SelectItem value="academic">Academic</SelectItem>
                          <SelectItem value="social">Social</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Max Participants (Optional)</Label>
                      <Input
                        type="number"
                        data-testid="input-max-participants"
                        value={newActivity.maxParticipants}
                        onChange={(e) => setNewActivity({ ...newActivity, maxParticipants: e.target.value })}
                        placeholder="e.g., 20"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Coordinator</Label>
                    <Input
                      data-testid="input-coordinator"
                      value={newActivity.coordinator}
                      onChange={(e) => setNewActivity({ ...newActivity, coordinator: e.target.value })}
                      placeholder="Name of the coordinator"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Schedule</Label>
                      <Input
                        data-testid="input-schedule"
                        value={newActivity.schedule}
                        onChange={(e) => setNewActivity({ ...newActivity, schedule: e.target.value })}
                        placeholder="e.g., Mon, Wed 4-5 PM"
                      />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input
                        data-testid="input-location"
                        value={newActivity.location}
                        onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
                        placeholder="e.g., Sports Ground"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      data-testid="input-description"
                      value={newActivity.description}
                      onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                      placeholder="Activity description..."
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={newActivity.isActive}
                      onChange={(e) => setNewActivity({ ...newActivity, isActive: e.target.checked })}
                      data-testid="checkbox-active"
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => createActivityMutation.mutate(newActivity)}
                    disabled={createActivityMutation.isPending || !newActivity.name}
                    data-testid="button-save-activity"
                  >
                    {createActivityMutation.isPending ? 'Creating...' : 'Create Activity'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isEnrollStudentOpen} onOpenChange={setIsEnrollStudentOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-enroll-student">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Enroll Student
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-enroll-student">
                <DialogHeader>
                  <DialogTitle>Enroll Student in Activity</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Activity</Label>
                    <Select value={newEnrollment.activityId} onValueChange={(value) => setNewEnrollment({ ...newEnrollment, activityId: value })}>
                      <SelectTrigger data-testid="select-activity">
                        <SelectValue placeholder="Select activity" />
                      </SelectTrigger>
                      <SelectContent>
                        {activities.filter((a: any) => a.is_active).map((activity: any) => (
                          <SelectItem key={activity.id} value={activity.id.toString()}>
                            {activity.name} ({activity.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Student</Label>
                    <Select value={newEnrollment.studentId} onValueChange={(value) => setNewEnrollment({ ...newEnrollment, studentId: value })}>
                      <SelectTrigger data-testid="select-student">
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student: any) => (
                          <SelectItem key={student.id} value={student.id.toString()}>
                            {student.name} ({student.class}-{student.section})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Enrollment Date</Label>
                    <Input
                      type="date"
                      data-testid="input-enrollment-date"
                      value={newEnrollment.enrollmentDate}
                      onChange={(e) => setNewEnrollment({ ...newEnrollment, enrollmentDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      data-testid="input-enrollment-notes"
                      value={newEnrollment.notes}
                      onChange={(e) => setNewEnrollment({ ...newEnrollment, notes: e.target.value })}
                      placeholder="Any additional notes..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => enrollStudentMutation.mutate(newEnrollment)}
                    disabled={enrollStudentMutation.isPending || !newEnrollment.activityId || !newEnrollment.studentId}
                    data-testid="button-save-enrollment"
                  >
                    {enrollStudentMutation.isPending ? 'Enrolling...' : 'Enroll Student'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddAchievementOpen} onOpenChange={setIsAddAchievementOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-add-achievement">
                  <Trophy className="h-4 w-4 mr-2" />
                  Record Achievement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl" data-testid="dialog-add-achievement">
                <DialogHeader>
                  <DialogTitle>Record Student Achievement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Activity</Label>
                      <Select value={newAchievement.activityId} onValueChange={(value) => setNewAchievement({ ...newAchievement, activityId: value })}>
                        <SelectTrigger data-testid="select-achievement-activity">
                          <SelectValue placeholder="Select activity" />
                        </SelectTrigger>
                        <SelectContent>
                          {activities.map((activity: any) => (
                            <SelectItem key={activity.id} value={activity.id.toString()}>
                              {activity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Student</Label>
                      <Select value={newAchievement.studentId} onValueChange={(value) => setNewAchievement({ ...newAchievement, studentId: value })}>
                        <SelectTrigger data-testid="select-achievement-student">
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((student: any) => (
                            <SelectItem key={student.id} value={student.id.toString()}>
                              {student.name} ({student.class}-{student.section})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Achievement Type</Label>
                      <Select value={newAchievement.achievementType} onValueChange={(value) => setNewAchievement({ ...newAchievement, achievementType: value })}>
                        <SelectTrigger data-testid="select-achievement-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trophy">Trophy</SelectItem>
                          <SelectItem value="medal">Medal</SelectItem>
                          <SelectItem value="certificate">Certificate</SelectItem>
                          <SelectItem value="award">Award</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Level</Label>
                      <Select value={newAchievement.level} onValueChange={(value) => setNewAchievement({ ...newAchievement, level: value })}>
                        <SelectTrigger data-testid="select-level">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="school">School</SelectItem>
                          <SelectItem value="district">District</SelectItem>
                          <SelectItem value="national">National</SelectItem>
                          <SelectItem value="international">International</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Achievement Name</Label>
                      <Input
                        data-testid="input-achievement-name"
                        value={newAchievement.achievementName}
                        onChange={(e) => setNewAchievement({ ...newAchievement, achievementName: e.target.value })}
                        placeholder="e.g., First Place in Football"
                      />
                    </div>
                    <div>
                      <Label>Achievement Name (বাংলা)</Label>
                      <Input
                        data-testid="input-achievement-name-bn"
                        value={newAchievement.achievementNameBn}
                        onChange={(e) => setNewAchievement({ ...newAchievement, achievementNameBn: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Position (Optional)</Label>
                      <Select value={newAchievement.position} onValueChange={(value) => setNewAchievement({ ...newAchievement, position: value })}>
                        <SelectTrigger data-testid="select-position">
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1st">1st Place</SelectItem>
                          <SelectItem value="2nd">2nd Place</SelectItem>
                          <SelectItem value="3rd">3rd Place</SelectItem>
                          <SelectItem value="participant">Participant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Achievement Date</Label>
                      <Input
                        type="date"
                        data-testid="input-achievement-date"
                        value={newAchievement.achievementDate}
                        onChange={(e) => setNewAchievement({ ...newAchievement, achievementDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Certificate URL (Optional)</Label>
                    <Input
                      data-testid="input-certificate-url"
                      value={newAchievement.certificateUrl}
                      onChange={(e) => setNewAchievement({ ...newAchievement, certificateUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => recordAchievementMutation.mutate(newAchievement)}
                    disabled={recordAchievementMutation.isPending || !newAchievement.achievementName || !newAchievement.activityId || !newAchievement.studentId}
                    data-testid="button-save-achievement"
                  >
                    {recordAchievementMutation.isPending ? 'Recording...' : 'Record Achievement'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card data-testid="card-stat-total-activities">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Activities</p>
                  <p className="text-2xl font-bold">{stats.totalActivities}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-active">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Activities</p>
                  <p className="text-2xl font-bold">{stats.activeActivities}</p>
                </div>
                <Star className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-enrollments">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Enrollments</p>
                  <p className="text-2xl font-bold">{stats.totalEnrollments}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-achievements">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Achievements</p>
                  <p className="text-2xl font-bold">{stats.totalAchievements}</p>
                </div>
                <Trophy className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activities" data-testid="tab-activities">Activities</TabsTrigger>
            <TabsTrigger value="enrollments" data-testid="tab-enrollments">Enrollments</TabsTrigger>
            <TabsTrigger value="achievements" data-testid="tab-achievements">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search activities..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="pl-8"
                        data-testid="input-search-activities"
                      />
                    </div>
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-full md:w-40" data-testid="select-filter-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="cultural">Cultural</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-32" data-testid="select-filter-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {activitiesLoading ? (
                  <div className="text-center py-8">Loading activities...</div>
                ) : filteredActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No activities found</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredActivities.map((activity: any) => (
                      <Card key={activity.id} data-testid={`card-activity-${activity.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold">{activity.name}</h3>
                              {activity.name_bn && (
                                <p className="text-sm text-muted-foreground">{activity.name_bn}</p>
                              )}
                            </div>
                            <Badge className={categoryColors[activity.category as keyof typeof categoryColors]}>
                              {activity.category}
                            </Badge>
                          </div>
                          {activity.description && (
                            <p className="text-sm mb-3 line-clamp-2">{activity.description}</p>
                          )}
                          <div className="space-y-1 text-sm">
                            {activity.coordinator && (
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{activity.coordinator}</span>
                              </div>
                            )}
                            {activity.schedule && (
                              <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                <span>{activity.schedule}</span>
                              </div>
                            )}
                            {activity.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{activity.location}</span>
                              </div>
                            )}
                            {activity.max_participants && (
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {activity.enrollments?.[0]?.count || 0} / {activity.max_participants} participants
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="mt-3">
                            <Badge variant={activity.is_active ? "default" : "secondary"}>
                              {activity.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enrollments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Student Enrollments</CardTitle>
                <CardDescription>View all student enrollments in activities</CardDescription>
              </CardHeader>
              <CardContent>
                {enrollmentsLoading ? (
                  <div className="text-center py-8">Loading enrollments...</div>
                ) : enrollments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No enrollments found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Enrollment Date</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrollments.map((enrollment: any) => (
                        <TableRow key={enrollment.id} data-testid={`row-enrollment-${enrollment.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{enrollment.student?.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {enrollment.student?.class}-{enrollment.student?.section}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{enrollment.activity?.name}</div>
                              {enrollment.activity?.name_bn && (
                                <div className="text-sm text-muted-foreground">{enrollment.activity?.name_bn}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={categoryColors[enrollment.activity?.category as keyof typeof categoryColors]}>
                              {enrollment.activity?.category}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(enrollment.enrollment_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="max-w-xs truncate">{enrollment.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Student Achievements</CardTitle>
                <CardDescription>View all student achievements and awards</CardDescription>
              </CardHeader>
              <CardContent>
                {achievementsLoading ? (
                  <div className="text-center py-8">Loading achievements...</div>
                ) : achievements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No achievements found</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements.map((achievement: any) => (
                      <Card key={achievement.id} data-testid={`card-achievement-${achievement.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-yellow-100">
                              {achievement.achievement_type === 'trophy' && <Trophy className="h-6 w-6 text-yellow-600" />}
                              {achievement.achievement_type === 'medal' && <Medal className="h-6 w-6 text-yellow-600" />}
                              {achievement.achievement_type === 'certificate' && <Award className="h-6 w-6 text-yellow-600" />}
                              {achievement.achievement_type === 'award' && <Star className="h-6 w-6 text-yellow-600" />}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold">{achievement.achievement_name}</h3>
                              {achievement.achievement_name_bn && (
                                <p className="text-sm text-muted-foreground">{achievement.achievement_name_bn}</p>
                              )}
                              <div className="mt-2 space-y-1">
                                <div className="text-sm">
                                  <span className="font-medium">{achievement.student?.name}</span>
                                  <span className="text-muted-foreground">
                                    {' '}({achievement.student?.class}-{achievement.student?.section})
                                  </span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {achievement.activity?.name}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge className={achievementLevelColors[achievement.level as keyof typeof achievementLevelColors]}>
                                    {achievement.level}
                                  </Badge>
                                  {achievement.position && (
                                    <Badge variant="outline">{achievement.position}</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {format(new Date(achievement.achievement_date), 'MMM dd, yyyy')}
                                </div>
                                {achievement.certificate_url && (
                                  <a 
                                    href={achievement.certificate_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                  >
                                    <Upload className="h-3 w-3" />
                                    View Certificate
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
