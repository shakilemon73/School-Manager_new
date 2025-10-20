import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { useToast } from '@/hooks/use-toast';
import { AppShell } from '@/components/layout/app-shell';
import { LanguageText } from '@/components/ui/language-text';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Search,
  Paperclip,
  CheckCheck,
  Check,
  Users,
  Filter
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: number;
  title: string | null;
  participant_ids: number[];
  participant_types: string[];
  last_message_at: string | null;
  is_active: boolean;
  school_id: number;
  created_at: string;
  lastMessage?: Message;
}

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_type: string;
  sender_name: string;
  message: string;
  attachments: any[] | null;
  is_read: boolean;
  read_at: string | null;
  school_id: number;
  created_at: string;
}

export default function ParentTeacherMessagingPage() {
  const { toast } = useToast();
  const schoolId = useRequireSchoolId();
  const { language } = useLanguage();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [participantFilter, setParticipantFilter] = useState('all');
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [fileAttachment, setFileAttachment] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<number>(1);

  const [newConversationForm, setNewConversationForm] = useState({
    title: '',
    participant_type: 'teacher',
    participant_id: '',
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const { data: conversations = [], isLoading: conversationsLoading, refetch: refetchConversations } = useQuery({
    queryKey: ['conversations', schoolId],
    queryFn: async () => {
      console.log('💬 Fetching conversations');
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false });
      
      if (error) throw error;
      
      const conversationsWithLastMessage = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .eq('school_id', schoolId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          return {
            ...conv,
            lastMessage: lastMsg || undefined,
          };
        })
      );
      
      return conversationsWithLastMessage as Conversation[];
    },
    refetchInterval: 10000,
  });

  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['messages', selectedConversation?.id, schoolId],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      console.log('📨 Fetching messages for conversation:', selectedConversation.id);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConversation,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`messages:${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          console.log('🔔 Real-time message update:', payload);
          refetchMessages();
          refetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createConversationMutation = useMutation({
    mutationFn: async (form: typeof newConversationForm) => {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          title: form.title || null,
          participant_ids: [currentUserId, parseInt(form.participant_id)],
          participant_types: ['parent', form.participant_type],
          is_active: true,
          school_id: schoolId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Conversation Created',
        description: 'New conversation has been created successfully.',
      });
      refetchConversations();
      setSelectedConversation(data);
      setIsNewConversationOpen(false);
      setNewConversationForm({
        title: '',
        participant_type: 'teacher',
        participant_id: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, message }: { conversationId: number; message: string }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          sender_type: 'parent',
          sender_name: 'Current User',
          message: message,
          attachments: fileAttachment ? [{ name: fileAttachment.name, size: fileAttachment.size }] : null,
          is_read: false,
          school_id: schoolId,
        })
        .select()
        .single();
      
      if (error) throw error;

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('school_id', schoolId);
      
      return data;
    },
    onSuccess: () => {
      setMessageText('');
      setFileAttachment(null);
      refetchMessages();
      refetchConversations();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const { error } = await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('school_id', schoolId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      refetchMessages();
    },
  });

  const handleSendMessage = () => {
    if (!selectedConversation || !messageText.trim()) return;
    
    sendMessageMutation.mutate({
      conversationId: selectedConversation.id,
      message: messageText,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileAttachment(e.target.files[0]);
      toast({
        title: 'File Selected',
        description: `${e.target.files[0].name} ready to send`,
      });
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = !searchQuery || 
      conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.participant_types.some(type => type.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = participantFilter === 'all' || 
      conv.participant_types.includes(participantFilter);
    
    return matchesSearch && matchesFilter;
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getParticipantTypeBadge = (types: string[]) => {
    const uniqueTypes = [...new Set(types)];
    return uniqueTypes.map(type => (
      <Badge key={type} variant="secondary" className="text-xs">
        {type}
      </Badge>
    ));
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Modern Header with Gradient */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-8 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold flex items-center gap-3" data-testid="page-title">
                <MessageCircle className="w-10 h-10" />
                <LanguageText en="Parent-Teacher Messaging" bn="অভিভাবক-শিক্ষক বার্তা" ar="رسائل أولياء الأمور والمعلمين" />
              </h1>
              <p className="text-green-100 text-lg">
                <LanguageText 
                  en="Chat with teachers and parents" 
                  bn="শিক্ষক এবং অভিভাবকদের সাথে চ্যাট করুন" 
                  ar="الدردشة مع المعلمين وأولياء الأمور"
                />
              </p>
            </div>
            <Button
              onClick={() => setIsNewConversationOpen(true)}
              className="bg-white text-green-600 hover:bg-green-50"
              size="lg"
              data-testid="button-new-conversation"
            >
              <Plus className="w-5 h-5 mr-2" />
              <LanguageText en="New Conversation" bn="নতুন কথোপকথন" ar="محادثة جديدة" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-250px)]">
          <Card className="md:col-span-4 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Conversations
              </CardTitle>
              <CardDescription>Select a conversation to view messages</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4 p-4">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder={language === 'bn' ? "কথোপকথন খুঁজুন..." : language === 'ar' ? "البحث عن المحادثات..." : "Search conversations..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-conversations"
                  />
                </div>
                <Select value={participantFilter} onValueChange={setParticipantFilter}>
                  <SelectTrigger data-testid="select-participant-filter">
                    <SelectValue placeholder="Filter by participant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Participants</SelectItem>
                    <SelectItem value="teacher">Teachers</SelectItem>
                    <SelectItem value="parent">Parents</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="flex-1">
                {conversationsLoading ? (
                  <div className="text-center py-8" data-testid="loading-conversations">
                    <p className="text-muted-foreground">Loading conversations...</p>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-8" data-testid="empty-conversations">
                    <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No conversations found</p>
                    <Button
                      variant="link"
                      onClick={() => setIsNewConversationOpen(true)}
                      className="mt-2"
                    >
                      Start a new conversation
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredConversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedConversation?.id === conv.id
                            ? 'bg-primary/10 border-2 border-primary'
                            : 'hover:bg-muted border-2 border-transparent'
                        }`}
                        data-testid={`conversation-${conv.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {getInitials(conv.title || 'Chat')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium truncate">
                                {conv.title || 'Conversation'}
                              </h4>
                              {conv.last_message_at && (
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {getParticipantTypeBadge(conv.participant_types)}
                            </div>
                            {conv.lastMessage && (
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.lastMessage.sender_name}: {conv.lastMessage.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="md:col-span-8 flex flex-col">
            <CardHeader>
              {selectedConversation ? (
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {selectedConversation.title || 'Conversation'}
                  </CardTitle>
                  <CardDescription className="flex gap-2 mt-2">
                    {getParticipantTypeBadge(selectedConversation.participant_types)}
                  </CardDescription>
                </div>
              ) : (
                <div>
                  <CardTitle>Select a Conversation</CardTitle>
                  <CardDescription>Choose a conversation to view messages</CardDescription>
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              {selectedConversation ? (
                <>
                  <ScrollArea className="flex-1 p-4" data-testid="messages-container">
                    {messagesLoading ? (
                      <div className="text-center py-8" data-testid="loading-messages">
                        <p className="text-muted-foreground">Loading messages...</p>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8" data-testid="empty-messages">
                        <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No messages yet</p>
                        <p className="text-sm text-muted-foreground">Start the conversation!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => {
                          const isOwn = message.sender_id === currentUserId;
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                              data-testid={`message-${message.id}`}
                            >
                              <div
                                className={`max-w-[70%] ${
                                  isOwn
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                } rounded-lg p-3`}
                              >
                                {!isOwn && (
                                  <p className="text-xs font-medium mb-1">
                                    {message.sender_name}
                                  </p>
                                )}
                                <p className="text-sm break-words">{message.message}</p>
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
                                    <Paperclip className="w-3 h-3" />
                                    <span>{message.attachments[0].name}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-end gap-1 mt-1">
                                  <span className="text-xs opacity-70">
                                    {format(new Date(message.created_at), 'HH:mm')}
                                  </span>
                                  {isOwn && (
                                    <span>
                                      {message.is_read ? (
                                        <CheckCheck className="w-3 h-3" data-testid={`read-${message.id}`} />
                                      ) : (
                                        <Check className="w-3 h-3" data-testid={`sent-${message.id}`} />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  <div className="border-t p-4">
                    {fileAttachment && (
                      <div className="mb-2 p-2 bg-muted rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4" />
                          <span className="text-sm">{fileAttachment.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFileAttachment(null)}
                          data-testid="button-remove-attachment"
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => document.getElementById('file-upload')?.click()}
                        data-testid="button-attach-file"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Input
                        placeholder="Type your message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        data-testid="input-message"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() || sendMessageMutation.isPending}
                        data-testid="button-send-message"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Select a conversation to start messaging</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen}>
          <DialogContent data-testid="dialog-new-conversation">
            <DialogHeader>
              <DialogTitle>
                <LanguageText en="New Conversation" bn="নতুন কথোপকথন" ar="محادثة جديدة" />
              </DialogTitle>
              <DialogDescription>
                <LanguageText 
                  en="Start a new conversation with a teacher or parent" 
                  bn="শিক্ষক বা অভিভাবকের সাথে একটি নতুন কথোপকথন শুরু করুন" 
                  ar="ابدأ محادثة جديدة مع معلم أو ولي أمر"
                />
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Conversation Title (Optional)</Label>
                <Input
                  id="title"
                  value={newConversationForm.title}
                  onChange={(e) => setNewConversationForm({ ...newConversationForm, title: e.target.value })}
                  placeholder="e.g., Math Assignment Discussion"
                  data-testid="input-conversation-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="participant_type">Participant Type*</Label>
                <Select
                  value={newConversationForm.participant_type}
                  onValueChange={(value) => setNewConversationForm({ ...newConversationForm, participant_type: value })}
                >
                  <SelectTrigger data-testid="select-participant-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="participant_id">Participant ID*</Label>
                <Input
                  id="participant_id"
                  type="number"
                  value={newConversationForm.participant_id}
                  onChange={(e) => setNewConversationForm({ ...newConversationForm, participant_id: e.target.value })}
                  placeholder="Enter participant ID"
                  data-testid="input-participant-id"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsNewConversationOpen(false)}
                data-testid="button-cancel-conversation"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createConversationMutation.mutate(newConversationForm)}
                disabled={!newConversationForm.participant_id || createConversationMutation.isPending}
                data-testid="button-create-conversation"
              >
                {createConversationMutation.isPending ? 'Creating...' : 'Create Conversation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
