import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Building2,
  Star,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Search,
  Edit,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';

interface Vendor {
  id: number;
  vendor_code: string;
  vendor_name: string;
  contact_person?: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  credit_limit?: number;
  rating?: number;
  is_active: boolean;
  notes?: string;
  school_id: number;
  created_at?: string;
  updated_at?: string;
}

export default function VendorsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [formData, setFormData] = useState({
    vendor_code: `VEN${Date.now().toString().slice(-6)}`,
    vendor_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Bangladesh',
    tax_id: '',
    payment_terms: '',
    credit_limit: 0,
    rating: 3,
    is_active: true,
    notes: '',
  });

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('school_id', schoolId)
        .order('vendor_name');

      if (error) throw error;
      return data as Vendor[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newVendor: any) => {
      const { data, error } = await supabase
        .from('vendors')
        .insert([{ ...newVendor, school_id: schoolId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({ title: 'সফল', description: 'ভেন্ডর যোগ করা হয়েছে' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const { data, error } = await supabase
        .from('vendors')
        .update(updates)
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({ title: 'সফল', description: 'ভেন্ডর আপডেট হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({ title: 'সফল', description: 'ভেন্ডর মুছে ফেলা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      vendor_code: `VEN${Date.now().toString().slice(-6)}`,
      vendor_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: 'Bangladesh',
      tax_id: '',
      payment_terms: '',
      credit_limit: 0,
      rating: 3,
      is_active: true,
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getRatingStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
              }`}
          />
        ))}
      </div>
    );
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = searchText === '' ||
      vendor.vendor_name.toLowerCase().includes(searchText.toLowerCase()) ||
      vendor.vendor_code.toLowerCase().includes(searchText.toLowerCase()) ||
      vendor.contact_person?.toLowerCase().includes(searchText.toLowerCase());
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'active' && vendor.is_active) ||
      (activeTab === 'inactive' && !vendor.is_active);

    return matchesSearch && matchesTab;
  });

  const stats = {
    total: vendors.length,
    active: vendors.filter(v => v.is_active).length,
    averageRating: vendors.length > 0
      ? (vendors.reduce((sum, v) => sum + (Number(v.rating) || 0), 0) / vendors.length).toFixed(1)
      : '0',
    totalCreditLimit: vendors.reduce((sum, v) => sum + (Number(v.credit_limit) || 0), 0),
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              ভেন্ডর ব্যবস্থাপনা
            </h1>
            <p className="text-muted-foreground mt-1">
              সরবরাহকারী এবং বিক্রেতা পরিচালনা করুন
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-vendor">
                <Plus className="w-4 h-4 mr-2" />
                নতুন ভেন্ডর
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>নতুন ভেন্ডর যোগ করুন</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vendor_code">ভেন্ডর কোড *</Label>
                    <Input
                      id="vendor_code"
                      data-testid="input-vendor-code"
                      value={formData.vendor_code}
                      onChange={(e) => setFormData({ ...formData, vendor_code: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="vendor_name">ভেন্ডর নাম *</Label>
                    <Input
                      id="vendor_name"
                      data-testid="input-vendor-name"
                      value={formData.vendor_name}
                      onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_person">যোগাযোগ ব্যক্তি</Label>
                    <Input
                      id="contact_person"
                      data-testid="input-contact-person"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">ফোন *</Label>
                    <Input
                      id="phone"
                      data-testid="input-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">ইমেইল</Label>
                    <Input
                      id="email"
                      data-testid="input-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax_id">ট্যাক্স আইডি</Label>
                    <Input
                      id="tax_id"
                      data-testid="input-tax-id"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">ঠিকানা</Label>
                  <Input
                    id="address"
                    data-testid="input-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">শহর</Label>
                    <Input
                      id="city"
                      data-testid="input-city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">দেশ</Label>
                    <Input
                      id="country"
                      data-testid="input-country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="payment_terms">পেমেন্ট শর্ত</Label>
                    <Input
                      id="payment_terms"
                      data-testid="input-payment-terms"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      placeholder="যেমন: Net 30 days"
                    />
                  </div>
                  <div>
                    <Label htmlFor="credit_limit">ক্রেডিট সীমা</Label>
                    <Input
                      id="credit_limit"
                      data-testid="input-credit-limit"
                      type="number"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="rating">রেটিং (0-5)</Label>
                  <Select
                    value={formData.rating.toString()}
                    onValueChange={(value) => setFormData({ ...formData, rating: parseInt(value) })}
                  >
                    <SelectTrigger data-testid="select-rating">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 ⭐</SelectItem>
                      <SelectItem value="1">1 ⭐</SelectItem>
                      <SelectItem value="2">2 ⭐</SelectItem>
                      <SelectItem value="3">3 ⭐</SelectItem>
                      <SelectItem value="4">4 ⭐</SelectItem>
                      <SelectItem value="5">5 ⭐</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">নোট</Label>
                  <Textarea
                    id="notes"
                    data-testid="input-notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    data-testid="checkbox-active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="is_active">সক্রিয়</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    বাতিল
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                    {createMutation.isPending ? 'যোগ হচ্ছে...' : 'যোগ করুন'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card data-testid="card-stat-total">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">মোট ভেন্ডর</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-vendors">{stats.total}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-active">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">সক্রিয় ভেন্ডর</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-vendors">{stats.active}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-rating">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">গড় রেটিং</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-average-rating">{stats.averageRating} ⭐</div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-credit">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">মোট ক্রেডিট সীমা</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-credit">৳{stats.totalCreditLimit.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>ভেন্ডর তালিকা</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="খুঁজুন..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-8"
                    data-testid="input-search"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList data-testid="tabs-status">
                <TabsTrigger value="all" data-testid="tab-all">সকল</TabsTrigger>
                <TabsTrigger value="active" data-testid="tab-active">সক্রিয়</TabsTrigger>
                <TabsTrigger value="inactive" data-testid="tab-inactive">নিষ্ক্রিয়</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {isLoading ? (
                  <div className="text-center py-8" data-testid="loading-state">লোড হচ্ছে...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>কোড</TableHead>
                        <TableHead>নাম</TableHead>
                        <TableHead>যোগাযোগ</TableHead>
                        <TableHead>ঠিকানা</TableHead>
                        <TableHead>পেমেন্ট শর্ত</TableHead>
                        <TableHead>ক্রেডিট সীমা</TableHead>
                        <TableHead>রেটিং</TableHead>
                        <TableHead>অবস্থা</TableHead>
                        <TableHead>কার্যক্রম</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVendors.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center" data-testid="empty-state">
                            কোন ভেন্ডর পাওয়া যায়নি
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredVendors.map((vendor) => (
                          <TableRow key={vendor.id} data-testid={`row-vendor-${vendor.id}`}>
                            <TableCell className="font-medium">{vendor.vendor_code}</TableCell>
                            <TableCell>
                              <div className="font-medium">{vendor.vendor_name}</div>
                              {vendor.contact_person && (
                                <div className="text-sm text-muted-foreground">{vendor.contact_person}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {vendor.phone && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Phone className="w-3 h-3" />
                                    {vendor.phone}
                                  </div>
                                )}
                                {vendor.email && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Mail className="w-3 h-3" />
                                    {vendor.email}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {vendor.city && vendor.country ? (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {vendor.city}, {vendor.country}
                                </div>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>{vendor.payment_terms || '-'}</TableCell>
                            <TableCell>
                              {vendor.credit_limit ? `৳${Number(vendor.credit_limit).toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell>{getRatingStars(vendor.rating)}</TableCell>
                            <TableCell>
                              {vendor.is_active ? (
                                <Badge className="bg-green-500" data-testid={`badge-active-${vendor.id}`}>সক্রিয়</Badge>
                              ) : (
                                <Badge variant="secondary" data-testid={`badge-inactive-${vendor.id}`}>নিষ্ক্রিয়</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateMutation.mutate({ id: vendor.id, updates: { is_active: !vendor.is_active } })}
                                  data-testid={`button-toggle-${vendor.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteMutation.mutate(vendor.id)}
                                  data-testid={`button-delete-${vendor.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
