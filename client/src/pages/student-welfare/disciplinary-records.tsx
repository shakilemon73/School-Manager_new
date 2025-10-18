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
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { 
  Plus, 
  AlertTriangle, 
  Search, 
  Filter,
  FileWarning,
  ShieldAlert,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

const severityColors = {
  low: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  critical: 'bg-red-100 text-red-800 border-red-300',
};

const statusColors = {
  reported: 'bg-blue-100 text-blue-800',
  investigating: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

export default function DisciplinaryRecordsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [activeTab, setActiveTab] = useState('all-incidents');
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddIncidentOpen, setIsAddIncidentOpen] = useState(false);
  const [isAddActionOpen, setIsAddActionOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [isViewIncidentOpen, setIsViewIncidentOpen] = useState(false);

  const [newCategory, setNewCategory] = useState({
    name: '',
    nameBn: '',
    severity: 'medium',
    description: '',
  });

  const [newIncident, setNewIncident] = useState({
    studentId: '',
    categoryId: '',
    incidentDate: new Date().toISOString().split('T')[0],
    incidentTime: '',
    description: '',
    location: '',
    witnesses: '',
    status: 'reported',
  });

  const [newAction, setNewAction] = useState({
    incidentId: '',
    actionType: 'warning',
    actionDate: new Date().toISOString().split('T')[0],
    description: '',
    actionTakenBy: '',
    followUpRequired: false,
    followUpDate: '',
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['incident-categories', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_categories')
        .select('*')
        .eq('school_id', schoolId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students-for-incidents', schoolId],
    queryFn: async () => {
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

  const { data: incidents = [], isLoading: incidentsLoading, refetch: refetchIncidents } = useQuery({
    queryKey: ['disciplinary-incidents', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disciplinary_incidents')
        .select(`
          *,
          student:students(id, student_id, name, class, section),
          category:incident_categories(id, name, name_bn, severity)
        `)
        .eq('school_id', schoolId)
        .order('incident_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: actions = [], isLoading: actionsLoading, refetch: refetchActions } = useQuery({
    queryKey: ['disciplinary-actions', selectedIncident?.id, schoolId],
    queryFn: async () => {
      if (!selectedIncident?.id) return [];
      const { data, error } = await supabase
        .from('disciplinary_actions')
        .select('*')
        .eq('incident_id', selectedIncident.id)
        .eq('school_id', schoolId)
        .order('action_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedIncident?.id,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: any) => {
      const { data, error } = await supabase
        .from('incident_categories')
        .insert({
          ...categoryData,
          school_id: schoolId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-categories'] });
      toast({
        title: "Category Created",
        description: "Incident category has been created successfully",
      });
      setIsAddCategoryOpen(false);
      setNewCategory({ name: '', nameBn: '', severity: 'medium', description: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive",
      });
    },
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (incidentData: any) => {
      const { data, error } = await supabase
        .from('disciplinary_incidents')
        .insert({
          student_id: parseInt(incidentData.studentId),
          category_id: parseInt(incidentData.categoryId),
          incident_date: incidentData.incidentDate,
          incident_time: incidentData.incidentTime || null,
          description: incidentData.description,
          location: incidentData.location || null,
          witnesses: incidentData.witnesses || null,
          status: incidentData.status,
          school_id: schoolId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary-incidents'] });
      toast({
        title: "Incident Reported",
        description: "Disciplinary incident has been reported successfully",
      });
      setIsAddIncidentOpen(false);
      setNewIncident({
        studentId: '',
        categoryId: '',
        incidentDate: new Date().toISOString().split('T')[0],
        incidentTime: '',
        description: '',
        location: '',
        witnesses: '',
        status: 'reported',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to report incident",
        variant: "destructive",
      });
    },
  });

  const createActionMutation = useMutation({
    mutationFn: async (actionData: any) => {
      const { data, error } = await supabase
        .from('disciplinary_actions')
        .insert({
          incident_id: parseInt(actionData.incidentId),
          action_type: actionData.actionType,
          action_date: actionData.actionDate,
          description: actionData.description,
          action_taken_by: actionData.actionTakenBy,
          follow_up_required: actionData.followUpRequired,
          follow_up_date: actionData.followUpDate || null,
          school_id: schoolId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary-actions'] });
      queryClient.invalidateQueries({ queryKey: ['disciplinary-incidents'] });
      toast({
        title: "Action Recorded",
        description: "Disciplinary action has been recorded successfully",
      });
      setIsAddActionOpen(false);
      setNewAction({
        incidentId: '',
        actionType: 'warning',
        actionDate: new Date().toISOString().split('T')[0],
        description: '',
        actionTakenBy: '',
        followUpRequired: false,
        followUpDate: '',
      });
      refetchActions();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record action",
        variant: "destructive",
      });
    },
  });

  const updateIncidentStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { data, error } = await supabase
        .from('disciplinary_incidents')
        .update({ status })
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary-incidents'] });
      toast({
        title: "Status Updated",
        description: "Incident status has been updated successfully",
      });
    },
  });

  const filteredIncidents = incidents.filter((incident: any) => {
    const matchesSearch = searchText === '' || 
      incident.student?.name.toLowerCase().includes(searchText.toLowerCase()) ||
      incident.description?.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = filterCategory === 'all' || incident.category_id === parseInt(filterCategory);
    const matchesSeverity = filterSeverity === 'all' || incident.category?.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || incident.status === filterStatus;
    return matchesSearch && matchesCategory && matchesSeverity && matchesStatus;
  });

  const stats = {
    total: incidents.length,
    reported: incidents.filter((i: any) => i.status === 'reported').length,
    investigating: incidents.filter((i: any) => i.status === 'investigating').length,
    resolved: incidents.filter((i: any) => i.status === 'resolved').length,
    critical: incidents.filter((i: any) => i.category?.severity === 'critical').length,
  };

  return (
    <AppShell>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="page-title">
              <ShieldAlert className="h-8 w-8 text-red-600" />
              Disciplinary Records
            </h1>
            <p className="text-muted-foreground mt-1">Manage student disciplinary incidents and actions</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-add-category">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-add-category">
                <DialogHeader>
                  <DialogTitle>Add Incident Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Category Name (English)</Label>
                    <Input
                      data-testid="input-category-name"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      placeholder="e.g., Fighting, Bullying"
                    />
                  </div>
                  <div>
                    <Label>Category Name (বাংলা)</Label>
                    <Input
                      data-testid="input-category-name-bn"
                      value={newCategory.nameBn}
                      onChange={(e) => setNewCategory({ ...newCategory, nameBn: e.target.value })}
                      placeholder="e.g., মারামারি, উত্ত্যক্তকরণ"
                    />
                  </div>
                  <div>
                    <Label>Severity Level</Label>
                    <Select value={newCategory.severity} onValueChange={(value) => setNewCategory({ ...newCategory, severity: value })}>
                      <SelectTrigger data-testid="select-severity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      data-testid="input-category-description"
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                      placeholder="Category description..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={() => createCategoryMutation.mutate(newCategory)}
                    disabled={createCategoryMutation.isPending || !newCategory.name}
                    data-testid="button-save-category"
                  >
                    {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddIncidentOpen} onOpenChange={setIsAddIncidentOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-report-incident">
                  <Plus className="h-4 w-4 mr-2" />
                  Report Incident
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl" data-testid="dialog-report-incident">
                <DialogHeader>
                  <DialogTitle>Report New Incident</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Student</Label>
                      <Select value={newIncident.studentId} onValueChange={(value) => setNewIncident({ ...newIncident, studentId: value })}>
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
                      <Label>Category</Label>
                      <Select value={newIncident.categoryId} onValueChange={(value) => setNewIncident({ ...newIncident, categoryId: value })}>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.name} ({cat.severity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Incident Date</Label>
                      <Input
                        type="date"
                        data-testid="input-incident-date"
                        value={newIncident.incidentDate}
                        onChange={(e) => setNewIncident({ ...newIncident, incidentDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Incident Time (Optional)</Label>
                      <Input
                        type="time"
                        data-testid="input-incident-time"
                        value={newIncident.incidentTime}
                        onChange={(e) => setNewIncident({ ...newIncident, incidentTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Location (Optional)</Label>
                    <Input
                      data-testid="input-location"
                      value={newIncident.location}
                      onChange={(e) => setNewIncident({ ...newIncident, location: e.target.value })}
                      placeholder="e.g., Playground, Classroom 101"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      data-testid="input-incident-description"
                      value={newIncident.description}
                      onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                      placeholder="Describe the incident in detail..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Witnesses (Optional)</Label>
                    <Input
                      data-testid="input-witnesses"
                      value={newIncident.witnesses}
                      onChange={(e) => setNewIncident({ ...newIncident, witnesses: e.target.value })}
                      placeholder="Names of witnesses, separated by commas"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => createIncidentMutation.mutate(newIncident)}
                    disabled={createIncidentMutation.isPending || !newIncident.studentId || !newIncident.categoryId || !newIncident.description}
                    data-testid="button-save-incident"
                  >
                    {createIncidentMutation.isPending ? 'Reporting...' : 'Report Incident'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card data-testid="card-stat-total">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Incidents</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileWarning className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-reported">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Reported</p>
                  <p className="text-2xl font-bold">{stats.reported}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-investigating">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Investigating</p>
                  <p className="text-2xl font-bold">{stats.investigating}</p>
                </div>
                <Search className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-resolved">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-2xl font-bold">{stats.resolved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-critical">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold">{stats.critical}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all-incidents" data-testid="tab-all-incidents">All Incidents</TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
            <TabsTrigger value="statistics" data-testid="tab-statistics">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="all-incidents" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by student name or description..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="pl-8"
                        data-testid="input-search-incidents"
                      />
                    </div>
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-full md:w-48" data-testid="select-filter-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger className="w-full md:w-40" data-testid="select-filter-severity">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-40" data-testid="select-filter-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="reported">Reported</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {incidentsLoading ? (
                  <div className="text-center py-8">Loading incidents...</div>
                ) : filteredIncidents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No incidents found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIncidents.map((incident: any) => (
                        <TableRow key={incident.id} data-testid={`row-incident-${incident.id}`}>
                          <TableCell>{format(new Date(incident.incident_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{incident.student?.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {incident.student?.class}-{incident.student?.section}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{incident.category?.name}</TableCell>
                          <TableCell>
                            <Badge className={severityColors[incident.category?.severity as keyof typeof severityColors]} data-testid={`badge-severity-${incident.id}`}>
                              {incident.category?.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={incident.status} 
                              onValueChange={(value) => updateIncidentStatusMutation.mutate({ id: incident.id, status: value })}
                            >
                              <SelectTrigger className="w-32" data-testid={`select-status-${incident.id}`}>
                                <Badge className={statusColors[incident.status as keyof typeof statusColors]}>
                                  {incident.status}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="reported">Reported</SelectItem>
                                <SelectItem value="investigating">Investigating</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedIncident(incident);
                                setIsViewIncidentOpen(true);
                              }}
                              data-testid={`button-view-${incident.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Incident Categories</CardTitle>
                <CardDescription>Manage disciplinary incident categories and severity levels</CardDescription>
              </CardHeader>
              <CardContent>
                {categoriesLoading ? (
                  <div className="text-center py-8">Loading categories...</div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No categories found</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((cat: any) => (
                      <Card key={cat.id} data-testid={`card-category-${cat.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold">{cat.name}</h3>
                              {cat.name_bn && <p className="text-sm text-muted-foreground">{cat.name_bn}</p>}
                              {cat.description && <p className="text-sm mt-2">{cat.description}</p>}
                            </div>
                            <Badge className={severityColors[cat.severity as keyof typeof severityColors]}>
                              {cat.severity}
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

          <TabsContent value="statistics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Disciplinary Statistics</CardTitle>
                <CardDescription>Overview of disciplinary incidents and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Low Severity</p>
                      <p className="text-2xl font-bold text-green-600">
                        {incidents.filter((i: any) => i.category?.severity === 'low').length}
                      </p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Medium Severity</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {incidents.filter((i: any) => i.category?.severity === 'medium').length}
                      </p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">High Severity</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {incidents.filter((i: any) => i.category?.severity === 'high').length}
                      </p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Critical Severity</p>
                      <p className="text-2xl font-bold text-red-600">
                        {incidents.filter((i: any) => i.category?.severity === 'critical').length}
                      </p>
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Category Breakdown</h3>
                    <div className="space-y-2">
                      {categories.map((cat: any) => {
                        const count = incidents.filter((i: any) => i.category_id === cat.id).length;
                        return (
                          <div key={cat.id} className="flex items-center justify-between">
                            <span>{cat.name}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isViewIncidentOpen} onOpenChange={setIsViewIncidentOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-view-incident">
            <DialogHeader>
              <DialogTitle>Incident Details</DialogTitle>
            </DialogHeader>
            {selectedIncident && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Student</Label>
                    <p className="font-medium">{selectedIncident.student?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedIncident.student?.class}-{selectedIncident.student?.section}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-medium">{selectedIncident.category?.name}</p>
                      <Badge className={severityColors[selectedIncident.category?.severity as keyof typeof severityColors]}>
                        {selectedIncident.category?.severity}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date & Time</Label>
                    <p className="font-medium">
                      {format(new Date(selectedIncident.incident_date), 'MMM dd, yyyy')}
                      {selectedIncident.incident_time && ` at ${selectedIncident.incident_time}`}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Location</Label>
                    <p className="font-medium">{selectedIncident.location || 'Not specified'}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1">{selectedIncident.description}</p>
                </div>
                {selectedIncident.witnesses && (
                  <div>
                    <Label className="text-muted-foreground">Witnesses</Label>
                    <p className="mt-1">{selectedIncident.witnesses}</p>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Disciplinary Actions</h3>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setNewAction({ ...newAction, incidentId: selectedIncident.id });
                        setIsAddActionOpen(true);
                      }}
                      data-testid="button-add-action"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Action
                    </Button>
                  </div>
                  {actionsLoading ? (
                    <div className="text-center py-4">Loading actions...</div>
                  ) : actions.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No actions recorded yet</div>
                  ) : (
                    <div className="space-y-3">
                      {actions.map((action: any) => (
                        <Card key={action.id} data-testid={`card-action-${action.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline">{action.action_type}</Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(action.action_date), 'MMM dd, yyyy')}
                                  </span>
                                </div>
                                <p className="text-sm">{action.description}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  By: {action.action_taken_by}
                                </p>
                                {action.follow_up_required && (
                                  <Badge variant="outline" className="mt-2">
                                    Follow-up: {action.follow_up_date ? format(new Date(action.follow_up_date), 'MMM dd, yyyy') : 'TBD'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isAddActionOpen} onOpenChange={setIsAddActionOpen}>
          <DialogContent data-testid="dialog-add-action">
            <DialogHeader>
              <DialogTitle>Record Disciplinary Action</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Action Type</Label>
                <Select value={newAction.actionType} onValueChange={(value) => setNewAction({ ...newAction, actionType: value })}>
                  <SelectTrigger data-testid="select-action-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="suspension">Suspension</SelectItem>
                    <SelectItem value="expulsion">Expulsion</SelectItem>
                    <SelectItem value="counseling">Counseling</SelectItem>
                    <SelectItem value="parent_meeting">Parent Meeting</SelectItem>
                    <SelectItem value="detention">Detention</SelectItem>
                    <SelectItem value="community_service">Community Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Action Date</Label>
                <Input
                  type="date"
                  data-testid="input-action-date"
                  value={newAction.actionDate}
                  onChange={(e) => setNewAction({ ...newAction, actionDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  data-testid="input-action-description"
                  value={newAction.description}
                  onChange={(e) => setNewAction({ ...newAction, description: e.target.value })}
                  placeholder="Describe the action taken..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Action Taken By</Label>
                <Input
                  data-testid="input-action-taken-by"
                  value={newAction.actionTakenBy}
                  onChange={(e) => setNewAction({ ...newAction, actionTakenBy: e.target.value })}
                  placeholder="Name of person taking action"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="followUpRequired"
                  checked={newAction.followUpRequired}
                  onChange={(e) => setNewAction({ ...newAction, followUpRequired: e.target.checked })}
                  data-testid="checkbox-follow-up"
                />
                <Label htmlFor="followUpRequired">Follow-up Required</Label>
              </div>
              {newAction.followUpRequired && (
                <div>
                  <Label>Follow-up Date</Label>
                  <Input
                    type="date"
                    data-testid="input-follow-up-date"
                    value={newAction.followUpDate}
                    onChange={(e) => setNewAction({ ...newAction, followUpDate: e.target.value })}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={() => createActionMutation.mutate(newAction)}
                disabled={createActionMutation.isPending || !newAction.description || !newAction.actionTakenBy}
                data-testid="button-save-action"
              >
                {createActionMutation.isPending ? 'Recording...' : 'Record Action'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
