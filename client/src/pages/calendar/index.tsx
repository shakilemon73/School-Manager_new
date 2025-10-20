import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { Edit, Trash2, Eye, Plus, Save, X, Calendar as CalendarIcon, Clock } from 'lucide-react';

// Define schema for event
const eventSchema = z.object({
  title: z.string().min(2, { message: "ইভেন্টের শিরোনাম আবশ্যক" }),
  description: z.string().optional(),
  date: z.date({ required_error: "তারিখ আবশ্যক" }),
  startTime: z.string().min(1, { message: "শুরুর সময় আবশ্যক" }),
  endTime: z.string().min(1, { message: "শেষের সময় আবশ্যক" }),
  location: z.string().optional(),
  eventType: z.enum(["academic", "exam", "holiday", "meeting", "other"]),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  notifyParticipants: z.boolean().default(true),
  participantGroups: z.array(z.string()).optional(),
});

export default function CalendarPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [activeTab, setActiveTab] = useState("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  
  // Event form
  const eventForm = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      date: new Date(),
      startTime: "09:00",
      endTime: "10:00",
      location: "",
      eventType: "academic",
      isRecurring: false,
      recurrencePattern: undefined,
      notifyParticipants: true,
      participantGroups: [],
    }
  });
  
  // Fetch real events from Supabase directly with RLS
  const { data: rawEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['calendar-events', schoolId],
    queryFn: async () => {
      console.log('📅 Fetching calendar events with direct Supabase calls');
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('school_id', schoolId)
        .order('start_date', { ascending: false });
      
      if (error) {
        console.error('Calendar events fetch error:', error);
        throw error;
      }
      
      console.log('Calendar events fetched:', data?.length || 0);
      return data || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Transform events data for consistent format
  const events = rawEvents.map(event => {
    console.log('Raw event data:', event);
    const transformedEvent = {
      ...event,
      date: new Date(event.startDate || event.start_date),
      startTime: event.startTime || event.start_time,
      endTime: event.endTime || event.end_time,
      eventType: event.type || 'academic',
      isAllDay: !event.startTime && !event.endTime,
      location: event.location || '',
      title: event.titleBn || event.title,
      description: event.descriptionBn || event.description,
    };
    console.log('Transformed event:', transformedEvent);
    return transformedEvent;
  });

  // Create event mutation using direct Supabase
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      console.log('Creating event with data:', eventData);
      
      const { data, error} = await supabase
        .from('calendar_events')
        .insert({
          title: eventData.title,
          title_bn: eventData.title,
          description: eventData.description,
          description_bn: eventData.description,
          start_date: eventData.date.toISOString().split('T')[0],
          end_date: eventData.date.toISOString().split('T')[0],
          start_time: eventData.startTime,
          end_time: eventData.endTime,
          type: eventData.eventType,
          location: eventData.location,
          organizer: 'Admin',
          is_public: true,
          is_active: true,
          school_id: schoolId
        })
        .select()
        .single();
      
      if (error) {
        console.error('Calendar event creation error:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({
        title: "ইভেন্ট তৈরি হয়েছে",
        description: "নতুন ইভেন্ট সফলভাবে যোগ করা হয়েছে",
      });
      eventForm.reset();
      setIsAddingEvent(false);
      setActiveTab("calendar");
    },
    onError: (error: any) => {
      console.error('Calendar event creation failed:', error);
      toast({
        title: "ত্রুটি",
        description: "ইভেন্ট তৈরি করতে সমস্যা হয়েছে",
        variant: "destructive"
      });
    }
  });

  // Update event mutation using direct Supabase
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, eventData }: { id: number, eventData: any }) => {
      console.log('Updating event with ID:', id, 'and data:', eventData);
      
      const { data, error } = await supabase
        .from('calendar_events')
        .update({
          title: eventData.title,
          title_bn: eventData.title,
          description: eventData.description,
          description_bn: eventData.description,
          start_date: eventData.date.toISOString().split('T')[0],
          end_date: eventData.date.toISOString().split('T')[0],
          start_time: eventData.startTime,
          end_time: eventData.endTime,
          type: eventData.eventType,
          location: eventData.location,
        })
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) {
        console.error('Calendar event update error:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({
        title: "ইভেন্ট আপডেট হয়েছে",
        description: "ইভেন্ট সফলভাবে আপডেট করা হয়েছে",
      });
      setEditingEvent(null);
      eventForm.reset();
      setActiveTab("calendar");
    },
    onError: (error: any) => {
      console.error('Calendar event update failed:', error);
      toast({
        title: "ত্রুটি",
        description: "ইভেন্ট আপডেট করতে সমস্যা হয়েছে",
        variant: "destructive"
      });
    }
  });

  // Delete event mutation using direct Supabase
  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log('Deleting event with ID:', id);
      
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);
      
      if (error) {
        console.error('Calendar event deletion error:', error);
        throw error;
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({
        title: "ইভেন্ট মুছে ফেলা হয়েছে",
        description: "ইভেন্ট সফলভাবে মুছে ফেলা হয়েছে",
      });
    },
    onError: (error: any) => {
      console.error('Calendar event deletion failed:', error);
      toast({
        title: "ত্রুটি",
        description: "ইভেন্ট মুছতে সমস্যা হয়েছে",
        variant: "destructive"
      });
    }
  });
  
  // Get events for a day
  const getEventsForDay = (day: Date | undefined) => {
    if (!day) return [];
    return events.filter(event => 
      event.date.getFullYear() === day.getFullYear() &&
      event.date.getMonth() === day.getMonth() &&
      event.date.getDate() === day.getDate()
    );
  };
  
  // Get events for today
  const getTodayEvents = () => {
    const today = new Date();
    return getEventsForDay(today);
  };
  
  // Get upcoming events (excluding today)
  const getUpcomingEvents = () => {
    const today = new Date();
    return events
      .filter(event => {
        // Event is in the future but not today
        return event.date > today && 
            !(event.date.getFullYear() === today.getFullYear() &&
              event.date.getMonth() === today.getMonth() &&
              event.date.getDate() === today.getDate());
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5); // Show only nearest 5 events
  };
  
  // Get days with events for highlighting in calendar
  const getDaysWithEvents = () => {
    return events.map(event => new Date(event.date));
  };
  
  // Handle form submission for event
  const onEventSubmit = (data: z.infer<typeof eventSchema>) => {
    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, eventData: data });
    } else {
      createEventMutation.mutate(data);
    }
  };

  // Handle edit event
  const handleEditEvent = (event: any) => {
    console.log('=== EDIT EVENT HANDLER CALLED ===');
    console.log('Event data received:', event);
    
    try {
      setEditingEvent(event);
      
      // Ensure date is properly formatted
      const eventDate = event.date ? new Date(event.date) : new Date(event.startDate);
      
      console.log('Setting form data with:', {
        title: event.title,
        description: event.description || '',
        date: eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location || '',
        eventType: event.eventType || event.type,
      });
      
      eventForm.reset({
        title: event.title,
        description: event.description || '',
        date: eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location || '',
        eventType: event.eventType || event.type,
        isRecurring: false,
        notifyParticipants: true,
        participantGroups: [],
      });
      
      console.log('Switching to add-event tab');
      setActiveTab("add-event");
      
      console.log('Edit event handler completed successfully');
    } catch (error) {
      console.error('Error in handleEditEvent:', error);
    }
  };

  // Handle delete event
  const handleDeleteEvent = (eventId: number) => {
    console.log('=== DELETE EVENT HANDLER CALLED ===');
    console.log('Event ID to delete:', eventId);
    
    try {
      if (window.confirm("আপনি কি নিশ্চিত যে এই ইভেন্টটি মুছে ফেলতে চান?")) {
        console.log('User confirmed deletion, calling mutation');
        deleteEventMutation.mutate(eventId);
      } else {
        console.log('User cancelled deletion');
      }
    } catch (error) {
      console.error('Error in handleDeleteEvent:', error);
    }
  };
  
  // Get event type color
  const getEventTypeColor = (type: string) => {
    switch(type) {
      case 'academic': return 'bg-blue-500';
      case 'exam': return 'bg-red-500';
      case 'holiday': return 'bg-green-500';
      case 'meeting': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };
  
  // Get event type label
  const getEventTypeLabel = (type: string) => {
    switch(type) {
      case 'academic': return 'একাডেমিক';
      case 'exam': return 'পরীক্ষা';
      case 'holiday': return 'ছুটি';
      case 'meeting': return 'সভা';
      default: return 'অন্যান্য';
    }
  };
  
  // Format date in Bengali
  const formatDateBengali = (date: Date) => {
    try {
      // Using native toLocaleDateString instead of date-fns with locale
      return date.toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      // Fallback to standard date format
      return date.toLocaleDateString();
    }
  };
  
  return (
    <AppShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            ক্যালেন্ডার
          </h1>
          <p className="text-gray-600 mt-1">
            বিদ্যালয়ের ইভেন্ট, পরীক্ষা এবং ছুটির দিন ম্যানেজ করুন
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <span className="material-icons text-gray-500 text-sm">event</span>
            আজকের ইভেন্ট
          </Button>
          
          <Button 
            className="flex items-center gap-2"
            onClick={() => {
              setIsAddingEvent(true);
              setActiveTab("add-event");
            }}
          >
            <span className="material-icons text-sm">add_circle</span>
            নতুন ইভেন্ট
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="calendar" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="calendar">
            <span className="material-icons mr-2 text-sm">calendar_month</span>
            <span>ক্যালেন্ডার</span>
          </TabsTrigger>
          <TabsTrigger value="events">
            <span className="material-icons mr-2 text-sm">event_note</span>
            <span>ইভেন্ট তালিকা</span>
          </TabsTrigger>
          <TabsTrigger value="add-event">
            <span className="material-icons mr-2 text-sm">add_circle</span>
            <span>নতুন ইভেন্ট</span>
          </TabsTrigger>
          <TabsTrigger value="holidays">
            <span className="material-icons mr-2 text-sm">beach_access</span>
            <span>ছুটির তালিকা</span>
          </TabsTrigger>
        </TabsList>
      
        <TabsContent value="calendar" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>মাসিক ক্যালেন্ডার</CardTitle>
                <CardDescription>
                  {selectedDate && formatDateBengali(selectedDate)} এর ইভেন্ট দেখুন
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border w-full"
                  modifiers={{
                    event: getDaysWithEvents(),
                  }}
                  modifiersStyles={{
                    event: {
                      fontWeight: 'bold',
                      color: 'var(--primary)',
                      borderRadius: '50%'
                    }
                  }}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>ইভেন্টস</CardTitle>
                {selectedDate && (
                  <CardDescription>
                    {formatDateBengali(selectedDate)} তারিখের ইভেন্ট
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {getEventsForDay(selectedDate).length === 0 ? (
                  <div className="text-center py-6">
                    <span className="material-icons text-gray-400 text-4xl mb-2">event_busy</span>
                    <p className="text-gray-500">এই দিনে কোনো ইভেন্ট নেই</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        eventForm.setValue('date', selectedDate || new Date());
                        setIsAddingEvent(true);
                        setActiveTab("add-event");
                      }}
                    >
                      <span className="material-icons mr-2 text-sm">add</span>
                      ইভেন্ট যোগ করুন
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getEventsForDay(selectedDate).map(event => (
                      <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.eventType)}`}></div>
                          <p className="font-medium">{event.title}</p>
                        </div>
                        <div className="ml-5 mt-1 text-sm">
                          <p className="text-gray-500">
                            <span className="material-icons text-xs align-middle mr-1">schedule</span>
                            {event.isAllDay ? "সারাদিন" : `${event.startTime} - ${event.endTime}`}
                          </p>
                          {event.location && (
                            <p className="text-gray-500">
                              <span className="material-icons text-xs align-middle mr-1">place</span>
                              {event.location}
                            </p>
                          )}
                          {event.description && (
                            <p className="text-gray-600 mt-2">{event.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>আজকের ইভেন্ট</CardTitle>
                <CardDescription>
                  {formatDateBengali(new Date())}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {getTodayEvents().length === 0 ? (
                  <div className="text-center py-6">
                    <span className="material-icons text-gray-400 text-4xl mb-2">event_busy</span>
                    <p className="text-gray-500">আজ কোনো ইভেন্ট নেই</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getTodayEvents().map(event => (
                      <div key={event.id} className="flex items-start gap-3 border-b pb-3 last:border-0">
                        <div className={`w-2 h-2 rounded-full mt-2 ${getEventTypeColor(event.eventType)}`}></div>
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-gray-500">
                            {event.isAllDay ? "সারাদিন" : `${event.startTime} - ${event.endTime}`}
                            {event.location && ` | ${event.location}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>আসন্ন ইভেন্টস</CardTitle>
                <CardDescription>
                  আপকামিং ইভেন্টের তালিকা
                </CardDescription>
              </CardHeader>
              <CardContent>
                {getUpcomingEvents().length === 0 ? (
                  <div className="text-center py-6">
                    <Calendar className="text-gray-400 h-12 w-12 mb-2 mx-auto" />
                    <p className="text-gray-500">কোনো আসন্ন ইভেন্ট নেই</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getUpcomingEvents().map(event => (
                      <div key={event.id} className="flex items-start gap-3 border-b pb-3 last:border-0">
                        <div className={`w-2 h-2 rounded-full mt-2 ${getEventTypeColor(event.eventType)}`}></div>
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-gray-500">
                            {formatDateBengali(event.date)}
                            {' | '}
                            {event.isAllDay ? "সারাদিন" : `${event.startTime} - ${event.endTime}`}
                          </p>
                          {event.location && (
                            <p className="text-sm text-gray-500">{event.location}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="events" className="mt-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>সকল ইভেন্ট</CardTitle>
              <CardDescription>
                সমস্ত ইভেন্টের তালিকা দেখুন ও ম্যানেজ করুন
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <Label htmlFor="event-month">মাস</Label>
                  <Select defaultValue={new Date().getMonth().toString()}>
                    <SelectTrigger id="event-month">
                      <SelectValue placeholder="মাস নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">জানুয়ারি</SelectItem>
                      <SelectItem value="1">ফেব্রুয়ারি</SelectItem>
                      <SelectItem value="2">মার্চ</SelectItem>
                      <SelectItem value="3">এপ্রিল</SelectItem>
                      <SelectItem value="4">মে</SelectItem>
                      <SelectItem value="5">জুন</SelectItem>
                      <SelectItem value="6">জুলাই</SelectItem>
                      <SelectItem value="7">আগস্ট</SelectItem>
                      <SelectItem value="8">সেপ্টেম্বর</SelectItem>
                      <SelectItem value="9">অক্টোবর</SelectItem>
                      <SelectItem value="10">নভেম্বর</SelectItem>
                      <SelectItem value="11">ডিসেম্বর</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="event-type">ইভেন্ট ধরন</Label>
                  <Select defaultValue="all">
                    <SelectTrigger id="event-type">
                      <SelectValue placeholder="ইভেন্ট ধরন নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল ইভেন্ট</SelectItem>
                      <SelectItem value="academic">একাডেমিক</SelectItem>
                      <SelectItem value="exam">পরীক্ষা</SelectItem>
                      <SelectItem value="holiday">ছুটি</SelectItem>
                      <SelectItem value="meeting">সভা</SelectItem>
                      <SelectItem value="other">অন্যান্য</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="search-event">সার্চ</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                      <span className="material-icons text-sm">search</span>
                    </span>
                    <Input 
                      id="search-event" 
                      placeholder="ইভেন্ট খুঁজুন" 
                      className="pl-10" 
                    />
                  </div>
                </div>
              </div>
              
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ইভেন্ট</TableHead>
                      <TableHead>তারিখ</TableHead>
                      <TableHead>সময়</TableHead>
                      <TableHead>স্থান</TableHead>
                      <TableHead>ধরন</TableHead>
                      <TableHead className="text-right">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events
                      .sort((a, b) => a.date.getTime() - b.date.getTime())
                      .map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell>{formatDateBengali(event.date)}</TableCell>
                        <TableCell>
                          {event.isAllDay ? "সারাদিন" : `${event.startTime} - ${event.endTime}`}
                        </TableCell>
                        <TableCell>{event.location || "-"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            event.eventType === 'academic' ? 'bg-blue-100 text-blue-800' :
                            event.eventType === 'exam' ? 'bg-red-100 text-red-800' :
                            event.eventType === 'holiday' ? 'bg-green-100 text-green-800' :
                            event.eventType === 'meeting' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getEventTypeLabel(event.eventType)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Edit button clicked for event:', event);
                                handleEditEvent(event);
                              }}
                              title="সম্পাদনা করুন"
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Delete button clicked for event ID:', event.id);
                                handleDeleteEvent(event.id);
                              }}
                              title="মুছে ফেলুন"
                              disabled={deleteEventMutation.isPending}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="add-event" className="mt-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{editingEvent ? "ইভেন্ট সম্পাদনা করুন" : "নতুন ইভেন্ট যোগ করুন"}</CardTitle>
              <CardDescription>
                {editingEvent ? "বিদ্যমান ইভেন্ট সম্পাদনা করুন" : "ক্যালেন্ডারে নতুন ইভেন্ট যোগ করুন"}
              </CardDescription>
              {editingEvent && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setEditingEvent(null);
                    eventForm.reset();
                    setActiveTab("calendar");
                  }}
                  className="mt-2"
                >
                  বাতিল করুন
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Form {...eventForm}>
                <form onSubmit={eventForm.handleSubmit(onEventSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={eventForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ইভেন্টের শিরোনাম</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="ইভেন্টের শিরোনাম লিখুন" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={eventForm.control}
                      name="eventType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ইভেন্টের ধরন</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="ইভেন্টের ধরন নির্বাচন করুন" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="academic">একাডেমিক</SelectItem>
                              <SelectItem value="exam">পরীক্ষা</SelectItem>
                              <SelectItem value="holiday">ছুটি</SelectItem>
                              <SelectItem value="meeting">সভা</SelectItem>
                              <SelectItem value="other">অন্যান্য</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={eventForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ইভেন্টের বিবরণ</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={3} 
                            {...field} 
                            placeholder="ইভেন্টের বিবরণ লিখুন"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={eventForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>তারিখ</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${
                                    !field.value && "text-muted-foreground"
                                  }`}
                                >
                                  {field.value ? (
                                    formatDateBengali(field.value)
                                  ) : (
                                    <span>তারিখ নির্বাচন করুন</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={eventForm.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>শুরুর সময়</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={eventForm.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>শেষের সময়</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={eventForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ইভেন্টের স্থান</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ইভেন্টের স্থান লিখুন" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={eventForm.control}
                      name="isRecurring"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel className="text-base">রিকারিং ইভেন্ট</FormLabel>
                            <FormDescription>
                              এটি একটি পুনরাবৃত্তিমূলক ইভেন্ট কিনা
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {eventForm.watch("isRecurring") && (
                      <FormField
                        control={eventForm.control}
                        name="recurrencePattern"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>পুনরাবৃত্তির ধরন</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="পুনরাবৃত্তির ধরন নির্বাচন করুন" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="daily">দৈনিক</SelectItem>
                                <SelectItem value="weekly">সাপ্তাহিক</SelectItem>
                                <SelectItem value="monthly">মাসিক</SelectItem>
                                <SelectItem value="yearly">বার্ষিক</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                  
                  <FormField
                    control={eventForm.control}
                    name="notifyParticipants"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel className="text-base">অংশগ্রহণকারীদের নোটিফিকেশন পাঠান</FormLabel>
                          <FormDescription>
                            ইভেন্ট সম্পর্কে অংশগ্রহণকারীদের এসএমএস/ইমেইল পাঠান
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {eventForm.watch("notifyParticipants") && (
                    <div className="space-y-4 border rounded-lg p-4">
                      <h3 className="text-md font-medium">অংশগ্রহণকারী গ্রুপ</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="notify-teachers" />
                          <label
                            htmlFor="notify-teachers"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            শিক্ষকগণ
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="notify-students" />
                          <label
                            htmlFor="notify-students"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            শিক্ষার্থীগণ
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="notify-parents" />
                          <label
                            htmlFor="notify-parents"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            অভিভাবকগণ
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="notify-staff" />
                          <label
                            htmlFor="notify-staff"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            স্টাফ
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-3">
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2"
                      type="button"
                      onClick={() => {
                        eventForm.reset();
                        setIsAddingEvent(false);
                        setActiveTab("calendar");
                      }}
                    >
                      <X className="h-4 w-4 text-gray-500" />
                      বাতিল
                    </Button>
                    
                    <Button 
                      className="flex items-center gap-2"
                      type="submit"
                      disabled={createEventMutation.isPending || updateEventMutation.isPending}
                    >
                      {(createEventMutation.isPending || updateEventMutation.isPending) ? (
                        <>
                          <Clock className="h-4 w-4 animate-spin" />
                          প্রসেসিং...
                        </>
                      ) : editingEvent ? (
                        <>
                          <Save className="h-4 w-4" />
                          ইভেন্ট আপডেট করুন
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          ইভেন্ট সংরক্ষণ করুন
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="holidays" className="mt-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ছুটির তালিকা</CardTitle>
              <CardDescription>
                বিদ্যালয়ের ছুটির তালিকা দেখুন ও ম্যানেজ করুন
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-medium">২০২৫ সালের ছুটির তালিকা</h3>
                  <p className="text-sm text-gray-500">
                    মোট ছুটির দিন: {events.filter(event => event.eventType === 'holiday').length} দিন
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('=== TEST BUTTON CLICKED ===');
                      console.log('Events available:', events.length);
                      console.log('Sample event for testing:', events[0]);
                      if (events.length > 0) {
                        console.log('Calling handleEditEvent with first event');
                        handleEditEvent(events[0]);
                      }
                    }}
                  >
                    Test Edit
                  </Button>
                  <Button 
                    className="flex items-center gap-2"
                    onClick={() => {
                      setEditingEvent(null);
                      eventForm.reset({
                        eventType: 'holiday',
                        title: "",
                        description: "",
                        date: new Date(),
                        startTime: "",
                        endTime: "",
                        location: "",
                        isRecurring: false,
                        notifyParticipants: false,
                        participantGroups: [],
                      });
                      setActiveTab("add-event");
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    নতুন ছুটি
                  </Button>
                </div>
              </div>
              
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ছুটির নাম</TableHead>
                      <TableHead>তারিখ</TableHead>
                      <TableHead>বিবরণ</TableHead>
                      <TableHead>ধরন</TableHead>
                      <TableHead className="text-right">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6">
                          লোড হচ্ছে...
                        </TableCell>
                      </TableRow>
                    ) : events.filter(event => event.eventType === 'holiday').length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6">
                          কোন ছুটির দিন পাওয়া যায়নি
                        </TableCell>
                      </TableRow>
                    ) : (
                      events
                        .filter(event => event.eventType === 'holiday')
                        .map((holiday) => (
                          <TableRow key={holiday.id}>
                            <TableCell className="font-medium">{holiday.title}</TableCell>
                            <TableCell>{formatDateBengali(holiday.date)}</TableCell>
                            <TableCell>{holiday.description || "-"}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                ছুটির দিন
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Edit holiday button clicked for:', holiday);
                                    handleEditEvent(holiday);
                                  }}
                                  title="সম্পাদনা করুন"
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Delete holiday button clicked for ID:', holiday.id);
                                    handleDeleteEvent(holiday.id);
                                  }}
                                  title="মুছে ফেলুন"
                                  disabled={deleteEventMutation.isPending}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <div className="border rounded-lg mt-8 p-4">
                <h3 className="text-lg font-medium mb-4">ছুটির ক্যালেন্ডার আমদানি করুন</h3>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="holiday-file">আইসিএস/সিএসভি ফাইল আপলোড করুন</Label>
                    <Input type="file" id="holiday-file" />
                  </div>
                  <Button>আমদানি করুন</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}