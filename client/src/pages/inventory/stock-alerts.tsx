import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, AlertTriangle, Package, TrendingDown, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRequireSchoolId } from "@/hooks/use-require-school-id";

interface StockAlert {
  id: number;
  school_id: number;
  item_id: number;
  item_name: string;
  alert_type: string;
  threshold_quantity: number;
  current_quantity: number;
  reorder_quantity: number;
  alert_status: string;
  created_at: string;
  updated_at: string;
}

interface InventoryItem {
  id: number;
  item_name: string;
  quantity: number;
  category: string;
}

export default function StockAlerts() {
  const { toast } = useToast();
  const schoolId = useRequireSchoolId();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<StockAlert | null>(null);
  const [formData, setFormData] = useState({
    item_id: "",
    alert_type: "low_stock",
    threshold_quantity: "",
    reorder_quantity: "",
    alert_status: "active"
  });

  // Fetch stock alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['stock-alerts', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_alerts')
        .select(`
          *,
          inventory_items:item_id (
            item_name,
            quantity,
            category
          )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data?.map(alert => ({
        ...alert,
        item_name: alert.inventory_items?.item_name || 'Unknown Item',
        current_quantity: alert.inventory_items?.quantity || 0
      }));
    }
  });

  // Fetch inventory items for dropdown
  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory-items', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, item_name, quantity, category')
        .eq('school_id', schoolId)
        .order('item_name');
      
      if (error) throw error;
      return data as InventoryItem[];
    }
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (alertData: any) => {
      if (editingAlert) {
        const { error } = await supabase
          .from('stock_alerts')
          .update(alertData)
          .eq('id', editingAlert.id)
          .eq('school_id', schoolId);
        if (error) throw error;
      } else {
        const { error} = await supabase
          .from('stock_alerts')
          .insert({ ...alertData, school_id: schoolId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      toast({
        title: "Success",
        description: `Stock alert ${editingAlert ? 'updated' : 'created'} successfully`
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('stock_alerts')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      toast({
        title: "Success",
        description: "Stock alert deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      item_id: parseInt(formData.item_id),
      alert_type: formData.alert_type,
      threshold_quantity: parseInt(formData.threshold_quantity),
      reorder_quantity: parseInt(formData.reorder_quantity),
      alert_status: formData.alert_status
    });
  };

  const handleEdit = (alert: StockAlert) => {
    setEditingAlert(alert);
    setFormData({
      item_id: alert.item_id.toString(),
      alert_type: alert.alert_type,
      threshold_quantity: alert.threshold_quantity.toString(),
      reorder_quantity: alert.reorder_quantity.toString(),
      alert_status: alert.alert_status
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAlert(null);
    setFormData({
      item_id: "",
      alert_type: "low_stock",
      threshold_quantity: "",
      reorder_quantity: "",
      alert_status: "active"
    });
  };

  const getAlertBadgeColor = (status: string, current: number, threshold: number) => {
    if (status === 'resolved') return 'default';
    if (current <= threshold / 2) return 'destructive';
    if (current <= threshold) return 'secondary';
    return 'default';
  };

  const activeAlerts = alerts?.filter(a => a.alert_status === 'active' && a.current_quantity <= a.threshold_quantity) || [];
  const criticalAlerts = activeAlerts.filter(a => a.current_quantity <= a.threshold_quantity / 2);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stock Alerts</h1>
            <p className="text-gray-500 mt-1">Monitor and manage inventory alerts</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-alert">
                <Plus className="w-4 h-4 mr-2" />
                Add Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingAlert ? 'Edit' : 'Create'} Stock Alert</DialogTitle>
                <DialogDescription>
                  Set up automatic alerts for inventory items
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="item_id">Inventory Item *</Label>
                  <Select
                    value={formData.item_id}
                    onValueChange={(value) => setFormData({ ...formData, item_id: value })}
                    required
                  >
                    <SelectTrigger data-testid="select-item">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems?.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.item_name} (Qty: {item.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="alert_type">Alert Type *</Label>
                  <Select
                    value={formData.alert_type}
                    onValueChange={(value) => setFormData({ ...formData, alert_type: value })}
                    required
                  >
                    <SelectTrigger data-testid="select-alert-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low_stock">Low Stock</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                      <SelectItem value="reorder_point">Reorder Point</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="threshold_quantity">Threshold Qty *</Label>
                    <Input
                      id="threshold_quantity"
                      type="number"
                      value={formData.threshold_quantity}
                      onChange={(e) => setFormData({ ...formData, threshold_quantity: e.target.value })}
                      placeholder="e.g., 10"
                      required
                      data-testid="input-threshold"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reorder_quantity">Reorder Qty *</Label>
                    <Input
                      id="reorder_quantity"
                      type="number"
                      value={formData.reorder_quantity}
                      onChange={(e) => setFormData({ ...formData, reorder_quantity: e.target.value })}
                      placeholder="e.g., 50"
                      required
                      data-testid="input-reorder"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="alert_status">Status *</Label>
                  <Select
                    value={formData.alert_status}
                    onValueChange={(value) => setFormData({ ...formData, alert_status: value })}
                    required
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending} data-testid="button-submit">
                    {saveMutation.isPending ? "Saving..." : editingAlert ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Alert Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <Bell className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeAlerts.length}</div>
              <p className="text-xs text-muted-foreground">Items below threshold</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{criticalAlerts.length}</div>
              <p className="text-xs text-muted-foreground">Critically low stock</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
              <Package className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alerts?.length || 0}</div>
              <p className="text-xs text-muted-foreground">All configured alerts</p>
            </CardContent>
          </Card>
        </div>

        {/* Critical Alerts Banner */}
        {criticalAlerts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {criticalAlerts.length} item{criticalAlerts.length > 1 ? 's are' : ' is'} critically low on stock. Immediate action required!
            </AlertDescription>
          </Alert>
        )}

        {/* Alerts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Alert Management</CardTitle>
            <CardDescription>Monitor and configure stock alerts for inventory items</CardDescription>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="text-center py-8">Loading alerts...</div>
            ) : alerts?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No stock alerts configured</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-sm">Item</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
                      <th className="text-center py-3 px-4 font-semibold text-sm">Current Qty</th>
                      <th className="text-center py-3 px-4 font-semibold text-sm">Threshold</th>
                      <th className="text-center py-3 px-4 font-semibold text-sm">Reorder Qty</th>
                      <th className="text-center py-3 px-4 font-semibold text-sm">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts?.map((alert) => (
                      <tr key={alert.id} className="border-b hover:bg-gray-50" data-testid={`row-alert-${alert.id}`}>
                        <td className="py-3 px-4">
                          <div className="font-medium">{alert.item_name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">
                            {alert.alert_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={alert.current_quantity <= alert.threshold_quantity ? 'text-red-600 font-semibold' : ''}>
                            {alert.current_quantity}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">{alert.threshold_quantity}</td>
                        <td className="py-3 px-4 text-center">{alert.reorder_quantity}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={getAlertBadgeColor(alert.alert_status, alert.current_quantity, alert.threshold_quantity)}>
                            {alert.alert_status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(alert)}
                              data-testid={`button-edit-${alert.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(alert.id)}
                              data-testid={`button-delete-${alert.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
