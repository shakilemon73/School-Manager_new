import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { ModulePageLayout } from '@/components/layout/module-page-layout';
import { BookOpen } from 'lucide-react';
import { db } from '@/lib/supabase';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

const bookSchema = z.object({
  title: z.string().min(2, { message: 'বইয়ের নাম অন্তত ২ অক্ষরের হতে হবে' }),
  titleBn: z.string().min(2, { message: 'বাংলা নাম অন্তত ২ অক্ষরের হতে হবে' }),
  author: z.string().min(2, { message: 'লেখকের নাম অন্তত ২ অক্ষরের হতে হবে' }),
  isbn: z.string().optional(),
  category: z.string().min(1, { message: 'ক্যাটাগরি নির্বাচন করুন' }),
  publisher: z.string().optional(),
  publishYear: z.string().optional(),
  totalCopies: z.string().min(1, { message: 'কপি সংখ্যা দিন' }),
  location: z.string().min(1, { message: 'শেলফ নম্বর দিন' }),
  description: z.string().optional()
});

type BookFormValues = z.infer<typeof bookSchema>;

export default function LibraryPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: '',
      titleBn: '',
      author: '',
      isbn: '',
      category: '',
      publisher: '',
      publishYear: '',
      totalCopies: '1',
      location: '',
      description: ''
    },
  });

  // Fetch library data from Supabase
  const { data: booksData = [], isLoading: booksLoading, error: booksError } = useQuery({
    queryKey: ['library-books', schoolId],
    queryFn: async () => {
      console.log('📚 Fetching library books for school ID:', schoolId);
      const data = await db.getLibraryBooks(schoolId);
      console.log('✅ Library books received:', data);
      return data;
    },
  });

  const { data: borrowedBooksData = [], isLoading: borrowedLoading } = useQuery({
    queryKey: ['borrowed-books', schoolId],
    queryFn: async () => {
      const data = await db.getBorrowedBooks(schoolId);
      return data;
    },
  });

  const { data: libraryStats } = useQuery({
    queryKey: ['library-stats', schoolId],
    queryFn: async () => {
      const stats = await db.getLibraryStats(schoolId);
      return stats;
    },
  });

  // Create book mutation
  const createBookMutation = useMutation({
    mutationFn: async (book: BookFormValues) => {
      const bookData = {
        title: book.title,
        title_bn: book.titleBn,
        author: book.author,
        isbn: book.isbn,
        category: book.category,
        publisher: book.publisher,
        publish_year: book.publishYear ? parseInt(book.publishYear) : null,
        total_copies: parseInt(book.totalCopies),
        available_copies: parseInt(book.totalCopies),
        location: book.location,
        description: book.description,
        school_id: schoolId,
      };
      
      return await db.createLibraryBook(bookData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-books', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['library-stats', schoolId] });
      toast({
        title: "বই যোগ করা হয়েছে",
        description: "নতুন বই সফলভাবে লাইব্রেরিতে যোগ করা হয়েছে।",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error('Error creating book:', error);
      toast({
        title: "ত্রুটি",
        description: "বই যোগ করতে সমস্যা হয়েছে।",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: BookFormValues) {
    createBookMutation.mutate(data);
  }

  return (
    <ModulePageLayout 
      title="লাইব্রেরি ব্যবস্থাপনা" 
      description="বই এবং লাইব্রেরির সকল তথ্য দেখুন ও পরিচালনা করুন।"
      icon={<BookOpen className="h-6 w-6" />}
      onAddNew={() => setIsDialogOpen(true)}
      addNewLabel="নতুন বই যোগ করুন"
    >
      <Tabs defaultValue="books" className="w-full">
        <div className="px-4 py-2 border-b">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="books">সকল বই</TabsTrigger>
            <TabsTrigger value="issues">ইস্যুকৃত বই</TabsTrigger>
          </TabsList>
          
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="relative">
              <Input
                placeholder="বই বা লেখকের নাম দিয়ে খুঁজুন..."
                className="max-w-sm pl-9"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ক্যাটাগরি" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব ক্যাটাগরি</SelectItem>
                <SelectItem value="history">ইতিহাস</SelectItem>
                <SelectItem value="science">বিজ্ঞান</SelectItem>
                <SelectItem value="literature">সাহিত্য</SelectItem>
                <SelectItem value="technology">প্রযুক্তি</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline"
              onClick={() => setIsIssueDialogOpen(true)}
            >
              নতুন ইস্যু
            </Button>
          </div>
        </div>
        
        <TabsContent value="books" className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>বইয়ের নাম</TableHead>
                <TableHead>লেখক</TableHead>
                <TableHead>ক্যাটাগরি</TableHead>
                <TableHead>মোট কপি</TableHead>
                <TableHead>উপলব্ধ</TableHead>
                <TableHead>শেলফ</TableHead>
                <TableHead className="text-right">কার্যক্রম</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {booksLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">লোড হচ্ছে...</TableCell>
                </TableRow>
              ) : booksData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">কোন বই পাওয়া যায়নি</TableCell>
                </TableRow>
              ) : (
                booksData.map((book: any) => (
                  <TableRow key={book.id}>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell>{book.category}</TableCell>
                    <TableCell>{book.total_copies}</TableCell>
                    <TableCell>{book.available_copies}</TableCell>
                    <TableCell>{book.location}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">দেখুন</Button>
                      <Button variant="ghost" size="sm">সম্পাদনা</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
        
        <TabsContent value="issues" className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>বইয়ের নাম</TableHead>
                <TableHead>শিক্ষার্থী</TableHead>
                <TableHead>শ্রেণি</TableHead>
                <TableHead>ইস্যু তারিখ</TableHead>
                <TableHead>ফেরতের তারিখ</TableHead>
                <TableHead className="text-right">কার্যক্রম</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {borrowedLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">লোড হচ্ছে...</TableCell>
                </TableRow>
              ) : borrowedBooksData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">কোন ইস্যুকৃত বই নেই</TableCell>
                </TableRow>
              ) : (
                borrowedBooksData.map((issue: any) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium">{issue.library_books?.title || 'N/A'}</TableCell>
                    <TableCell>{issue.students?.name || 'N/A'}</TableCell>
                    <TableCell>{issue.students?.class || 'N/A'}</TableCell>
                    <TableCell>{new Date(issue.borrow_date).toLocaleDateString('bn-BD')}</TableCell>
                    <TableCell>{new Date(issue.return_date).toLocaleDateString('bn-BD')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">ফেরত নিন</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
      
      {/* Add Book Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>নতুন বই যোগ করুন</DialogTitle>
            <DialogDescription>
              বইয়ের সকল তথ্য সঠিকভাবে পূরণ করুন। তারকা (*) চিহ্নিত ঘর পূরণ করা বাধ্যতামূলক।
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>বইয়ের নাম *</FormLabel>
                      <FormControl>
                        <Input placeholder="বইয়ের পূর্ণ নাম লিখুন" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>লেখক *</FormLabel>
                      <FormControl>
                        <Input placeholder="লেখকের নাম" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isbn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ISBN</FormLabel>
                      <FormControl>
                        <Input placeholder="ISBN নম্বর" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ক্যাটাগরি *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ইতিহাস">ইতিহাস</SelectItem>
                          <SelectItem value="বিজ্ঞান">বিজ্ঞান</SelectItem>
                          <SelectItem value="সাহিত্য">সাহিত্য</SelectItem>
                          <SelectItem value="ভাষা">ভাষা</SelectItem>
                          <SelectItem value="প্রযুক্তি">প্রযুক্তি</SelectItem>
                          <SelectItem value="গণিত">গণিত</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="publisher"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>প্রকাশক</FormLabel>
                      <FormControl>
                        <Input placeholder="প্রকাশকের নাম" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="publishYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>প্রকাশনার বছর</FormLabel>
                      <FormControl>
                        <Input placeholder="প্রকাশনার বছর" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="totalCopies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>কপি সংখ্যা *</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>শেলফ নম্বর *</FormLabel>
                      <FormControl>
                        <Input placeholder="উদাহরণ: A-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  বাতিল
                </Button>
                <Button type="submit">যোগ করুন</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Issue Book Dialog */}
      <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>নতুন বই ইস্যু করুন</DialogTitle>
            <DialogDescription>
              বই ইস্যুর জন্য শিক্ষার্থী এবং বই নির্বাচন করুন।
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>শিক্ষার্থী *</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="শিক্ষার্থী নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">করিম আহমেদ - নবম (২৫)</SelectItem>
                  <SelectItem value="2">ফাতেমা খাতুন - অষ্টম (১২)</SelectItem>
                  <SelectItem value="3">রাকিব হাসান - সপ্তম (০৮)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>বই *</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="বই নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">বাংলাদেশের ইতিহাস - সিরাজুল ইসলাম</SelectItem>
                  <SelectItem value="2">বাংলা ব্যাকরণ - সুনীল গঙ্গোপাধ্যায়</SelectItem>
                  <SelectItem value="3">গণিতের মজা - মুহম্মদ জাফর ইকবাল</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ইস্যুর তারিখ *</Label>
                <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              
              <div className="space-y-2">
                <Label>ফেরতের তারিখ *</Label>
                <Input type="date" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>মন্তব্য</Label>
              <Input placeholder="প্রয়োজনীয় মন্তব্য লিখুন" />
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsIssueDialogOpen(false)}>
                বাতিল
              </Button>
              <Button onClick={() => {
                toast({
                  title: "বই ইস্যু করা হয়েছে",
                  description: "বইটি সফলভাবে ইস্যু করা হয়েছে।",
                });
                setIsIssueDialogOpen(false);
              }}>
                ইস্যু করুন
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </ModulePageLayout>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-sm font-medium">{children}</div>
);