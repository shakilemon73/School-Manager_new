import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { userProfile } from '@/hooks/use-supabase-direct-auth';
import { Users, Key, UserCheck, UserX, Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PortalUser {
  id: number;
  name: string;
  email: string;
  user_id: string | null;
  role: 'student' | 'parent' | 'teacher';
  has_auth: boolean;
  student_id?: string;
  class?: string;
  section?: string;
}

export default function UserManagementPortals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PortalUser | null>(null);
  const [newUserData, setNewUserData] = useState({
    userId: '',
    role: 'student' as 'student' | 'parent' | 'teacher',
    password: '',
    confirmPassword: '',
  });

  // Get current school ID
  const getCurrentSchoolId = async (): Promise<number> => {
    const schoolId = await userProfile.getCurrentUserSchoolId();
    if (!schoolId) throw new Error('School ID not found');
    return schoolId;
  };

  // Fetch all portal users (students, parents, teachers)
  const { data: portalUsers = [], isLoading } = useQuery({
    queryKey: ['portal-users'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      
      const [studentsRes, parentsRes, teachersRes] = await Promise.all([
        supabase.from('students').select('id, name, email, user_id, student_id, class, section').eq('school_id', schoolId),
        supabase.from('parents').select('id, name, email, user_id').eq('school_id', schoolId),
        supabase.from('teachers').select('id, name, email, user_id').eq('school_id', schoolId),
      ]);

      const users: PortalUser[] = [];

      if (studentsRes.data) {
        studentsRes.data.forEach(s => users.push({
          ...s,
          role: 'student',
          has_auth: !!s.user_id
        }));
      }

      if (parentsRes.data) {
        parentsRes.data.forEach(p => users.push({
          ...p,
          role: 'parent',
          has_auth: !!p.user_id
        }));
      }

      if (teachersRes.data) {
        teachersRes.data.forEach(t => users.push({
          ...t,
          role: 'teacher',
          has_auth: !!t.user_id
        }));
      }

      return users;
    },
  });

  // Create Supabase Auth user and link to database record
  const createAuthUserMutation = useMutation({
    mutationFn: async ({ user, password }: { user: PortalUser; password: string }) => {
      if (!user.email) {
        throw new Error('Email is required to create auth user');
      }

      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          role: user.role,
          school_id: await getCurrentSchoolId(),
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Link the auth user to the database record
      const tableName = user.role === 'student' ? 'students' : user.role === 'parent' ? 'parents' : 'teachers';
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ user_id: authData.user.id })
        .eq('id', user.id);

      if (updateError) throw updateError;

      return authData.user;
    },
    onSuccess: (_, { user }) => {
      toast({
        title: "Success!",
        description: `Auth account created for ${user.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ['portal-users'] });
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create auth user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset user password
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Password Reset",
        description: "User password has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reset password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete auth user
  const deleteAuthUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Auth User Deleted",
        description: "User authentication has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ['portal-users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateAuthUser = (user: PortalUser) => {
    setSelectedUser(user);
    setIsCreateDialogOpen(true);
  };

  const handleSubmitAuthCreation = () => {
    if (!selectedUser) return;
    
    if (newUserData.password !== newUserData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newUserData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    createAuthUserMutation.mutate({
      user: selectedUser,
      password: newUserData.password,
    });
  };

  const usersWithoutAuth = portalUsers.filter(u => !u.has_auth);
  const usersWithAuth = portalUsers.filter(u => u.has_auth);

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Portal User Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Create and manage authentication for students, parents, and teachers
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className="h-4 w-4 mr-2 text-blue-600" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{portalUsers.length}</div>
              <p className="text-xs text-gray-500 mt-1">All portal users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <UserCheck className="h-4 w-4 mr-2 text-green-600" />
                With Auth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{usersWithAuth.length}</div>
              <p className="text-xs text-gray-500 mt-1">Can login to portals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <UserX className="h-4 w-4 mr-2 text-red-600" />
                Without Auth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{usersWithoutAuth.length}</div>
              <p className="text-xs text-gray-500 mt-1">Need auth setup</p>
            </CardContent>
          </Card>
        </div>

        {/* Users without authentication - Action Required */}
        {usersWithoutAuth.length > 0 && (
          <Alert>
            <AlertDescription>
              <strong>{usersWithoutAuth.length} users</strong> don't have authentication set up. 
              Create auth accounts for them to allow portal access.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs for filtering */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Users ({portalUsers.length})</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="parents">Parents</TabsTrigger>
            <TabsTrigger value="teachers">Teachers</TabsTrigger>
            <TabsTrigger value="no-auth">Without Auth ({usersWithoutAuth.length})</TabsTrigger>
          </TabsList>

          {['all', 'students', 'parents', 'teachers', 'no-auth'].map(tab => (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {tab === 'all' && 'All Portal Users'}
                    {tab === 'students' && 'Students'}
                    {tab === 'parents' && 'Parents'}
                    {tab === 'teachers' && 'Teachers'}
                    {tab === 'no-auth' && 'Users Without Authentication'}
                  </CardTitle>
                  <CardDescription>
                    {tab === 'no-auth' 
                      ? 'Create authentication accounts for these users'
                      : 'Manage authentication and access for portal users'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Auth Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {portalUsers
                        .filter(u => {
                          if (tab === 'all') return true;
                          if (tab === 'no-auth') return !u.has_auth;
                          return u.role === tab.slice(0, -1);
                        })
                        .map(user => (
                          <TableRow key={`${user.role}-${user.id}`}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email || <span className="text-gray-400">No email</span>}</TableCell>
                            <TableCell>
                              <Badge variant={
                                user.role === 'student' ? 'default' : 
                                user.role === 'parent' ? 'secondary' : 
                                'outline'
                              }>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {user.student_id || `#${user.id}`}
                            </TableCell>
                            <TableCell>
                              {user.has_auth ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <UserX className="h-3 w-3 mr-1" />
                                  No Auth
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                {!user.has_auth ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handleCreateAuthUser(user)}
                                    disabled={!user.email || createAuthUserMutation.isPending}
                                    data-testid={`button-create-auth-${user.id}`}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Create Auth
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const newPass = prompt('Enter new password (min 6 characters):');
                                        if (newPass && newPass.length >= 6 && user.user_id) {
                                          resetPasswordMutation.mutate({ userId: user.user_id, newPassword: newPass });
                                        }
                                      }}
                                      data-testid={`button-reset-password-${user.id}`}
                                    >
                                      <Key className="h-4 w-4 mr-1" />
                                      Reset
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        if (confirm(`Remove auth for ${user.name}?`) && user.user_id) {
                                          deleteAuthUserMutation.mutate(user.user_id);
                                        }
                                      }}
                                      data-testid={`button-delete-auth-${user.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Create Auth Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Authentication Account</DialogTitle>
              <DialogDescription>
                Create a login account for {selectedUser?.name} ({selectedUser?.email})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Role</Label>
                <Input value={selectedUser?.role || ''} disabled />
              </div>

              <div>
                <Label>Email</Label>
                <Input value={selectedUser?.email || ''} disabled />
              </div>

              <div>
                <Label>Password *</Label>
                <Input
                  type="password"
                  placeholder="Enter password (min 6 characters)"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                />
              </div>

              <div>
                <Label>Confirm Password *</Label>
                <Input
                  type="password"
                  placeholder="Confirm password"
                  value={newUserData.confirmPassword}
                  onChange={(e) => setNewUserData({ ...newUserData, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitAuthCreation}
                disabled={createAuthUserMutation.isPending}
              >
                {createAuthUserMutation.isPending ? 'Creating...' : 'Create Auth Account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
