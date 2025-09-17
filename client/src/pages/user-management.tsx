import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Search, 
  UserCheck, 
  UserX, 
  Mail, 
  Calendar,
  Eye,
  Trash2,
  Download,
  RefreshCw
} from 'lucide-react';
import { supabase, db } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface SupabaseUser {
  id: string;
  email: string;
  trackingId?: string;
  registrationDate?: string;
  status?: string;
  language?: string;
  createdAt: string;
  lastSignIn?: string | null;
  emailConfirmed: boolean;
  user_metadata?: any;
  created_at?: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
}

export default function UserManagement() {
  const [users, setUsers] = useState<SupabaseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'blocked'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Use direct Supabase query instead of Express API
      const users = await db.getUsers();
      setUsers(users.map(user => ({
        id: user.id,
        email: user.email,
        trackingId: user.id.slice(0, 8), // Use first 8 chars of UUID as tracking ID
        registrationDate: user.created_at,
        status: user.status || 'active',
        language: 'en', // Default language
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
        emailConfirmed: true // Assume confirmed from Supabase auth
      })));
      
      toast({
        title: "Users loaded successfully",
        description: `Found ${users?.length || 0} registered users`,
      });
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Failed to load users",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, newStatus: string) => {
    try {
      // Use direct Supabase update instead of Express API
      await db.updateUserStatus(userId, newStatus);

      toast({
        title: "User updated",
        description: `Status changed to ${newStatus}`,
      });
      
      // Refresh the user list
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ['Tracking ID', 'Email', 'Status', 'Registration Date', 'Last Login'].join(','),
      ...filteredUsers.map(user => [
        user.trackingId || 'N/A',
        user.email,
        user.status || 'active',
        new Date(user.createdAt).toLocaleDateString('en-US'),
        user.lastSignIn ? new Date(user.lastSignIn).toLocaleDateString('en-US') : 'Never'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.trackingId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && user.status === 'active') ||
      (filterStatus === 'pending' && !user.emailConfirmed) ||
      (filterStatus === 'blocked' && user.status === 'blocked');

    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (user: SupabaseUser) => {
    if (!user.emailConfirmed) {
      return <Badge variant="outline" className="text-yellow-600">Email Pending</Badge>;
    }
    
    const status = user.status || 'active';
    const variants = {
      active: 'default',
      blocked: 'destructive',
      pending: 'secondary'
    } as const;

    const labels = {
      active: 'Active',
      blocked: 'Blocked',
      pending: 'Pending'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            ব্যবহারকারী ব্যবস্থাপনা
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            সুপাবেস ব্যবহারকারী ট্র্যাকিং এবং ব্যবস্থাপনা সিস্টেম
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchUsers} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            রিফ্রেশ
          </Button>
          <Button onClick={exportUsers} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            এক্সপোর্ট
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">মোট ব্যবহারকারী</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {users.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">সক্রিয় ব্যবহারকারী</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {users.filter(u => u.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Mail className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">যাচাই বাকি</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {users.filter(u => !u.emailConfirmed).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">ব্লক ব্যবহারকারী</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {users.filter(u => u.status === 'blocked').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="ইমেইল, নাম বা ট্র্যাকিং আইডি দিয়ে খুঁজুন..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'active', 'pending', 'blocked'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                >
                  {status === 'all' && 'সব'}
                  {status === 'active' && 'সক্রিয়'}
                  {status === 'pending' && 'অপেক্ষমান'}
                  {status === 'blocked' && 'ব্লক'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>ব্যবহারকারী তালিকা ({filteredUsers.length})</CardTitle>
          <CardDescription>
            নিবন্ধিত ব্যবহারকারীদের বিস্তারিত তথ্য এবং ব্যবস্থাপনা
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-600">লোড হচ্ছে...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">কোন ব্যবহারকারী পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {user.email.split('@')[0] || 'নাম নেই'}
                      </div>
                      {getStatusBadge(user)}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </div>
                      
                      {user.trackingId && (
                        <div className="flex items-center gap-2">
                          <Eye className="h-3 w-3" />
                          {user.trackingId}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('bn-BD') : 'N/A'}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-3 w-3" />
                        {user.last_sign_in_at 
                          ? new Date(user.last_sign_in_at).toLocaleDateString('bn-BD')
                          : 'কখনো লগইন করেনি'
                        }
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {user.status !== 'blocked' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateUserStatus(user.id, 'blocked')}
                      >
                        <UserX className="h-3 w-3 mr-1" />
                        ব্লক
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateUserStatus(user.id, 'active')}
                      >
                        <UserCheck className="h-3 w-3 mr-1" />
                        আনব্লক
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Eye className="h-4 w-4" />
        <AlertDescription>
          <strong>ট্র্যাকিং তথ্য:</strong> প্রতিটি নতুন ব্যবহারকারীর জন্য একটি অনন্য ট্র্যাকিং আইডি তৈরি হয় যা আপনি কন্ট্রোল প্যানেল থেকে ব্যবস্থাপনা করতে পারেন।
        </AlertDescription>
      </Alert>
    </div>
  );
}