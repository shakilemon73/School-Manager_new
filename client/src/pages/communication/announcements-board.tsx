import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Megaphone, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Calendar,
  Eye,
  EyeOff,
  Tag,
  Users,
  Paperclip,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';

interface Announcement {
  id: number;
  category_id: number | null;
  title: string;
  title_bn: string | null;
  content: string;
  content_bn: string | null;
  priority: string;
  target_audience: string;
  target_classes: string[] | null;
  publish_date: string;
  expiry_date: string | null;
  is_published: boolean;
  view_count: number;
  attachments: any[] | null;
  school_id: number;
  created_at: string;
  category?: AnnouncementCategory;
}

interface AnnouncementCategory {
  id: number;
  name: string;
  name_bn: string | null;
  description: string | null;
  icon: string | null;
  color: string;
  is_active: boolean;
  school_id: number;
  created_at: string;
}

export default function AnnouncementsBoardPage() {
  const { toast } = useToast();
  const schoolId = useRequireSchoolId();
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'admin' | 'public'>('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editingCategory, setEditingCategory] = useState<AnnouncementCategory | null>(null);

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    title_bn: '',
    content: '',
    content_bn: '',
    category_id: '',
    priority: 'medium',
    target_audience: 'all',
    target_classes: [] as string[],
    publish_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    is_published: false,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    name_bn: '',
    description: '',
    icon: 'megaphone',
    color: '#3b82f6',
  });

  const { data: announcements = [], isLoading: announcementsLoading, refetch: refetchAnnouncements } = useQuery({
    queryKey: ['announcements', activeTab, schoolId],
    queryFn: async () => {
      console.log('📢 Fetching announcements');
      
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('school_id', schoolId);
      
      if (activeTab === 'published') {
        query = query.eq('is_published', true);
      } else if (activeTab === 'draft') {
        query = query.eq('is_published', false);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Announcement[];
    },
  });

  const { data: categories = [], isLoading: categoriesLoading, refetch: refetchCategories } = useQuery({
    queryKey: ['announcement-categories', schoolId],
    queryFn: async () => {
      console.log('🏷️ Fetching announcement categories');
      
      const { data, error } = await supabase
        .from('announcement_categories')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as AnnouncementCategory[];
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (announcement: typeof announcementForm) => {
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          ...announcement,
          category_id: announcement.category_id ? parseInt(announcement.category_id) : null,
          school_id: schoolId,
          view_count: 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Announcement Created',
        description: 'The announcement has been created successfully.',
      });
      refetchAnnouncements();
      setIsAnnouncementDialogOpen(false);
      resetAnnouncementForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: async ({ id, announcement }: { id: number; announcement: typeof announcementForm }) => {
      const { data, error } = await supabase
        .from('announcements')
        .update({
          ...announcement,
          category_id: announcement.category_id ? parseInt(announcement.category_id) : null,
        })
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Announcement Updated',
        description: 'The announcement has been updated successfully.',
      });
      refetchAnnouncements();
      setIsAnnouncementDialogOpen(false);
      setEditingAnnouncement(null);
      resetAnnouncementForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Announcement Deleted',
        description: 'The announcement has been deleted successfully.',
      });
      refetchAnnouncements();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: number; isPublished: boolean }) => {
      const { error } = await supabase
        .from('announcements')
        .update({ is_published: !isPublished })
        .eq('id', id)
        .eq('school_id', schoolId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Status Updated',
        description: 'Announcement publish status has been updated.',
      });
      refetchAnnouncements();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const incrementViewCountMutation = useMutation({
    mutationFn: async (id: number) => {
      const announcement = announcements.find(a => a.id === id);
      if (!announcement) return;
      
      const { error } = await supabase
        .from('announcements')
        .update({ view_count: announcement.view_count + 1 })
        .eq('id', id)
        .eq('school_id', schoolId);
      
      if (error) throw error;
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (category: typeof categoryForm) => {
      const { data, error } = await supabase
        .from('announcement_categories')
        .insert({
          ...category,
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
        title: 'Category Created',
        description: 'The category has been created successfully.',
      });
      refetchCategories();
      setIsCategoryDialogOpen(false);
      resetCategoryForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetAnnouncementForm = () => {
    setAnnouncementForm({
      title: '',
      title_bn: '',
      content: '',
      content_bn: '',
      category_id: '',
      priority: 'medium',
      target_audience: 'all',
      target_classes: [],
      publish_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      is_published: false,
    });
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      name_bn: '',
      description: '',
      icon: 'megaphone',
      color: '#3b82f6',
    });
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      title_bn: announcement.title_bn || '',
      content: announcement.content,
      content_bn: announcement.content_bn || '',
      category_id: announcement.category_id?.toString() || '',
      priority: announcement.priority,
      target_audience: announcement.target_audience,
      target_classes: announcement.target_classes || [],
      publish_date: announcement.publish_date.split('T')[0],
      expiry_date: announcement.expiry_date ? announcement.expiry_date.split('T')[0] : '',
      is_published: announcement.is_published,
    });
    setIsAnnouncementDialogOpen(true);
  };

  const handleSubmitAnnouncement = () => {
    if (editingAnnouncement) {
      updateAnnouncementMutation.mutate({ id: editingAnnouncement.id, announcement: announcementForm });
    } else {
      createAnnouncementMutation.mutate(announcementForm);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string; className: string }> = {
      low: { variant: 'secondary', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Low', className: 'bg-gray-100 text-gray-800' },
      medium: { variant: 'default', icon: <AlertCircle className="w-3 h-3" />, label: 'Medium', className: 'bg-blue-100 text-blue-800' },
      high: { variant: 'default', icon: <AlertCircle className="w-3 h-3" />, label: 'High', className: 'bg-orange-100 text-orange-800' },
      urgent: { variant: 'destructive', icon: <AlertCircle className="w-3 h-3" />, label: 'Urgent', className: 'bg-red-100 text-red-800' },
    };
    
    const config = variants[priority] || variants.medium;
    
    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className}`} data-testid={`priority-${priority}`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = !searchQuery || 
      announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (announcement.title_bn && announcement.title_bn.includes(searchQuery)) ||
      announcement.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = priorityFilter === 'all' || announcement.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || announcement.category_id?.toString() === categoryFilter;
    
    if (viewMode === 'public') {
      return matchesSearch && matchesPriority && matchesCategory && announcement.is_published;
    }
    
    return matchesSearch && matchesPriority && matchesCategory;
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="page-title">
              <Megaphone className="w-8 h-8" />
              Announcements Board
            </h1>
            <p className="text-muted-foreground">Manage and view school announcements</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'admin' ? 'default' : 'outline'}
              onClick={() => setViewMode('admin')}
              data-testid="button-admin-view"
            >
              Admin View
            </Button>
            <Button
              variant={viewMode === 'public' ? 'default' : 'outline'}
              onClick={() => setViewMode('public')}
              data-testid="button-public-view"
            >
              Public View
            </Button>
            {viewMode === 'admin' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsCategoryDialogOpen(true)}
                  data-testid="button-manage-categories"
                >
                  <Tag className="w-4 h-4 mr-2" />
                  Categories
                </Button>
                <Button
                  onClick={() => {
                    resetAnnouncementForm();
                    setEditingAnnouncement(null);
                    setIsAnnouncementDialogOpen(true);
                  }}
                  data-testid="button-create-announcement"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Announcement
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-announcements"
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-priority-filter">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {viewMode === 'admin' && (
          <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-announcements">
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all">
                All ({announcements.length})
              </TabsTrigger>
              <TabsTrigger value="published" data-testid="tab-published">
                Published ({announcements.filter(a => a.is_published).length})
              </TabsTrigger>
              <TabsTrigger value="draft" data-testid="tab-draft">
                Draft ({announcements.filter(a => !a.is_published).length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {announcementsLoading ? (
          <div className="text-center py-12" data-testid="loading-announcements">
            <p className="text-muted-foreground">Loading announcements...</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <Card data-testid="empty-announcements">
            <CardContent className="text-center py-12">
              <Megaphone className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No announcements found</p>
              {viewMode === 'admin' && (
                <Button
                  variant="link"
                  onClick={() => setIsAnnouncementDialogOpen(true)}
                  className="mt-2"
                >
                  Create your first announcement
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAnnouncements.map((announcement) => (
              <Card 
                key={announcement.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  incrementViewCountMutation.mutate(announcement.id);
                }}
                data-testid={`announcement-card-${announcement.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    {getPriorityBadge(announcement.priority)}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      {announcement.view_count}
                    </div>
                  </div>
                  <CardTitle className="text-xl">{announcement.title}</CardTitle>
                  {announcement.title_bn && (
                    <p className="text-sm text-muted-foreground">{announcement.title_bn}</p>
                  )}
                  <CardDescription className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {announcement.target_audience}
                    </Badge>
                    {announcement.is_published ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4 line-clamp-3">{announcement.content}</p>
                  
                  {announcement.attachments && announcement.attachments.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      <Paperclip className="w-3 h-3" />
                      {announcement.attachments.length} attachment(s)
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(announcement.publish_date), 'MMM dd, yyyy')}
                    </div>
                    {announcement.expiry_date && (
                      <div className="flex items-center gap-1 text-orange-600">
                        Expires: {format(new Date(announcement.expiry_date), 'MMM dd, yyyy')}
                      </div>
                    )}
                  </div>

                  {viewMode === 'admin' && (
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePublishMutation.mutate({ 
                            id: announcement.id, 
                            isPublished: announcement.is_published 
                          });
                        }}
                        data-testid={`button-toggle-publish-${announcement.id}`}
                      >
                        {announcement.is_published ? (
                          <>
                            <EyeOff className="w-3 h-3 mr-1" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            Publish
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAnnouncement(announcement);
                        }}
                        data-testid={`button-edit-${announcement.id}`}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this announcement?')) {
                            deleteAnnouncementMutation.mutate(announcement.id);
                          }
                        }}
                        data-testid={`button-delete-${announcement.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-announcement">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
              </DialogTitle>
              <DialogDescription>
                Share important information with students, parents, and staff
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title (English)*</Label>
                  <Input
                    id="title"
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                    placeholder="e.g., School Holiday Notice"
                    data-testid="input-announcement-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title_bn">Title (Bengali)</Label>
                  <Input
                    id="title_bn"
                    value={announcementForm.title_bn}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, title_bn: e.target.value })}
                    placeholder="e.g., স্কুল ছুটির বিজ্ঞপ্তি"
                    data-testid="input-announcement-title-bn"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content (English)*</Label>
                <Textarea
                  id="content"
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  placeholder="Announcement content in English..."
                  rows={6}
                  data-testid="textarea-announcement-content"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content_bn">Content (Bengali)</Label>
                <Textarea
                  id="content_bn"
                  value={announcementForm.content_bn}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content_bn: e.target.value })}
                  placeholder="Announcement content in Bengali..."
                  rows={6}
                  data-testid="textarea-announcement-content-bn"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category_id">Category</Label>
                  <Select
                    value={announcementForm.category_id}
                    onValueChange={(value) => setAnnouncementForm({ ...announcementForm, category_id: value })}
                  >
                    <SelectTrigger data-testid="select-announcement-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority*</Label>
                  <Select
                    value={announcementForm.priority}
                    onValueChange={(value) => setAnnouncementForm({ ...announcementForm, priority: value })}
                  >
                    <SelectTrigger data-testid="select-announcement-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_audience">Target Audience*</Label>
                  <Select
                    value={announcementForm.target_audience}
                    onValueChange={(value) => setAnnouncementForm({ ...announcementForm, target_audience: value })}
                  >
                    <SelectTrigger data-testid="select-target-audience">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="students">Students</SelectItem>
                      <SelectItem value="parents">Parents</SelectItem>
                      <SelectItem value="teachers">Teachers</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="publish_date">Publish Date*</Label>
                  <Input
                    id="publish_date"
                    type="date"
                    value={announcementForm.publish_date}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, publish_date: e.target.value })}
                    data-testid="input-publish-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry_date">Expiry Date (Optional)</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={announcementForm.expiry_date}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, expiry_date: e.target.value })}
                    data-testid="input-expiry-date"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={announcementForm.is_published}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, is_published: e.target.checked })}
                  className="rounded"
                  data-testid="checkbox-is-published"
                />
                <Label htmlFor="is_published" className="cursor-pointer">
                  Publish immediately
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAnnouncementDialogOpen(false);
                  setEditingAnnouncement(null);
                  resetAnnouncementForm();
                }}
                data-testid="button-cancel-announcement"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAnnouncement}
                disabled={!announcementForm.title || !announcementForm.content}
                data-testid="button-submit-announcement"
              >
                {editingAnnouncement ? 'Update Announcement' : 'Create Announcement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent data-testid="dialog-category">
            <DialogHeader>
              <DialogTitle>Manage Categories</DialogTitle>
              <DialogDescription>
                Create and manage announcement categories
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cat_name">Category Name (English)*</Label>
                <Input
                  id="cat_name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g., Academic"
                  data-testid="input-category-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat_name_bn">Category Name (Bengali)</Label>
                <Input
                  id="cat_name_bn"
                  value={categoryForm.name_bn}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name_bn: e.target.value })}
                  placeholder="e.g., শিক্ষা"
                  data-testid="input-category-name-bn"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat_color">Color</Label>
                <Input
                  id="cat_color"
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  data-testid="input-category-color"
                />
              </div>
              <Button
                onClick={() => createCategoryMutation.mutate(categoryForm)}
                disabled={!categoryForm.name || createCategoryMutation.isPending}
                className="w-full"
                data-testid="button-create-category"
              >
                {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
              </Button>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Existing Categories</h4>
                {categoriesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading categories...</p>
                ) : categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No categories yet</p>
                ) : (
                  <div className="space-y-2">
                    {categories.map(cat => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-2 rounded border"
                        data-testid={`category-item-${cat.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span>{cat.name}</span>
                          {cat.name_bn && (
                            <span className="text-sm text-muted-foreground">({cat.name_bn})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
