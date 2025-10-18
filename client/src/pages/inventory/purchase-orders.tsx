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
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Truck,
  DollarSign,
  Edit,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';

interface PurchaseOrder {
  id: number;
  po_number: string;
  vendor_id: number;
  order_date?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  items: any;
  subtotal: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount: number;
  status: string;
  approved_by?: number;
  approved_at?: string;
  notes?: string;
  school_id: number;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export default function PurchaseOrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [formData, setFormData] = useState({
    po_number: `PO${Date.now().toString().slice(-8)}`,
    vendor_id: '',
    order_date: format(new Date(), 'yyyy-MM-dd'),
    expected_delivery_date: '',
    items: '[]',
    subtotal: 0,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 0,
    status: 'draft',
    notes: '',
  });

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['/api/purchase-orders', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendor:vendors(vendor_name)
        `)
        .eq('school_id', schoolId)
        .order('order_date', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['/api/vendors-list', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, vendor_name, vendor_code')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('vendor_name');

      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newPO: any) => {
      const items = newPO.items ? JSON.parse(newPO.items) : [];

      const { data, error } = await supabase
        .from('purchase_orders')
        .insert([{
          ...newPO,
          vendor_id: parseInt(newPO.vendor_id),
          items,
          school_id: schoolId,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      toast({ title: 'সফল', description: 'ক্রয় আদেশ তৈরি হয়েছে' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const updates: any = { status };
      
      if (status === 'approved') {
        updates.approved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      toast({ title: 'সফল', description: 'অবস্থা আপডেট হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      toast({ title: 'সফল', description: 'ক্রয় আদেশ মুছে ফেলা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      po_number: `PO${Date.now().toString().slice(-8)}`,
      vendor_id: '',
      order_date: format(new Date(), 'yyyy-MM-dd'),
      expected_delivery_date: '',
      items: '[]',
      subtotal: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 0,
      status: 'draft',
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = formData.subtotal + formData.tax_amount - formData.discount_amount;
    createMutation.mutate({ ...formData, total_amount: totalAmount });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" data-testid={`badge-status-draft`}>খসড়া</Badge>;
      case 'pending':
        return <Badge className="bg-orange-500" data-testid={`badge-status-pending`}>মুলতবি</Badge>;
      case 'approved':
        return <Badge className="bg-blue-500" data-testid={`badge-status-approved`}>অনুমোদিত</Badge>;
      case 'received':
        return <Badge className="bg-green-500" data-testid={`badge-status-received`}>প্রাপ্ত</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" data-testid={`badge-status-cancelled`}>বাতিল</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = searchText === '' ||
      po.po_number.toLowerCase().includes(searchText.toLowerCase());
    const matchesTab = activeTab === 'all' || po.status === activeTab;

    return matchesSearch && matchesTab;
  });

  const stats = {
    total: purchaseOrders.length,
    pending: purchaseOrders.filter(po => po.status === 'pending').length,
    approved: purchaseOrders.filter(po => po.status === 'approved').length,
    totalAmount: purchaseOrders.reduce((sum, po) => sum + (Number(po.total_amount) || 0), 0),
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              ক্রয় আদেশ ব্যবস্থাপনা
            </h1>
            <p className="text-muted-foreground mt-1">
              সরবরাহকারীদের কাছ থেকে ক্রয় আদেশ পরিচালনা করুন
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-po">
                <Plus className="w-4 h-4 mr-2" />
                নতুন PO
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>নতুন ক্রয় আদেশ তৈরি করুন</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="po_number">PO নম্বর *</Label>
                    <Input
                      id="po_number"
                      data-testid="input-po-number"
                      value={formData.po_number}
                      onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="vendor_id">ভেন্ডর *</Label>
                    <Select
                      value={formData.vendor_id}
                      onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                    >
                      <SelectTrigger data-testid="select-vendor">
                        <SelectValue placeholder="ভেন্ডর নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id.toString()}>
                            {vendor.vendor_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="order_date">আদেশ তারিখ *</Label>
                    <Input
                      id="order_date"
                      data-testid="input-order-date"
                      type="date"
                      value={formData.order_date}
                      onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="expected_delivery_date">প্রত্যাশিত ডেলিভারি তারিখ</Label>
                    <Input
                      id="expected_delivery_date"
                      data-testid="input-delivery-date"
                      type="date"
                      value={formData.expected_delivery_date}
                      onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="subtotal">সাবটোটাল *</Label>
                    <Input
                      id="subtotal"
                      data-testid="input-subtotal"
                      type="number"
                      step="0.01"
                      value={formData.subtotal}
                      onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax_amount">ট্যাক্স</Label>
                    <Input
                      id="tax_amount"
                      data-testid="input-tax"
                      type="number"
                      step="0.01"
                      value={formData.tax_amount}
                      onChange={(e) => setFormData({ ...formData, tax_amount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="discount_amount">ছাড়</Label>
                    <Input
                      id="discount_amount"
                      data-testid="input-discount"
                      type="number"
                      step="0.01"
                      value={formData.discount_amount}
                      onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label>মোট পরিমাণ</Label>
                  <div className="text-2xl font-bold" data-testid="text-total-amount">
                    ৳{(formData.subtotal + formData.tax_amount - formData.discount_amount).toFixed(2)}
                  </div>
                </div>

                <div>
                  <Label htmlFor="items">আইটেম (JSON ফরম্যাট)</Label>
                  <Textarea
                    id="items"
                    data-testid="input-items"
                    value={formData.items}
                    onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                    rows={4}
                    placeholder='[{"name": "Item 1", "quantity": 10, "price": 100}]'
                  />
                </div>

                <div>
                  <Label htmlFor="status">অবস্থা *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">খসড়া</SelectItem>
                      <SelectItem value="pending">মুলতবি</SelectItem>
                      <SelectItem value="approved">অনুমোদিত</SelectItem>
                      <SelectItem value="received">প্রাপ্ত</SelectItem>
                      <SelectItem value="cancelled">বাতিল</SelectItem>
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
                    {createMutation.isPending ? 'তৈরি হচ্ছে...' : 'তৈরি করুন'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card data-testid="card-stat-total">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">মোট PO</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-pos">{stats.total}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-pending">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">অনুমোদনের অপেক্ষায়</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pending-pos">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-approved">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">অনুমোদিত</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-approved-pos">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-amount">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">মোট পরিমাণ</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-amount">৳{stats.totalAmount.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>ক্রয় আদেশ তালিকা</CardTitle>
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
                <TabsTrigger value="draft" data-testid="tab-draft">খসড়া</TabsTrigger>
                <TabsTrigger value="pending" data-testid="tab-pending">মুলতবি</TabsTrigger>
                <TabsTrigger value="approved" data-testid="tab-approved">অনুমোদিত</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {isLoading ? (
                  <div className="text-center py-8" data-testid="loading-state">লোড হচ্ছে...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO নম্বর</TableHead>
                        <TableHead>ভেন্ডর</TableHead>
                        <TableHead>আদেশ তারিখ</TableHead>
                        <TableHead>ডেলিভারি তারিখ</TableHead>
                        <TableHead>মোট পরিমাণ</TableHead>
                        <TableHead>অবস্থা</TableHead>
                        <TableHead>কার্যক্রম</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPOs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center" data-testid="empty-state">
                            কোন ক্রয় আদেশ পাওয়া যায়নি
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPOs.map((po) => (
                          <TableRow key={po.id} data-testid={`row-po-${po.id}`}>
                            <TableCell className="font-medium">{po.po_number}</TableCell>
                            <TableCell>{po.vendor?.vendor_name || '-'}</TableCell>
                            <TableCell>
                              {po.order_date ? format(new Date(po.order_date), 'dd MMM yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              {po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'dd MMM yyyy') : '-'}
                            </TableCell>
                            <TableCell>৳{Number(po.total_amount).toLocaleString()}</TableCell>
                            <TableCell>{getStatusBadge(po.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {po.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => updateStatusMutation.mutate({ id: po.id, status: 'approved' })}
                                    data-testid={`button-approve-${po.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteMutation.mutate(po.id)}
                                  data-testid={`button-delete-${po.id}`}
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
