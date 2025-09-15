import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ResponsivePageLayout } from '@/components/layout/responsive-page-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/supabase';
import { 
  Search, 
  BookOpen, 
  Users, 
  Calendar, 
  Plus, 
  Filter, 
  Download,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Star,
  TrendingUp,
  Eye,
  QrCode
} from 'lucide-react';
import { format } from 'date-fns';

// Enhanced schemas following world-class UX principles
const bookSchema = z.object({
  title: z.string().min(1, 'বইয়ের নাম প্রয়োজন'),
  titleBn: z.string().min(1, 'বাংলা নাম প্রয়োজন'),
  author: z.string().min(1, 'লেখকের নাম প্রয়োজন'),
  isbn: z.string().optional(),
  category: z.string().min(1, 'বিভাগ নির্বাচন করুন'),
  publisher: z.string().optional(),
  publishYear: z.number().min(1900).max(new Date().getFullYear()),
  totalCopies: z.number().min(1, 'কমপক্ষে একটি কপি থাকতে হবে'),
  location: z.string().min(1, 'অবস্থান প্রয়োজন'),
  description: z.string().optional(),
});

const borrowSchema = z.object({
  studentId: z.string().min(1, 'শিক্ষার্থী নির্বাচন করুন'),
  bookId: z.string().min(1, 'বই নির্বাচন করুন'),
  dueDate: z.date(),
  notes: z.string().optional(),
});

type BookFormData = z.infer<typeof bookSchema>;
type BorrowFormData = z.infer<typeof borrowSchema>;

