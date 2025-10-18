import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
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
  UtensilsCrossed, 
  Calendar, 
  CreditCard, 
  Receipt,
  Search,
  CheckCircle,
  XCircle,
  DollarSign,
  Users
} from 'lucide-react';
import { format } from 'date-fns';

interface MealPlan {
  id: number;
  plan_name: string;
  plan_name_bn?: string;
  description?: string;
  meal_types: string[];
  monthly_fee: string;
  is_active: boolean;
}

interface MealMenu {
  id: number;
  date: string;
  day_of_week?: string;
  meal_type: string;
  menu_items: string[];
  menu_items_bn?: string[];
  special_notes?: string;
}

interface MealSubscription {
  id: number;
  student_id: number;
  plan_id?: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  monthly_fee: string;
  students?: { id: number; name: string; student_id: string };
  meal_plans?: MealPlan;
}

interface MealTransaction {
  id: number;
  student_id: number;
  subscription_id?: number;
  date: string;
  meal_type: string;
  is_consumed: boolean;
  consumed_at?: string;
  notes?: string;
  students?: { id: number; name: string; student_id: string };
}

export default function HostelMealsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [activeTab, setActiveTab] = useState('plans');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [planForm, setPlanForm] = useState({
    plan_name: '',
    plan_name_bn: '',
    description: '',
    meal_types: [] as string[],
    monthly_fee: '',
    is_active: true,
  });

  const [menuForm, setMenuForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    meal_type: 'breakfast',
    menu_items: '',
    menu_items_bn: '',
    special_notes: '',
  });

  const [subscriptionForm, setSubscriptionForm] = useState({
    student_id: '',
    plan_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    monthly_fee: '',
  });

  const [transactionForm, setTransactionForm] = useState({
    student_id: '',
    subscription_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    meal_type: 'breakfast',
    is_consumed: false,
    notes: '',
  });

  const { data: mealPlans = [] } = useQuery({
    queryKey: ['/api/meal-plans', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('school_id', schoolId)
        .order('plan_name');
      
      if (error) throw error;
      return data as MealPlan[];
    }
  });

  const { data: mealMenus = [] } = useQuery({
    queryKey: ['/api/meal-menus', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_menu')
        .select('*')
        .eq('school_id', schoolId)
        .order('date', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as MealMenu[];
    }
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['/api/meal-subscriptions', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_subscriptions')
        .select(`
          *,
          students:student_id (id, name, student_id),
          meal_plans:plan_id (id, plan_name, monthly_fee)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    }
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/meal-transactions', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_transactions')
        .select(`
          *,
          students:student_id (id, name, student_id)
        `)
        .eq('school_id', schoolId)
        .order('date', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as any[];
    }
  });

  // Migrated to direct Supabase: Students GET
  const { data: students = [] } = useQuery({
    queryKey: ['students', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, student_id, name')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const createPlanMutation = useMutation({
    mutationFn: async (plan: any) => {
      const { data, error } = await supabase
        .from('meal_plans')
        .insert([{ ...plan, school_id: schoolId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      toast({ title: 'সফল', description: 'মিল প্ল্যান যোগ হয়েছে' });
      setIsDialogOpen(false);
      resetPlanForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const createMenuMutation = useMutation({
    mutationFn: async (menu: any) => {
      const menuData = {
        ...menu,
        menu_items: menu.menu_items.split(',').map((s: string) => s.trim()).filter(Boolean),
        menu_items_bn: menu.menu_items_bn ? menu.menu_items_bn.split(',').map((s: string) => s.trim()).filter(Boolean) : null,
        day_of_week: format(new Date(menu.date), 'EEEE'),
        school_id: schoolId,
      };

      const { data, error} = await supabase
        .from('meal_menu')
        .insert([menuData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-menus'] });
      toast({ title: 'সফল', description: 'মেনু যোগ হয়েছে' });
      setIsDialogOpen(false);
      resetMenuForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (sub: any) => {
      const { data, error } = await supabase
        .from('meal_subscriptions')
        .insert([{ 
          ...sub,
          student_id: parseInt(sub.student_id),
          plan_id: sub.plan_id ? parseInt(sub.plan_id) : null,
          is_active: true,
          school_id: schoolId 
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-subscriptions'] });
      toast({ title: 'সফল', description: 'সাবস্ক্রিপশন যোগ হয়েছে' });
      setIsDialogOpen(false);
      resetSubscriptionForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (txn: any) => {
      const { data, error } = await supabase
        .from('meal_transactions')
        .insert([{ 
          ...txn,
          student_id: parseInt(txn.student_id),
          subscription_id: txn.subscription_id ? parseInt(txn.subscription_id) : null,
          consumed_at: txn.is_consumed ? new Date().toISOString() : null,
          school_id: schoolId 
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-transactions'] });
      toast({ title: 'সফল', description: 'লেনদেন রেকর্ড হয়েছে' });
      setIsDialogOpen(false);
      resetTransactionForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const resetPlanForm = () => {
    setPlanForm({
      plan_name: '',
      plan_name_bn: '',
      description: '',
      meal_types: [],
      monthly_fee: '',
      is_active: true,
    });
  };

  const resetMenuForm = () => {
    setMenuForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      meal_type: 'breakfast',
      menu_items: '',
      menu_items_bn: '',
      special_notes: '',
    });
  };

  const resetSubscriptionForm = () => {
    setSubscriptionForm({
      student_id: '',
      plan_id: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      monthly_fee: '',
    });
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      student_id: '',
      subscription_id: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      meal_type: 'breakfast',
      is_consumed: false,
      notes: '',
    });
  };

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];

  const planStats = {
    total: mealPlans.length,
    active: mealPlans.filter(p => p.is_active).length,
  };

  const menuStats = {
    total: mealMenus.length,
    thisWeek: mealMenus.filter(m => {
      const menuDate = new Date(m.date);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return menuDate >= weekAgo && menuDate <= now;
    }).length,
  };

  const subscriptionStats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.is_active).length,
    totalRevenue: subscriptions
      .filter(s => s.is_active)
      .reduce((sum, s) => sum + parseFloat(s.monthly_fee || '0'), 0),
  };

  const transactionStats = {
    total: transactions.length,
    consumed: transactions.filter(t => t.is_consumed).length,
    pending: transactions.filter(t => !t.is_consumed).length,
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              হোস্টেল খাবার ব্যবস্থাপনা
            </h1>
            <p className="text-muted-foreground mt-1">
              মিল প্ল্যান, মেনু এবং সাবস্ক্রিপশন পরিচালনা করুন
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="plans" data-testid="tab-plans">
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              মিল প্ল্যান
            </TabsTrigger>
            <TabsTrigger value="menu" data-testid="tab-menu">
              <Calendar className="w-4 h-4 mr-2" />
              দৈনিক মেনু
            </TabsTrigger>
            <TabsTrigger value="subscriptions" data-testid="tab-subscriptions">
              <CreditCard className="w-4 h-4 mr-2" />
              সাবস্ক্রিপশন
            </TabsTrigger>
            <TabsTrigger value="transactions" data-testid="tab-transactions">
              <Receipt className="w-4 h-4 mr-2" />
              লেনদেন
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">মোট প্ল্যান</CardTitle>
                  <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-plans">{planStats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">সক্রিয় প্ল্যান</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-active-plans">{planStats.active}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>মিল প্ল্যান তালিকা</CardTitle>
                  <Dialog open={isDialogOpen && activeTab === 'plans'} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-plan">
                        <Plus className="w-4 h-4 mr-2" />
                        নতুন প্ল্যান
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>নতুন মিল প্ল্যান যোগ করুন</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={(e) => { e.preventDefault(); createPlanMutation.mutate(planForm); }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>প্ল্যানের নাম (ইংরেজি) *</Label>
                            <Input
                              value={planForm.plan_name}
                              onChange={(e) => setPlanForm({ ...planForm, plan_name: e.target.value })}
                              required
                              data-testid="input-plan-name"
                            />
                          </div>
                          <div>
                            <Label>প্ল্যানের নাম (বাংলা)</Label>
                            <Input
                              value={planForm.plan_name_bn}
                              onChange={(e) => setPlanForm({ ...planForm, plan_name_bn: e.target.value })}
                              data-testid="input-plan-name-bn"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>বর্ণনা</Label>
                          <Textarea
                            value={planForm.description}
                            onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                            data-testid="input-description"
                          />
                        </div>
                        <div>
                          <Label>খাবারের ধরন *</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {mealTypes.map(type => (
                              <div key={type} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`meal-${type}`}
                                  checked={planForm.meal_types.includes(type)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setPlanForm({ ...planForm, meal_types: [...planForm.meal_types, type] });
                                    } else {
                                      setPlanForm({ ...planForm, meal_types: planForm.meal_types.filter(t => t !== type) });
                                    }
                                  }}
                                  data-testid={`checkbox-meal-${type}`}
                                />
                                <Label htmlFor={`meal-${type}`} className="capitalize">{type}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label>মাসিক ফি *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={planForm.monthly_fee}
                            onChange={(e) => setPlanForm({ ...planForm, monthly_fee: e.target.value })}
                            required
                            data-testid="input-monthly-fee"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="is-active"
                            checked={planForm.is_active}
                            onCheckedChange={(checked) => setPlanForm({ ...planForm, is_active: checked })}
                            data-testid="switch-active"
                          />
                          <Label htmlFor="is-active">সক্রিয়</Label>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>বাতিল</Button>
                          <Button type="submit" data-testid="button-submit">যোগ করুন</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>প্ল্যানের নাম</TableHead>
                      <TableHead>খাবারের ধরন</TableHead>
                      <TableHead>মাসিক ফি</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mealPlans.map(plan => (
                      <TableRow key={plan.id} data-testid={`row-plan-${plan.id}`}>
                        <TableCell className="font-medium">
                          <div>{plan.plan_name}</div>
                          {plan.plan_name_bn && <div className="text-sm text-muted-foreground">{plan.plan_name_bn}</div>}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(Array.isArray(plan.meal_types) 
                              ? plan.meal_types 
                              : typeof plan.meal_types === 'string' 
                                ? JSON.parse(plan.meal_types) 
                                : []
                            ).map((type: string) => (
                              <Badge key={type} variant="secondary" className="capitalize">{type}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>৳{parseFloat(plan.monthly_fee).toLocaleString()}</TableCell>
                        <TableCell>
                          {plan.is_active ? (
                            <Badge className="bg-green-500">সক্রিয়</Badge>
                          ) : (
                            <Badge variant="secondary">নিষ্ক্রিয়</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="menu" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">মোট মেনু</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-menus">{menuStats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">এই সপ্তাহ</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-week-menus">{menuStats.thisWeek}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>দৈনিক মেনু</CardTitle>
                  <Dialog open={isDialogOpen && activeTab === 'menu'} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-menu">
                        <Plus className="w-4 h-4 mr-2" />
                        মেনু যোগ করুন
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>নতুন মেনু যোগ করুন</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={(e) => { e.preventDefault(); createMenuMutation.mutate(menuForm); }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>তারিখ *</Label>
                            <Input
                              type="date"
                              value={menuForm.date}
                              onChange={(e) => setMenuForm({ ...menuForm, date: e.target.value })}
                              required
                              data-testid="input-menu-date"
                            />
                          </div>
                          <div>
                            <Label>খাবারের ধরন *</Label>
                            <Select
                              value={menuForm.meal_type}
                              onValueChange={(value) => setMenuForm({ ...menuForm, meal_type: value })}
                            >
                              <SelectTrigger data-testid="select-meal-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="breakfast">নাস্তা</SelectItem>
                                <SelectItem value="lunch">দুপুরের খাবার</SelectItem>
                                <SelectItem value="dinner">রাতের খাবার</SelectItem>
                                <SelectItem value="snacks">স্ন্যাকস</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>মেনু আইটেম (কমা দিয়ে আলাদা করুন) *</Label>
                          <Textarea
                            value={menuForm.menu_items}
                            onChange={(e) => setMenuForm({ ...menuForm, menu_items: e.target.value })}
                            placeholder="Rice, Chicken Curry, Salad"
                            required
                            data-testid="input-menu-items"
                          />
                        </div>
                        <div>
                          <Label>মেনু আইটেম (বাংলা)</Label>
                          <Textarea
                            value={menuForm.menu_items_bn}
                            onChange={(e) => setMenuForm({ ...menuForm, menu_items_bn: e.target.value })}
                            placeholder="ভাত, মুরগির তরকারি, সালাদ"
                            data-testid="input-menu-items-bn"
                          />
                        </div>
                        <div>
                          <Label>বিশেষ নোট</Label>
                          <Textarea
                            value={menuForm.special_notes}
                            onChange={(e) => setMenuForm({ ...menuForm, special_notes: e.target.value })}
                            data-testid="input-special-notes"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>বাতিল</Button>
                          <Button type="submit" data-testid="button-submit">যোগ করুন</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>তারিখ</TableHead>
                      <TableHead>দিন</TableHead>
                      <TableHead>খাবারের ধরন</TableHead>
                      <TableHead>মেনু আইটেম</TableHead>
                      <TableHead>বিশেষ নোট</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mealMenus.map(menu => (
                      <TableRow key={menu.id} data-testid={`row-menu-${menu.id}`}>
                        <TableCell>{format(new Date(menu.date), 'PPP')}</TableCell>
                        <TableCell>{menu.day_of_week}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{menu.meal_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {menu.menu_items.slice(0, 3).map((item, idx) => (
                              <Badge key={idx} variant="secondary">{item}</Badge>
                            ))}
                            {menu.menu_items.length > 3 && (
                              <Badge variant="secondary">+{menu.menu_items.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{menu.special_notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">মোট সাবস্ক্রিপশন</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-subscriptions">{subscriptionStats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">সক্রিয় সাবস্ক্রিপশন</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-active-subscriptions">{subscriptionStats.active}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">মোট আয়</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-revenue">৳{subscriptionStats.totalRevenue.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>সাবস্ক্রিপশন তালিকা</CardTitle>
                  <Dialog open={isDialogOpen && activeTab === 'subscriptions'} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-subscription">
                        <Plus className="w-4 h-4 mr-2" />
                        নতুন সাবস্ক্রিপশন
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>নতুন সাবস্ক্রিপশন যোগ করুন</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={(e) => { e.preventDefault(); createSubscriptionMutation.mutate(subscriptionForm); }} className="space-y-4">
                        <div>
                          <Label>শিক্ষার্থী *</Label>
                          <Select
                            value={subscriptionForm.student_id}
                            onValueChange={(value) => setSubscriptionForm({ ...subscriptionForm, student_id: value })}
                          >
                            <SelectTrigger data-testid="select-student">
                              <SelectValue placeholder="শিক্ষার্থী নির্বাচন করুন" />
                            </SelectTrigger>
                            <SelectContent>
                              {students.map((s: any) => (
                                <SelectItem key={s.id} value={s.id.toString()}>
                                  {s.name} ({s.student_id})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>মিল প্ল্যান</Label>
                          <Select
                            value={subscriptionForm.plan_id}
                            onValueChange={(value) => {
                              const plan = mealPlans.find(p => p.id.toString() === value);
                              setSubscriptionForm({ 
                                ...subscriptionForm, 
                                plan_id: value,
                                monthly_fee: plan?.monthly_fee || ''
                              });
                            }}
                          >
                            <SelectTrigger data-testid="select-plan">
                              <SelectValue placeholder="প্ল্যান নির্বাচন করুন" />
                            </SelectTrigger>
                            <SelectContent>
                              {mealPlans.filter(p => p.is_active).map(plan => (
                                <SelectItem key={plan.id} value={plan.id.toString()}>
                                  {plan.plan_name} - ৳{parseFloat(plan.monthly_fee).toLocaleString()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>শুরুর তারিখ *</Label>
                            <Input
                              type="date"
                              value={subscriptionForm.start_date}
                              onChange={(e) => setSubscriptionForm({ ...subscriptionForm, start_date: e.target.value })}
                              required
                              data-testid="input-start-date"
                            />
                          </div>
                          <div>
                            <Label>শেষ তারিখ</Label>
                            <Input
                              type="date"
                              value={subscriptionForm.end_date}
                              onChange={(e) => setSubscriptionForm({ ...subscriptionForm, end_date: e.target.value })}
                              data-testid="input-end-date"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>মাসিক ফি *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={subscriptionForm.monthly_fee}
                            onChange={(e) => setSubscriptionForm({ ...subscriptionForm, monthly_fee: e.target.value })}
                            required
                            data-testid="input-sub-fee"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>বাতিল</Button>
                          <Button type="submit" data-testid="button-submit">যোগ করুন</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>শিক্ষার্থী</TableHead>
                      <TableHead>প্ল্যান</TableHead>
                      <TableHead>শুরুর তারিখ</TableHead>
                      <TableHead>শেষ তারিখ</TableHead>
                      <TableHead>মাসিক ফি</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map(sub => (
                      <TableRow key={sub.id} data-testid={`row-subscription-${sub.id}`}>
                        <TableCell className="font-medium">
                          <div>{sub.students?.name}</div>
                          <div className="text-xs text-muted-foreground">{sub.students?.student_id}</div>
                        </TableCell>
                        <TableCell>{sub.meal_plans?.plan_name || '-'}</TableCell>
                        <TableCell>{format(new Date(sub.start_date), 'PPP')}</TableCell>
                        <TableCell>{sub.end_date ? format(new Date(sub.end_date), 'PPP') : '-'}</TableCell>
                        <TableCell>৳{parseFloat(sub.monthly_fee).toLocaleString()}</TableCell>
                        <TableCell>
                          {sub.is_active ? (
                            <Badge className="bg-green-500">সক্রিয়</Badge>
                          ) : (
                            <Badge variant="secondary">নিষ্ক্রিয়</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">মোট লেনদেন</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-transactions">{transactionStats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">খাওয়া হয়েছে</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-consumed">{transactionStats.consumed}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">বাকি আছে</CardTitle>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600" data-testid="text-pending">{transactionStats.pending}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>লেনদেন তালিকা</CardTitle>
                  <Dialog open={isDialogOpen && activeTab === 'transactions'} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-transaction">
                        <Plus className="w-4 h-4 mr-2" />
                        লেনদেন রেকর্ড করুন
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>লেনদেন রেকর্ড করুন</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={(e) => { e.preventDefault(); createTransactionMutation.mutate(transactionForm); }} className="space-y-4">
                        <div>
                          <Label>শিক্ষার্থী *</Label>
                          <Select
                            value={transactionForm.student_id}
                            onValueChange={(value) => setTransactionForm({ ...transactionForm, student_id: value })}
                          >
                            <SelectTrigger data-testid="select-txn-student">
                              <SelectValue placeholder="শিক্ষার্থী নির্বাচন করুন" />
                            </SelectTrigger>
                            <SelectContent>
                              {students.map((s: any) => (
                                <SelectItem key={s.id} value={s.id.toString()}>
                                  {s.name} ({s.student_id})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>তারিখ *</Label>
                            <Input
                              type="date"
                              value={transactionForm.date}
                              onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                              required
                              data-testid="input-txn-date"
                            />
                          </div>
                          <div>
                            <Label>খাবারের ধরন *</Label>
                            <Select
                              value={transactionForm.meal_type}
                              onValueChange={(value) => setTransactionForm({ ...transactionForm, meal_type: value })}
                            >
                              <SelectTrigger data-testid="select-txn-meal-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="breakfast">নাস্তা</SelectItem>
                                <SelectItem value="lunch">দুপুরের খাবার</SelectItem>
                                <SelectItem value="dinner">রাতের খাবার</SelectItem>
                                <SelectItem value="snacks">স্ন্যাকস</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="is-consumed"
                            checked={transactionForm.is_consumed}
                            onCheckedChange={(checked) => setTransactionForm({ ...transactionForm, is_consumed: checked })}
                            data-testid="switch-consumed"
                          />
                          <Label htmlFor="is-consumed">খাওয়া হয়েছে</Label>
                        </div>
                        <div>
                          <Label>নোট</Label>
                          <Textarea
                            value={transactionForm.notes}
                            onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
                            data-testid="input-txn-notes"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>বাতিল</Button>
                          <Button type="submit" data-testid="button-submit">রেকর্ড করুন</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>শিক্ষার্থী</TableHead>
                      <TableHead>তারিখ</TableHead>
                      <TableHead>খাবারের ধরন</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>খাওয়ার সময়</TableHead>
                      <TableHead>নোট</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(txn => (
                      <TableRow key={txn.id} data-testid={`row-transaction-${txn.id}`}>
                        <TableCell className="font-medium">
                          <div>{txn.students?.name}</div>
                          <div className="text-xs text-muted-foreground">{txn.students?.student_id}</div>
                        </TableCell>
                        <TableCell>{format(new Date(txn.date), 'PPP')}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{txn.meal_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {txn.is_consumed ? (
                            <Badge className="bg-green-500">খাওয়া হয়েছে</Badge>
                          ) : (
                            <Badge variant="secondary">বাকি</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {txn.consumed_at ? format(new Date(txn.consumed_at), 'PPp') : '-'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{txn.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
