import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Home, Bed, Users } from 'lucide-react';
import { Hostel, HostelRoom } from '@/lib/new-features-types';

export default function HostelManagementPage() {
  const { toast } = useToast();
  const [isAddHostelOpen, setIsAddHostelOpen] = useState(false);
  const [formData, setFormData] = useState({
    hostel_name: '',
    hostel_name_bn: '',
    hostel_type: 'boys',
    total_rooms: 0,
    total_capacity: 0,
    address: '',
    facilities: '',
  });

  // Fetch hostels
  const { data: hostels, isLoading } = useQuery({
    queryKey: ['/api/hostels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hostels')
        .select('*, hostel_rooms(count)')
        .eq('school_id', 1);
      
      if (error) throw error;
      return data as any[];
    }
  });

  // Create hostel mutation
  const createMutation = useMutation({
    mutationFn: async (newHostel: any) => {
      const { data, error } = await supabase
        .from('hostels')
        .insert([{ ...newHostel, school_id: 1 }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hostels'] });
      toast({ title: 'Success', description: 'Hostel created successfully' });
      setIsAddHostelOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      hostel_name: '',
      hostel_name_bn: '',
      hostel_type: 'boys',
      total_rooms: 0,
      total_capacity: 0,
      address: '',
      facilities: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Hostel Management</h1>
          <p className="text-gray-600 mt-1">Manage hostels, rooms, and student assignments</p>
        </div>
        <Dialog open={isAddHostelOpen} onOpenChange={setIsAddHostelOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-hostel">
              <Plus className="w-4 h-4 mr-2" />
              Add Hostel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Hostel</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="hostel_name">Hostel Name *</Label>
                <Input
                  id="hostel_name"
                  data-testid="input-hostel-name"
                  value={formData.hostel_name}
                  onChange={(e) => setFormData({ ...formData, hostel_name: e.target.value })}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hostel_type">Hostel Type</Label>
                  <select
                    id="hostel_type"
                    data-testid="select-hostel-type"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    value={formData.hostel_type}
                    onChange={(e) => setFormData({ ...formData, hostel_type: e.target.value })}
                  >
                    <option value="boys">Boys</option>
                    <option value="girls">Girls</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="total_rooms">Total Rooms</Label>
                  <Input
                    id="total_rooms"
                    data-testid="input-total-rooms"
                    type="number"
                    min="0"
                    value={formData.total_rooms}
                    onChange={(e) => setFormData({ ...formData, total_rooms: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="total_capacity">Total Capacity</Label>
                <Input
                  id="total_capacity"
                  data-testid="input-capacity"
                  type="number"
                  min="0"
                  value={formData.total_capacity}
                  onChange={(e) => setFormData({ ...formData, total_capacity: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  data-testid="input-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="facilities">Facilities</Label>
                <Textarea
                  id="facilities"
                  data-testid="input-facilities"
                  value={formData.facilities}
                  onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddHostelOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit" disabled={createMutation.isPending}>
                  Create Hostel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {hostels?.map((hostel) => (
          <Card key={hostel.id} data-testid={`card-hostel-${hostel.id}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5 text-blue-600" />
                <span data-testid={`text-hostel-name-${hostel.id}`}>{hostel.hostel_name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium capitalize">{hostel.hostel_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Rooms:</span>
                  <span className="font-medium">{hostel.total_rooms}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Capacity:</span>
                  <span className="font-medium">{hostel.total_capacity} students</span>
                </div>
                {hostel.address && (
                  <p className="text-sm text-gray-600 mt-2">{hostel.address}</p>
                )}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Bed className="w-4 h-4 mr-1" />
                    Rooms
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Users className="w-4 h-4 mr-1" />
                    Students
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {hostels?.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Home className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No hostels found</p>
            <p className="text-sm">Click "Add Hostel" to create your first hostel</p>
          </div>
        )}
      </div>
    </div>
  );
}
