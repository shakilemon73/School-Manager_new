import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { userProfile } from '@/hooks/use-supabase-direct-auth';
import { useToast } from '@/hooks/use-toast';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  MessageSquare, 
  Plus, 
  Send, 
  Edit, 
  Trash2, 
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

interface NotificationTemplate {
  id: number;
  name: string;
  name_bn: string | null;
  description: string | null;
  category: string;
  subject: string | null;
  subject_bn: string | null;
  body: string;
  body_bn: string | null;
  variables: string[] | null;
  is_active: boolean;
  school_id: number;
  created_at: string;
}

interface NotificationLog {
  id: number;
  template_id: number | null;
  recipient_type: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  channel: string;
  subject: string | null;
  body: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  error_message: string | null;
  school_id: number;
  created_at: string;
}

export default function NotificationsSystemPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);

  const [templateForm, setTemplateForm] = useState({
    name: '',
    name_bn: '',
    description: '',
    category: 'general',
    subject: '',
    subject_bn: '',
    body: '',
    body_bn: '',
    variables: [] as string[],
  });

  const [sendForm, setSendForm] = useState({
    template_id: 0,
    recipient_type: 'students',
    channel: 'email',
    custom_subject: '',
    custom_body: '',
  });

  const getCurrentSchoolId = async (): Promise<number> => {
    const schoolId = await userProfile.getCurrentUserSchoolId();
    if (!schoolId) throw new Error('School ID not found');
    return schoolId;
  };

  const { data: templates = [], isLoading: templatesLoading, refetch: refetchTemplates } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      console.log('📧 Fetching notification templates');
      const schoolId = await getCurrentSchoolId();
      
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as NotificationTemplate[];
    },
  });

  const { data: logs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['notification-logs', statusFilter],
    queryFn: async () => {
      console.log('📊 Fetching notification logs');
      const schoolId = await getCurrentSchoolId();
      
      let query = supabase
        .from('notification_logs')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as NotificationLog[];
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (template: typeof templateForm) => {
      const schoolId = await getCurrentSchoolId();
      
      const { data, error } = await supabase
        .from('notification_templates')
        .insert({
          ...template,
          school_id: schoolId,
          is_active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Template Created',
        description: 'Notification template has been created successfully.',
      });
      refetchTemplates();
      setIsTemplateDialogOpen(false);
      resetTemplateForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, template }: { id: number; template: typeof templateForm }) => {
      const { data, error } = await supabase
        .from('notification_templates')
        .update(template)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Template Updated',
        description: 'Notification template has been updated successfully.',
      });
      refetchTemplates();
      setIsTemplateDialogOpen(false);
      setEditingTemplate(null);
      resetTemplateForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('notification_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Template Deleted',
        description: 'Notification template has been deleted successfully.',
      });
      refetchTemplates();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async (notification: typeof sendForm) => {
      const schoolId = await getCurrentSchoolId();
      
      const { data, error } = await supabase
        .from('notification_logs')
        .insert({
          template_id: notification.template_id || null,
          recipient_type: notification.recipient_type,
          channel: notification.channel,
          subject: notification.custom_subject,
          body: notification.custom_body,
          status: 'sent',
          sent_at: new Date().toISOString(),
          school_id: schoolId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Notification Sent',
        description: 'Notification has been sent successfully.',
      });
      refetchLogs();
      setIsSendDialogOpen(false);
      resetSendForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      name_bn: '',
      description: '',
      category: 'general',
      subject: '',
      subject_bn: '',
      body: '',
      body_bn: '',
      variables: [],
    });
  };

  const resetSendForm = () => {
    setSendForm({
      template_id: 0,
      recipient_type: 'students',
      channel: 'email',
      custom_subject: '',
      custom_body: '',
    });
  };

  const handleEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      name_bn: template.name_bn || '',
      description: template.description || '',
      category: template.category,
      subject: template.subject || '',
      subject_bn: template.subject_bn || '',
      body: template.body,
      body_bn: template.body_bn || '',
      variables: template.variables || [],
    });
    setIsTemplateDialogOpen(true);
  };

  const handleSendWithTemplate = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setSendForm({
      ...sendForm,
      template_id: template.id,
      custom_subject: template.subject || '',
      custom_body: template.body,
    });
    setIsSendDialogOpen(true);
  };

  const handleSubmitTemplate = () => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, template: templateForm });
    } else {
      createTemplateMutation.mutate(templateForm);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      sent: { variant: 'default', icon: <Clock className="w-3 h-3" />, label: 'Sent' },
      delivered: { variant: 'default', icon: <CheckCircle className="w-3 h-3" />, label: 'Delivered' },
      failed: { variant: 'destructive', icon: <XCircle className="w-3 h-3" />, label: 'Failed' },
      read: { variant: 'default', icon: <Eye className="w-3 h-3" />, label: 'Read' },
    };
    
    const config = variants[status] || variants.sent;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1" data-testid={`status-${status}`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (template.name_bn && template.name_bn.includes(searchQuery))
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold" data-testid="page-title">Notification System</h1>
            <p className="text-muted-foreground">Manage notification templates and send messages</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                resetTemplateForm();
                setEditingTemplate(null);
                setIsTemplateDialogOpen(true);
              }}
              data-testid="button-create-template"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
            <Button
              onClick={() => {
                resetSendForm();
                setSelectedTemplate(null);
                setIsSendDialogOpen(true);
              }}
              variant="default"
              data-testid="button-send-notification"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Notification
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-main">
          <TabsList>
            <TabsTrigger value="templates" data-testid="tab-templates">
              <Mail className="w-4 h-4 mr-2" />
              Templates ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs">
              <MessageSquare className="w-4 h-4 mr-2" />
              Notification History ({logs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Templates</CardTitle>
                <CardDescription>
                  Create and manage reusable notification templates with variables
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-templates"
                    />
                  </div>
                </div>

                {templatesLoading ? (
                  <div className="text-center py-8" data-testid="loading-templates">
                    <p className="text-muted-foreground">Loading templates...</p>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-8" data-testid="empty-templates">
                    <p className="text-muted-foreground">No templates found</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTemplates.map((template) => (
                      <Card key={template.id} data-testid={`template-card-${template.id}`}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{template.name}</CardTitle>
                              {template.name_bn && (
                                <p className="text-sm text-muted-foreground">{template.name_bn}</p>
                              )}
                            </div>
                            <Badge variant="secondary" data-testid={`category-${template.id}`}>
                              {template.category}
                            </Badge>
                          </div>
                          {template.description && (
                            <CardDescription>{template.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {template.variables && template.variables.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {template.variables.map((variable, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {`{${variable}}`}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendWithTemplate(template)}
                              data-testid={`button-send-${template.id}`}
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Send
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditTemplate(template)}
                              data-testid={`button-edit-${template.id}`}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this template?')) {
                                  deleteTemplateMutation.mutate(template.id);
                                }
                              }}
                              data-testid={`button-delete-${template.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification History</CardTitle>
                <CardDescription>
                  View all sent notifications and their delivery status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {logsLoading ? (
                  <div className="text-center py-8" data-testid="loading-logs">
                    <p className="text-muted-foreground">Loading notification history...</p>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8" data-testid="empty-logs">
                    <p className="text-muted-foreground">No notifications found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recipient</TableHead>
                          <TableHead>Channel</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Sent At</TableHead>
                          <TableHead>Delivered At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log.id} data-testid={`log-row-${log.id}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{log.recipient_type}</p>
                                <p className="text-xs text-muted-foreground">
                                  {log.recipient_email || log.recipient_phone || 'N/A'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.channel}</Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {log.subject || 'No subject'}
                            </TableCell>
                            <TableCell>{getStatusBadge(log.status)}</TableCell>
                            <TableCell className="text-sm">
                              {log.sent_at ? format(new Date(log.sent_at), 'MMM dd, yyyy HH:mm') : '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {log.delivered_at ? format(new Date(log.delivered_at), 'MMM dd, yyyy HH:mm') : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-template">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </DialogTitle>
              <DialogDescription>
                Create a reusable notification template with variables like {'{student_name}'}, {'{parent_name}'}, etc.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name (English)*</Label>
                  <Input
                    id="name"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g., Exam Reminder"
                    data-testid="input-template-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_bn">Template Name (Bengali)</Label>
                  <Input
                    id="name_bn"
                    value={templateForm.name_bn}
                    onChange={(e) => setTemplateForm({ ...templateForm, name_bn: e.target.value })}
                    placeholder="e.g., পরীক্ষার অনুস্মারক"
                    data-testid="input-template-name-bn"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="Brief description of the template"
                  data-testid="input-template-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={templateForm.category}
                  onValueChange={(value) => setTemplateForm({ ...templateForm, category: value })}
                >
                  <SelectTrigger data-testid="select-template-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="fee">Fee</SelectItem>
                    <SelectItem value="attendance">Attendance</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject (English)*</Label>
                  <Input
                    id="subject"
                    value={templateForm.subject}
                    onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                    placeholder="e.g., Exam on {exam_date}"
                    data-testid="input-template-subject"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject_bn">Subject (Bengali)</Label>
                  <Input
                    id="subject_bn"
                    value={templateForm.subject_bn}
                    onChange={(e) => setTemplateForm({ ...templateForm, subject_bn: e.target.value })}
                    placeholder="e.g., {exam_date} তারিখে পরীক্ষা"
                    data-testid="input-template-subject-bn"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Message Body (English)*</Label>
                <Textarea
                  id="body"
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  placeholder="Dear {parent_name}, Your child {student_name} has an exam on {exam_date}..."
                  rows={6}
                  data-testid="textarea-template-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body_bn">Message Body (Bengali)</Label>
                <Textarea
                  id="body_bn"
                  value={templateForm.body_bn}
                  onChange={(e) => setTemplateForm({ ...templateForm, body_bn: e.target.value })}
                  placeholder="প্রিয় {parent_name}, আপনার সন্তান {student_name} এর {exam_date} তারিখে পরীক্ষা রয়েছে..."
                  rows={6}
                  data-testid="textarea-template-body-bn"
                />
              </div>

              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm font-medium mb-2">Available Variables:</p>
                <div className="flex flex-wrap gap-2">
                  {['student_name', 'parent_name', 'class', 'section', 'exam_date', 'fee_amount', 'school_name'].map((v) => (
                    <Badge key={v} variant="outline" className="cursor-pointer" onClick={() => {
                      navigator.clipboard.writeText(`{${v}}`);
                      toast({ title: 'Copied!', description: `Variable {${v}} copied to clipboard` });
                    }}>
                      {`{${v}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsTemplateDialogOpen(false);
                  setEditingTemplate(null);
                  resetTemplateForm();
                }}
                data-testid="button-cancel-template"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitTemplate}
                disabled={!templateForm.name || !templateForm.body}
                data-testid="button-submit-template"
              >
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
          <DialogContent data-testid="dialog-send">
            <DialogHeader>
              <DialogTitle>Send Notification</DialogTitle>
              <DialogDescription>
                Send notification to students, parents, teachers, or staff
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient_type">Recipient Type*</Label>
                <Select
                  value={sendForm.recipient_type}
                  onValueChange={(value) => setSendForm({ ...sendForm, recipient_type: value })}
                >
                  <SelectTrigger data-testid="select-recipient-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="students">Students</SelectItem>
                    <SelectItem value="parents">Parents</SelectItem>
                    <SelectItem value="teachers">Teachers</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel">Channel*</Label>
                <Select
                  value={sendForm.channel}
                  onValueChange={(value) => setSendForm({ ...sendForm, channel: value })}
                >
                  <SelectTrigger data-testid="select-channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom_subject">Subject</Label>
                <Input
                  id="custom_subject"
                  value={sendForm.custom_subject}
                  onChange={(e) => setSendForm({ ...sendForm, custom_subject: e.target.value })}
                  placeholder="Notification subject"
                  data-testid="input-send-subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom_body">Message*</Label>
                <Textarea
                  id="custom_body"
                  value={sendForm.custom_body}
                  onChange={(e) => setSendForm({ ...sendForm, custom_body: e.target.value })}
                  placeholder="Your notification message..."
                  rows={6}
                  data-testid="textarea-send-body"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsSendDialogOpen(false);
                  resetSendForm();
                }}
                data-testid="button-cancel-send"
              >
                Cancel
              </Button>
              <Button
                onClick={() => sendNotificationMutation.mutate(sendForm)}
                disabled={!sendForm.custom_body || sendNotificationMutation.isPending}
                data-testid="button-submit-send"
              >
                <Send className="w-4 h-4 mr-2" />
                {sendNotificationMutation.isPending ? 'Sending...' : 'Send Notification'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
