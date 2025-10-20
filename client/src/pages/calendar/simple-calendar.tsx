import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { ResponsivePageLayout } from '@/components/layout/responsive-page-layout';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
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
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from '@/lib/supabase';
import type { Database } from '@/lib/supabase-types';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';

// Use proper database types and extend for UI
type CalendarEventRow = Database['public']['Tables']['calendar_events']['Row'];
interface CalendarEvent extends CalendarEventRow {
  // Computed fields for UI
  date?: Date;
  startTime?: string;
  endTime?: string;
  eventType?: string;
  isAllDay?: boolean;
}

interface NewEventData {
  title: string;
  description: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  eventType: string;
}

export default function CalendarPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useMobile();
  const { user, getUserSchoolId } = useSupabaseDirectAuth();
  const [activeTab, setActiveTab] = useState("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: new Date(),
    startTime: '',
    endTime: '',
    location: '',
    eventType: 'academic'
  });

  // Real-time events from Supabase using direct database calls
  const schoolId = getUserSchoolId();
  const { data: events = [], isLoading: eventsLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar', 'events', schoolId],
    queryFn: () => {
      if (!schoolId) {
        throw new Error('School ID is required for calendar events');
      }
      return db.getCalendarEvents(schoolId);
    },
    enabled: !!schoolId,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Create event mutation using direct Supabase calls with proper authentication
  const createEventMutation = useMutation({
    mutationFn: async (eventData: NewEventData) => {
      const currentSchoolId = getUserSchoolId();
      if (!currentSchoolId || !user) {
        throw new Error('User must be authenticated and have a valid school association');
      }

      const calendarEvent = {
        title: eventData.title,
        description: eventData.description || '',
        start_date: eventData.date.toISOString().split('T')[0], // Convert to date string
        start_time: eventData.startTime || undefined,
        end_time: eventData.endTime || undefined,
        type: eventData.eventType || 'academic',
        location: eventData.location || undefined,
        organizer: user.user_metadata?.name || user.email || 'Admin', // Use authenticated user's name
        is_active: true,
        is_public: false,
        school_id: currentSchoolId // Use authenticated user's school ID
      };
      
      return await db.createCalendarEvent(calendarEvent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'events', schoolId] });
      toast({
        title: "ইভেন্ট তৈরি হয়েছে",
        description: "নতুন ইভেন্ট সফলভাবে যোগ করা হয়েছে",
      });
      setNewEvent({
        title: '',
        description: '',
        date: new Date(),
        startTime: '',
        endTime: '',
        location: '',
        eventType: 'academic'
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "ইভেন্ট তৈরি করতে সমস্যা হয়েছে",
        variant: "destructive"
      });
    }
  });

  // Transform database data for consistent UI format
  const transformedEvents: CalendarEvent[] = events.map((event: CalendarEvent) => ({
    ...event,
    date: new Date(event.start_date),
    startTime: event.start_time || undefined,
    endTime: event.end_time || undefined,
    eventType: event.type,
    isAllDay: !event.start_time || !event.end_time
  }));
  
  // Get events for a day using transformed data
  const getEventsForDay = (day: Date | undefined) => {
    if (!day) return [];
    return transformedEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getFullYear() === day.getFullYear() &&
             eventDate.getMonth() === day.getMonth() &&
             eventDate.getDate() === day.getDate();
    });
  };
  
  // Get events for today
  const getTodayEvents = () => {
    const today = new Date();
    return getEventsForDay(today);
  };
  
  // Get upcoming events (excluding today)
  const getUpcomingEvents = () => {
    const today = new Date();
    return transformedEvents
      .filter(event => {
        const eventDate = new Date(event.date);
        return eventDate > today && 
            !(eventDate.getFullYear() === today.getFullYear() &&
              eventDate.getMonth() === today.getMonth() &&
              eventDate.getDate() === today.getDate());
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
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
  
  // Handle event creation following Cooper's goal-oriented design
  const handleCreateEvent = () => {
    if (!newEvent.title.trim()) {
      toast({
        title: "ত্রুটি",
        description: "ইভেন্টের নাম দিন",
        variant: "destructive"
      });
      return;
    }
    createEventMutation.mutate(newEvent);
  };

  // Get today's events for quick access (Krug: don't make me think)
  const todayEvents = transformedEvents.filter(event => {
    const today = new Date();
    const eventDate = new Date(event.date);
    return eventDate.toDateString() === today.toDateString();
  });

  return (
    <AppShell>
      <ResponsivePageLayout
        title="ক্যালেন্ডার ব্যবস্থাপনা"
        description="একাডেমিক ইভেন্ট, পরীক্ষা এবং গুরুত্বপূর্ণ তারিখ পরিচালনা করুন"
        primaryAction={{
          icon: "add_circle",
          label: "নতুন ইভেন্ট তৈরি",
          onClick: () => setActiveTab("add-event"),
        }}
        breadcrumbs={[
          { label: "ড্যাশবোর্ড", href: "/" },
          { label: "ক্যালেন্ডার", href: "/calendar" }
        ]}
      >
        {/* Quick stats following Walter's emotional hierarchy */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <span className="material-icons text-white text-lg">event</span>
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">আজকের ইভেন্ট</p>
                  <p className="text-2xl font-bold text-blue-700">{todayEvents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <span className="material-icons text-white text-lg">schedule</span>
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">এই মাসে</p>
                  <p className="text-2xl font-bold text-green-700">{transformedEvents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <span className="material-icons text-white text-lg">school</span>
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">পরীক্ষার সময়</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {transformedEvents.filter(e => e.eventType === 'exam').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <span className="material-icons text-white text-lg">beach_access</span>
                </div>
                <div>
                  <p className="text-sm text-orange-600 font-medium">ছুটির দিন</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {transformedEvents.filter(e => e.eventType === 'holiday').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      
        {/* Enhanced tabs following Krug's navigation principles */}
        <Tabs defaultValue="calendar" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn(
            "grid mb-6 bg-slate-100/80 p-1 rounded-xl",
            isMobile ? "grid-cols-2 gap-1" : "grid-cols-4"
          )}>
            <TabsTrigger 
              value="calendar" 
              className="flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <span className="material-icons text-sm">calendar_month</span>
              <span className={cn("font-medium", isMobile && "text-xs")}>ক্যালেন্ডার</span>
            </TabsTrigger>
            <TabsTrigger 
              value="events"
              className="flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <span className="material-icons text-sm">event_note</span>
              <span className={cn("font-medium", isMobile && "text-xs")}>ইভেন্ট লিস্ট</span>
            </TabsTrigger>
            {!isMobile && (
              <>
                <TabsTrigger 
                  value="add-event"
                  className="flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <span className="material-icons text-sm">add_circle</span>
                  <span className="font-medium">নতুন ইভেন্ট</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="holidays"
                  className="flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <span className="material-icons text-sm">beach_access</span>
                  <span className="font-medium">ছুটির তালিকা</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>
      
        <TabsContent value="calendar" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calendar Section */}
            <div className="lg:col-span-3">
              <Card className="h-fit">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-900">ক্যালেন্ডার ভিউ</CardTitle>
                      <CardDescription className="text-slate-600">
                        তারিখ নির্বাচন করে ইভেন্ট দেখুন
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setSelectedDate(new Date())}
                      >
                        আজ
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="w-full max-w-none [&_.rdp-day]:h-12 [&_.rdp-day]:w-12 [&_.rdp-cell]:text-center"
                      showOutsideDays={false}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Events Sidebar */}
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-slate-900">
                    {selectedDate ? (
                      `${selectedDate.toLocaleDateString('bn-BD')} এর ইভেন্ট`
                    ) : (
                      'আজকের ইভেন্ট'
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {eventsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : getEventsForDay(selectedDate).length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="material-icons text-slate-400 text-2xl">event_busy</span>
                      </div>
                      <p className="text-sm text-slate-600 mb-4">এই দিনে কোনো ইভেন্ট নেই</p>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => setActiveTab("add-event")}
                      >
                        <span className="material-icons mr-2 text-sm">add</span>
                        ইভেন্ট যোগ করুন
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getEventsForDay(selectedDate).map(event => (
                        <div 
                          key={event.id} 
                          className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200 cursor-pointer group"
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-3 h-3 rounded-full mt-1.5 shrink-0",
                              event.eventType === 'academic' && 'bg-blue-500',
                              event.eventType === 'exam' && 'bg-red-500',
                              event.eventType === 'holiday' && 'bg-green-500',
                              event.eventType === 'meeting' && 'bg-purple-500',
                              !['academic', 'exam', 'holiday', 'meeting'].includes(event.eventType) && 'bg-gray-500'
                            )}></div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                                {event.title}
                              </h4>
                              <div className="mt-1 space-y-1">
                                <p className="text-xs text-slate-600 flex items-center gap-1">
                                  <span className="material-icons text-xs">schedule</span>
                                  {event.isAllDay ? "সারাদিন" : `${event.startTime} - ${event.endTime}`}
                                </p>
                                {event.location && (
                                  <p className="text-xs text-slate-600 flex items-center gap-1">
                                    <span className="material-icons text-xs">place</span>
                                    {event.location}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>আজকের ইভেন্ট</CardTitle>
                <CardDescription>
                  {new Date().toLocaleDateString('bn-BD')}
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
                    <span className="material-icons text-gray-400 text-4xl mb-2">event_busy</span>
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
                            {event.date.toLocaleDateString('bn-BD')}
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
                    {transformedEvents
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((event) => (
                      <TableRow key={event.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-medium text-slate-900">{event.title}</TableCell>
                        <TableCell className="text-slate-700">{new Date(event.date).toLocaleDateString('bn-BD')}</TableCell>
                        <TableCell className="text-slate-700">
                          {event.isAllDay ? "সারাদিন" : `${event.startTime} - ${event.endTime}`}
                        </TableCell>
                        <TableCell className="text-slate-700">{event.location || "-"}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                            event.eventType === 'academic' && 'bg-blue-100 text-blue-800 border border-blue-200',
                            event.eventType === 'exam' && 'bg-red-100 text-red-800 border border-red-200',
                            event.eventType === 'holiday' && 'bg-green-100 text-green-800 border border-green-200',
                            event.eventType === 'meeting' && 'bg-purple-100 text-purple-800 border border-purple-200',
                            !['academic', 'exam', 'holiday', 'meeting'].includes(event.eventType) && 'bg-gray-100 text-gray-800 border border-gray-200'
                          )}>
                            {getEventTypeLabel(event.eventType)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              aria-label="ইভেন্ট সম্পাদনা"
                            >
                              <span className="material-icons text-sm">edit</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600 transition-colors"
                              aria-label="ইভেন্ট দেখুন"
                            >
                              <span className="material-icons text-sm">visibility</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
                              aria-label="ইভেন্ট মুছুন"
                            >
                              <span className="material-icons text-sm">delete</span>
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
        
        <TabsContent value="add-event" className="mt-0">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-bold text-slate-900">নতুন ইভেন্ট তৈরি করুন</CardTitle>
                <CardDescription className="text-slate-600">
                  ক্যালেন্ডারে নতুন ইভেন্ট যোগ করুন এবং সবাইকে জানান
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Basic Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                    মূল তথ্য
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="event-title" className="text-sm font-semibold text-slate-800">
                        ইভেন্টের নাম <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="event-title" 
                        placeholder="ইভেন্টের নাম লিখুন" 
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                        className="h-12"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="event-type-select" className="text-sm font-semibold text-slate-800">
                        ইভেন্টের ধরন <span className="text-red-500">*</span>
                      </Label>
                      <Select 
                        value={newEvent.eventType} 
                        onValueChange={(value) => setNewEvent({...newEvent, eventType: value})}
                      >
                        <SelectTrigger id="event-type-select" className="h-12">
                          <SelectValue placeholder="ইভেন্টের ধরন নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="academic">📚 একাডেমিক</SelectItem>
                          <SelectItem value="exam">📝 পরীক্ষা</SelectItem>
                          <SelectItem value="holiday">🎉 ছুটি</SelectItem>
                          <SelectItem value="meeting">👥 সভা</SelectItem>
                          <SelectItem value="sports">⚽ ক্রীড়া</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="event-description" className="text-sm font-semibold text-slate-800">
                      বিস্তারিত বিবরণ
                    </Label>
                    <Textarea 
                      id="event-description" 
                      placeholder="ইভেন্টের বিস্তারিত বিবরণ লিখুন"
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </div>

                {/* Date and Time */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                    তারিখ ও সময়
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-800">
                        তারিখ <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        type="date" 
                        value={newEvent.date ? new Date(newEvent.date).toISOString().split('T')[0] : ''}
                        onChange={(e) => setNewEvent({...newEvent, date: new Date(e.target.value)})}
                        className="h-12"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="start-time" className="text-sm font-semibold text-slate-800">
                        শুরুর সময়
                      </Label>
                      <Input 
                        id="start-time" 
                        type="time" 
                        value={newEvent.startTime}
                        onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
                        className="h-12"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="end-time" className="text-sm font-semibold text-slate-800">
                        শেষের সময়
                      </Label>
                      <Input 
                        id="end-time" 
                        type="time" 
                        value={newEvent.endTime}
                        onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
                        className="h-12"
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                    স্থান ও অতিরিক্ত তথ্য
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="event-location" className="text-sm font-semibold text-slate-800">
                      ইভেন্টের স্থান
                    </Label>
                    <Input 
                      id="event-location" 
                      placeholder="যেমন: অডিটোরিয়াম, ক্লাসরুম-১০১, খেলার মাঠ"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                      className="h-12"
                    />
                  </div>
                </div>
                
                {/* Event Options */}
                <div className="bg-slate-50 rounded-lg p-6">
                  <Label className="text-sm font-semibold text-slate-800 mb-4 block">
                    ইভেন্ট সেটিংস
                  </Label>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" id="all-day" className="w-4 h-4" />
                      <Label htmlFor="all-day" className="text-sm font-medium text-slate-700">
                        সারাদিনের ইভেন্ট
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" id="recurring" className="w-4 h-4" />
                      <Label htmlFor="recurring" className="text-sm font-medium text-slate-700">
                        পুনরাবৃত্তিমূলক ইভেন্ট
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" id="notify" defaultChecked className="w-4 h-4" />
                      <Label htmlFor="notify" className="text-sm font-medium text-slate-700">
                        সবাইকে নোটিফিকেশন পাঠান
                      </Label>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-slate-200">
                  <Button 
                    variant="outline" 
                    className="h-12 px-6"
                    onClick={() => setActiveTab("calendar")}
                  >
                    <span className="material-icons mr-2 text-sm">cancel</span>
                    বাতিল করুন
                  </Button>
                  
                  <Button 
                    className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    onClick={() => createEventMutation.mutate(newEvent)}
                    disabled={createEventMutation.isPending || !newEvent.title.trim()}
                  >
                    {createEventMutation.isPending ? (
                      <>
                        <span className="material-icons animate-spin mr-2 text-sm">refresh</span>
                        তৈরি করা হচ্ছে...
                      </>
                    ) : (
                      <>
                        <span className="material-icons mr-2 text-sm">save</span>
                        ইভেন্ট তৈরি করুন
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
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
                  <p className="text-sm text-gray-500">মোট ছুটির দিন: ২৫ দিন</p>
                </div>
                <Button className="flex items-center gap-2">
                  <span className="material-icons text-sm">add</span>
                  নতুন ছুটি
                </Button>
              </div>
              
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ছুটির নাম</TableHead>
                      <TableHead>তারিখ</TableHead>
                      <TableHead>দিনের সংখ্যা</TableHead>
                      <TableHead>ধরন</TableHead>
                      <TableHead className="text-right">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">বাংলা নববর্ষ</TableCell>
                      <TableCell>১৪ এপ্রিল, ২০২৫</TableCell>
                      <TableCell>১ দিন</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          রাষ্ট্রীয় ছুটি
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <span className="material-icons">edit</span>
                          </Button>
                          <Button variant="ghost" size="icon">
                            <span className="material-icons">delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">স্বাধীনতা দিবস</TableCell>
                      <TableCell>২৬ মার্চ, ২০২৫</TableCell>
                      <TableCell>১ দিন</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          রাষ্ট্রীয় ছুটি
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <span className="material-icons">edit</span>
                          </Button>
                          <Button variant="ghost" size="icon">
                            <span className="material-icons">delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">ঈদ-উল-ফিতর</TableCell>
                      <TableCell>১২ এপ্রিল, ২০২৫</TableCell>
                      <TableCell>৩ দিন</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          ধর্মীয় ছুটি
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <span className="material-icons">edit</span>
                          </Button>
                          <Button variant="ghost" size="icon">
                            <span className="material-icons">delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </ResponsivePageLayout>
    </AppShell>
  );
}