export default function LibraryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isEditBookOpen, setIsEditBookOpen] = useState(false);
  const [isBorrowBookOpen, setIsBorrowBookOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);

  // Enhanced form handling following Luke Wroblewski's principles
  const bookForm = useForm<BookFormData>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: '',
      titleBn: '',
      author: '',
      isbn: '',
      category: '',
      publisher: '',
      publishYear: new Date().getFullYear(),
      totalCopies: 1,
      location: '',
      description: '',
    },
  });

  const borrowForm = useForm<BorrowFormData>({
    resolver: zodResolver(borrowSchema),
    defaultValues: {
      studentId: '',
      bookId: '',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      notes: '',
    },
  });

  // Real-time data queries with direct Supabase calls
  const { data: books = [], isLoading: booksLoading } = useQuery({
    queryKey: ['library-books', { schoolId: 1 }],
    queryFn: async () => {
      console.log('🔄 Fetching library books directly from Supabase...');
      const books = await db.getLibraryBooks(1);
      console.log('✅ Library books from Supabase:', books?.length || 0);
      return books || [];
    },
    refetchInterval: 30000, // Real-time updates every 30 seconds
  });

  const { data: borrowedBooks = [], isLoading: borrowedLoading } = useQuery({
    queryKey: ['library-borrowed', { schoolId: 1 }],
    queryFn: async () => {
      console.log('🔄 Fetching borrowed books directly from Supabase...');
      const borrowed = await db.getBorrowedBooks(1);
      console.log('✅ Borrowed books from Supabase:', borrowed?.length || 0);
      return borrowed || [];
    },
    refetchInterval: 30000,
  });

  const { data: libraryStats = {}, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['library-stats', { schoolId: 1 }],
    queryFn: async () => {
      console.log('🔄 Fetching library stats directly from Supabase...');
      const stats = await db.getLibraryStats(1);
      console.log('✅ Library stats from Supabase:', stats);
      return stats || { total_books: 0, borrowed_books: 0, available_books: 0 };
    },
    refetchInterval: 60000,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students', { schoolId: 1 }],
    queryFn: async () => {
      console.log('🔄 Fetching students for library from Supabase...');
      const students = await db.getStudents(1);
      console.log('✅ Students from Supabase:', students?.length || 0);
      return students || [];
    },
  });

  // Mutations for CRUD operations with direct Supabase
  const addBookMutation = useMutation({
    mutationFn: async (data: BookFormData) => {
      console.log('🔄 Adding book to Supabase...', data);
      const bookWithSchool = { ...data, school_id: 1 };
      const newBook = await db.createLibraryBook(bookWithSchool);
      console.log('✅ Book added to Supabase:', newBook);
      return newBook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-books'] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      setIsAddBookOpen(false);
      bookForm.reset();
      toast({
        title: "সফল",
        description: "নতুন বই সংযোজিত হয়েছে",
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "বই সংযোজনে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  const borrowBookMutation = useMutation({
    mutationFn: async (data: BorrowFormData) => {
      console.log('🔄 Borrowing book via Supabase...', data);
      const result = await db.borrowBook(parseInt(data.bookId), parseInt(data.studentId), 1);
      console.log('✅ Book borrowed via Supabase:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-borrowed'] });
      queryClient.invalidateQueries({ queryKey: ['library-books'] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      setIsBorrowBookOpen(false);
      borrowForm.reset();
      toast({
        title: "সফল",
        description: "বই ইস্যু করা হয়েছে",
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "বই ইস্যুতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  const returnBookMutation = useMutation({
    mutationFn: async (borrowId: number) => {
      console.log('🔄 Returning book via Supabase...', borrowId);
      const result = await db.returnBook(borrowId);
      console.log('✅ Book returned via Supabase:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-borrowed'] });
      queryClient.invalidateQueries({ queryKey: ['library-books'] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      toast({
        title: "সফল",
        description: "বই ফেরত নেওয়া হয়েছে",
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "বই ফেরতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: async (bookId: number) => {
      console.log('🔄 Deleting book via Supabase...', bookId);
      const result = await db.deleteLibraryBook(bookId);
      console.log('✅ Book deleted via Supabase:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-books'] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      toast({
        title: "সফল",
        description: "বই মুছে ফেলা হয়েছে",
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "বই মুছতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  const editBookMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      console.log('🔄 Updating book via Supabase...', { id, data });
      const result = await db.updateLibraryBook(id, data);
      console.log('✅ Book updated via Supabase:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-books'] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      setIsEditBookOpen(false);
      bookForm.reset();
      toast({
        title: "সফল",
        description: "বই আপডেট করা হয়েছে",
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "বই আপডেটে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  // Enhanced filtering following Steve Krug's usability principles
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch = searchQuery === '' || 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.titleBn.includes(searchQuery) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || book.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [books, searchQuery, categoryFilter]);

  const filteredBorrowedBooks = useMemo(() => {
    return borrowedBooks.filter(borrow => {
      const matchesSearch = searchQuery === '' || 
        borrow.book?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        borrow.student?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'overdue' && borrow.dueDate && new Date(borrow.dueDate) < new Date()) ||
        (statusFilter === 'active' && borrow.dueDate && new Date(borrow.dueDate) >= new Date());
      
      return matchesSearch && matchesStatus;
    });
  }, [borrowedBooks, searchQuery, statusFilter]);

  // Enhanced accessibility following WCAG guidelines
  const handleKeyboardNavigation = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Summary Cards - Following Jonathan Ive's design clarity */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              মোট বই
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {libraryStats?.totalBooks || 0}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {libraryStats?.availableBooks || 0} টি উপলব্ধ
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              ইস্যুকৃত বই
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {libraryStats?.borrowedBooks || 0}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {libraryStats?.activeBorrowers || 0} জন শিক্ষার্থী
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              বাকি পড়া
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {libraryStats.overdueBooks || 0}
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              {libraryStats.overdueBorrowers || 0} জন শিক্ষার্থী
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              জনপ্রিয় বই
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {libraryStats.popularBooks || 0}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              এই মাসে
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity - Following Don Norman's feedback principles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            সাম্প্রতিক কার্যক্রম
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {borrowedBooks.slice(0, 5).map((borrow) => (
              <div key={borrow.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    borrow.dueDate && new Date(borrow.dueDate) < new Date() ? 'bg-red-500' : 'bg-green-500'
                  }`} />
                  <div>
                    <p className="font-medium">{borrow.book?.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {borrow.student?.name} • {borrow.borrowDate ? format(new Date(borrow.borrowDate), 'dd/MM/yyyy') : 'তারিখ নেই'}
                    </p>
                  </div>
                </div>
                <Badge variant={borrow.dueDate && new Date(borrow.dueDate) < new Date() ? "destructive" : "secondary"}>
                  {borrow.dueDate && new Date(borrow.dueDate) < new Date() ? 'বাকি' : 'সক্রিয়'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderBooks = () => (
    <div className="space-y-6">
      {/* Enhanced Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-center flex-1">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="বই খুঁজুন (নাম, লেখক)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="বই অনুসন্ধান"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="বিভাগ নির্বাচন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব বিভাগ</SelectItem>
              <SelectItem value="textbook">পাঠ্যবই</SelectItem>
              <SelectItem value="reference">রেফারেন্স</SelectItem>
              <SelectItem value="literature">সাহিত্য</SelectItem>
              <SelectItem value="science">বিজ্ঞান</SelectItem>
              <SelectItem value="history">ইতিহাস</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isAddBookOpen} onOpenChange={setIsAddBookOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              নতুন বই
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>নতুন বই সংযোজন</DialogTitle>
              <DialogDescription>
                লাইব্রেরিতে নতুন বই যোগ করুন
              </DialogDescription>
            </DialogHeader>
            <Form {...bookForm}>
              <form onSubmit={bookForm.handleSubmit((data) => addBookMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={bookForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>বইয়ের নাম (ইংরেজি)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Book Title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bookForm.control}
                    name="titleBn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>বইয়ের নাম (বাংলা)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="বইয়ের নাম" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bookForm.control}
                    name="author"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>লেখক</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="লেখকের নাম" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bookForm.control}
                    name="isbn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ISBN</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="978-1234567890" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bookForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>বিভাগ</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="বিভাগ নির্বাচন করুন" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="textbook">পাঠ্যবই</SelectItem>
                            <SelectItem value="reference">রেফারেন্স</SelectItem>
                            <SelectItem value="literature">সাহিত্য</SelectItem>
                            <SelectItem value="science">বিজ্ঞান</SelectItem>
                            <SelectItem value="history">ইতিহাস</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bookForm.control}
                    name="totalCopies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>মোট কপি</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            placeholder="1" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddBookOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit" disabled={addBookMutation.isPending}>
                    {addBookMutation.isPending ? 'সংরক্ষণ করা হচ্ছে...' : 'সংরক্ষণ করুন'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Books Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>বইয়ের নাম</TableHead>
                <TableHead>লেখক</TableHead>
                <TableHead>বিভাগ</TableHead>
                <TableHead>উপলব্ধ/মোট</TableHead>
                <TableHead>অবস্থা</TableHead>
                <TableHead className="text-right">কার্যক্রম</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {booksLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    লোড হচ্ছে...
                  </TableCell>
                </TableRow>
              ) : filteredBooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    কোনো বই পাওয়া যায়নি
                  </TableCell>
                </TableRow>
              ) : (
                filteredBooks.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{book.titleBn}</p>
                        <p className="text-sm text-gray-600">{book.title}</p>
                      </div>
                    </TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{book.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        book.availableCopies > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {book.availableCopies}/{book.totalCopies}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={book.availableCopies > 0 ? "success" : "destructive"}>
                        {book.availableCopies > 0 ? 'উপলব্ধ' : 'স্টক আউট'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AppShell>
      <ResponsivePageLayout
        title="লাইব্রেরি ব্যবস্থাপনা"
        description="বই ইস্যু, ফেরত এবং ইনভেন্টরি ব্যবস্থাপনা"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              রিপোর্ট
            </Button>
            <Button variant="outline" size="sm">
              <QrCode className="h-4 w-4 mr-2" />
              QR স্ক্যান
            </Button>
          </div>
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">ড্যাশবোর্ড</TabsTrigger>
            <TabsTrigger value="books">বই সমূহ</TabsTrigger>
            <TabsTrigger value="borrowed">ইস্যুকৃত</TabsTrigger>
            <TabsTrigger value="reports">রিপোর্ট</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {renderDashboard()}
          </TabsContent>

          <TabsContent value="books" className="space-y-6">
            {renderBooks()}
          </TabsContent>

          <TabsContent value="borrowed" className="space-y-6">
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">ইস্যুকৃত বই</h3>
              <p className="text-gray-600">ইস্যুকৃত বই ব্যবস্থাপনা শীঘ্রই আসছে</p>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="text-center py-12">
              <TrendingUp className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">লাইব্রেরি রিপোর্ট</h3>
              <p className="text-gray-600">বিস্তারিত রিপোর্ট শীঘ্রই আসছে</p>
            </div>
          </TabsContent>
        </Tabs>
      </ResponsivePageLayout>
    </AppShell>
  );
}