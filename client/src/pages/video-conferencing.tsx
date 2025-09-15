import { useState, useEffect } from "react";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsivePageLayout } from "@/components/layout/responsive-page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Users, 
  Calendar, 
  Clock,
  Plus,
  Settings,
  Monitor,
  BookOpen,
  UserCheck,
  Camera,
  Volume2,
  VolumeX
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Meeting {
  id: number;
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'ongoing' | 'ended';
  participants: number;
  maxParticipants: number;
  meetingId: string;
  isRecording: boolean;
  type: 'class' | 'meeting' | 'exam';
}

interface VideoStats {
  totalMeetings: number;
  activeMeetings: number;
  totalParticipants: number;
  totalDuration: number;
}

export default function VideoConferencing() {
  const { user } = useSupabaseDirectAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Fetch meetings data
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['/api/meetings'],
    queryFn: () => apiRequest('/api/meetings')
  });

  // Calculate video stats from real data
  const videoStats: VideoStats = {
    totalMeetings: Array.isArray(meetings) ? meetings.length : 0,
    activeMeetings: Array.isArray(meetings) ? meetings.filter((m: any) => m.status === 'ongoing').length : 0,
    totalParticipants: Array.isArray(meetings) ? meetings.reduce((sum: number, m: any) => sum + (m.participants || 0), 0) : 0,
    totalDuration: Array.isArray(meetings) ? meetings.reduce((sum: number, m: any) => sum + (m.duration || 0), 0) : 0
  };

  const currentMeeting: Meeting | null = Array.isArray(meetings) 
    ? meetings.find((m: any) => m.status === 'ongoing') || null
    : null;

  // Create new meeting mutation
  const createMeetingMutation = useMutation({
    mutationFn: async (meetingData: any) => {
      return apiRequest('/api/meetings', {
        method: 'POST',
        body: JSON.stringify(meetingData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      toast({
        title: "মিটিং তৈরি হয়েছে",
        description: "নতুন ভিডিও মিটিং সফলভাবে তৈরি করা হয়েছে",
      });
    },
  });

  return (
    <AppShell>
      <ResponsivePageLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                ভিডিও কনফারেন্সিং
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                অনলাইন ক্লাস এবং মিটিং পরিচালনা করুন
              </p>
            </div>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              নতুন মিটিং
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Video className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-400">মোট মিটিং</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{videoStats.totalMeetings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400">সক্রিয় মিটিং</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{videoStats.activeMeetings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                    <UserCheck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-600 dark:text-purple-400">অংশগ্রহণকারী</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{videoStats.totalParticipants}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-600 dark:text-orange-400">মোট সময়</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{Math.floor(videoStats.totalDuration / 60)}ঘ</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dashboard">ড্যাশবোর্ড</TabsTrigger>
              <TabsTrigger value="live">লাইভ মিটিং</TabsTrigger>
              <TabsTrigger value="schedule">সময়সূচী</TabsTrigger>
              <TabsTrigger value="recordings">রেকর্ডিং</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              {/* Active Meeting */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-blue-500" />
                    চলমান মিটিং
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-900 rounded-lg aspect-video flex items-center justify-center relative">
                    {currentMeeting ? (
                      <div className="text-white text-center">
                        <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-semibold">{currentMeeting.titleBn}</p>
                        <p className="text-gray-300">{currentMeeting.participants} জন অংশগ্রহণকারী</p>
                      </div>
                    ) : (
                      <div className="text-white text-center">
                        <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-semibold">কোনো সক্রিয় মিটিং নেই</p>
                        <p className="text-gray-300">নতুন মিটিং শুরু করুন</p>
                      </div>
                    )}
                    
                    {/* Recording indicator */}
                    {currentMeeting?.isRecording && (
                      <Badge className="absolute top-4 left-4 bg-red-500 text-white">
                        <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                        রেকর্ডিং
                      </Badge>
                    )}

                    {/* Meeting controls */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                      <Button 
                        size="sm" 
                        variant={isVideoOn ? "default" : "secondary"}
                        onClick={() => setIsVideoOn(!isVideoOn)}
                      >
                        {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                      </Button>
                      <Button 
                        size="sm" 
                        variant={isAudioOn ? "default" : "secondary"}
                        onClick={() => setIsAudioOn(!isAudioOn)}
                      >
                        {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                      </Button>
                      <Button 
                        size="sm" 
                        variant={isScreenSharing ? "default" : "secondary"}
                        onClick={() => setIsScreenSharing(!isScreenSharing)}
                      >
                        <Monitor className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive">
                        <PhoneOff className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Meetings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-500" />
                    আসন্ন মিটিং
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((meeting) => (
                      <div key={meeting} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">পদার্থবিজ্ঞান ক্লাস</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">নবম শ্রেণী • ২:০০ PM - ৩:০০ PM</p>
                          </div>
                        </div>
                        <Button size="sm">যোগ দিন</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="live" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>লাইভ মিটিং শুরু করুন</CardTitle>
                  <CardDescription>
                    তাৎক্ষণিক ভিডিও মিটিং শুরু করুন বা নির্ধারিত মিটিংয়ে যোগ দিন
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Label htmlFor="meeting-title">মিটিং শিরোনাম</Label>
                      <Input id="meeting-title" placeholder="মিটিংয়ের নাম লিখুন" />
                      
                      <Label htmlFor="meeting-type">মিটিংয়ের ধরন</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="ধরন নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="class">ক্লাস</SelectItem>
                          <SelectItem value="meeting">মিটিং</SelectItem>
                          <SelectItem value="exam">পরীক্ষা</SelectItem>
                        </SelectContent>
                      </Select>

                      <Label htmlFor="description">বিবরণ</Label>
                      <Textarea id="description" placeholder="মিটিংয়ের বিবরণ লিখুন" />
                    </div>
                    
                    <div className="space-y-4">
                      <Label htmlFor="max-participants">সর্বোচ্চ অংশগ্রহণকারী</Label>
                      <Input id="max-participants" type="number" placeholder="৫০" />
                      
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="recording" />
                        <Label htmlFor="recording">রেকর্ডিং সক্ষম করুন</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="waiting-room" />
                        <Label htmlFor="waiting-room">ওয়েটিং রুম সক্ষম করুন</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
                      <Video className="h-4 w-4 mr-2" />
                      মিটিং শুরু করুন
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Calendar className="h-4 w-4 mr-2" />
                      পরে সময়সূচী করুন
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>নির্ধারিত মিটিং</CardTitle>
                  <CardDescription>
                    আপনার সমস্ত নির্ধারিত মিটিং দেখুন এবং পরিচালনা করুন
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((meeting) => (
                      <div key={meeting} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                            <Video className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">ইংরেজি ক্লাস</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">আগামীকাল, ১০:০০ AM - ১১:০০ AM</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="secondary">অষ্টম শ্রেণী</Badge>
                              <Badge variant="outline">২৫ জন অংশগ্রহণকারী</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button size="sm">যোগ দিন</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recordings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>রেকর্ডিং</CardTitle>
                  <CardDescription>
                    আপনার সমস্ত মিটিং রেকর্ডিং দেখুন এবং পরিচালনা করুন
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((recording) => (
                      <div key={recording} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                            <Video className="h-6 w-6 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">গণিত ক্লাস রেকর্ডিং</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">২ ঘন্টা ১৫ মিনিট • ৩ দিন আগে</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="secondary">দশম শ্রেণী</Badge>
                              <Badge variant="outline">HD 720p</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            ডাউনলোড
                          </Button>
                          <Button size="sm">দেখুন</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ResponsivePageLayout>
    </AppShell>
  );
}