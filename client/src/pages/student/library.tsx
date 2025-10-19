import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDesignSystem } from "@/hooks/use-design-system";
import { useRequireSchoolId } from "@/hooks/use-require-school-id";
import { supabase } from "@/lib/supabase";
import { Link } from "wouter";
import { useState } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { 
  ArrowLeft,
  BookMarked,
  Search,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Book,
  User,
  Filter
} from "lucide-react";

interface LibraryBook {
  id: number;
  title: string;
  title_bn: string;
  author: string;
  isbn?: string;
  category: string;
  publisher?: string;
  publish_year?: number;
  total_copies: number;
  available_copies: number;
  location: string;
  description?: string;
}

interface BorrowedBook {
  id: number;
  book_id: number;
  student_id: number;
  borrow_date: string;
  due_date: string;
  return_date?: string;
  status: 'active' | 'returned' | 'overdue';
  fine: string;
  notes?: string;
  library_books?: LibraryBook;
}

interface LibraryStats {
  totalBorrowed: number;
  activeBorrows: number;
  overdueBorrows: number;
  totalFines: number;
}

export default function StudentLibrary() {
  useDesignSystem();
  const schoolId = useRequireSchoolId();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'returned' | 'overdue'>('all');

  // Fetch current user's student record
  const { data: currentStudent } = useQuery({
    queryKey: ['current-student', schoolId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('students')
        .select('id')
        .eq('email', user.email)
        .eq('school_id', schoolId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: borrowedBooks, isLoading: borrowedLoading } = useQuery<BorrowedBook[]>({
    queryKey: ['library-borrowed-books', schoolId, currentStudent?.id],
    enabled: !!currentStudent?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_borrowed_books')
        .select(`
          *,
          library_books (
            id,
            title,
            title_bn,
            author,
            isbn,
            category,
            publisher,
            publish_year,
            total_copies,
            available_copies,
            location,
            description
          )
        `)
        .eq('school_id', schoolId)
        .eq('student_id', currentStudent.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    }
  });

  const { data: availableBooks, isLoading: booksLoading } = useQuery<LibraryBook[]>({
    queryKey: ['library-books', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_books')
        .select('*')
        .eq('school_id', schoolId)
        .order('title');
      
      if (error) throw error;
      return data;
    }
  });

  // Calculate stats from borrowed books
  const libraryStats: LibraryStats = {
    totalBorrowed: borrowedBooks?.length || 0,
    activeBorrows: borrowedBooks?.filter(b => b.status === 'active').length || 0,
    overdueBorrows: borrowedBooks?.filter(b => b.status === 'overdue').length || 0,
    totalFines: borrowedBooks?.reduce((sum, book) => sum + parseFloat(book.fine || '0'), 0) || 0
  };

  // Filter borrowed books
  const filteredBorrowedBooks = borrowedBooks?.filter(borrow => {
    const book = borrow.library_books;
    const matchesSearch = !searchTerm || 
      book?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book?.title_bn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book?.author?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || borrow.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Filter available books
  const filteredAvailableBooks = availableBooks?.filter(book => {
    const matchesSearch = !searchTerm || 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.title_bn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || book.category === categoryFilter;
    
    return matchesSearch && matchesCategory && book.available_copies > 0;
  }) || [];

  // Get unique categories
  const categories = [...new Set(availableBooks?.map(book => book.category) || [])];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'returned': return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="h-4 w-4" />;
      case 'returned': return <CheckCircle2 className="h-4 w-4" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getDaysRemaining = (dueDate: string) => {
    const days = differenceInDays(parseISO(dueDate), new Date());
    return days;
  };

  if (borrowedLoading || booksLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-indigo-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/student">
                <Button variant="ghost" size="sm" data-testid="button-back-portal">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Portal
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Library
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  লাইব্রেরি • Browse books and manage borrowed items
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search books..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-books"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-700" data-testid="text-active-borrows">
                    {libraryStats.activeBorrows}
                  </p>
                  <p className="text-sm text-blue-600 font-medium">Currently Borrowed</p>
                </div>
                <div className="bg-blue-500 p-3 rounded-xl">
                  <BookMarked className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-total-borrowed">
                    {libraryStats.totalBorrowed}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Total Borrowed</p>
                </div>
                <Book className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-700" data-testid="text-overdue-books">
                    {libraryStats.overdueBorrows}
                  </p>
                  <p className="text-sm text-red-600 font-medium">Overdue Books</p>
                </div>
                <div className="bg-red-500 p-3 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-yellow-700" data-testid="text-total-fines">
                    ৳{libraryStats.totalFines.toFixed(2)}
                  </p>
                  <p className="text-sm text-yellow-600 font-medium">Total Fines</p>
                </div>
                <div className="bg-yellow-500 p-3 rounded-xl">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Borrowed Books */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <BookMarked className="h-5 w-5 text-blue-600" />
                      <span>My Borrowed Books</span>
                    </CardTitle>
                    <CardDescription>
                      Track your borrowed books and due dates
                    </CardDescription>
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    data-testid="select-status-filter"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="returned">Returned</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredBorrowedBooks.map((borrow) => {
                    const daysRemaining = getDaysRemaining(borrow.due_date);
                    const isOverdue = daysRemaining < 0;
                    const book = borrow.library_books;
                    
                    return (
                      <div key={borrow.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-all duration-200" data-testid={`card-borrowed-book-${borrow.id}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                              {book?.title || 'Unknown Title'}
                            </h3>
                            {book?.title_bn && (
                              <p className="text-gray-600 dark:text-gray-300 text-sm mb-1">
                                {book.title_bn}
                              </p>
                            )}
                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                              by {book?.author || 'Unknown Author'}
                            </p>
                          </div>
                          
                          <Badge className={getStatusColor(borrow.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(borrow.status)}
                              <span className="capitalize">{borrow.status}</span>
                            </div>
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Borrowed Date</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {format(parseISO(borrow.borrow_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Due Date</p>
                            <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                              {format(parseISO(borrow.due_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Days Remaining</p>
                            <p className={`font-medium ${
                              isOverdue ? 'text-red-600' : 
                              daysRemaining <= 3 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {isOverdue ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days`}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Fine</p>
                            <p className={`font-medium ${parseFloat(borrow.fine) > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                              ৳{parseFloat(borrow.fine).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {book?.location && (
                          <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              <strong>Location:</strong> {book.location}
                            </p>
                          </div>
                        )}

                        {borrow.notes && (
                          <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <p className="text-sm text-blue-800 dark:text-blue-300">
                              <strong>Note:</strong> {borrow.notes}
                            </p>
                          </div>
                        )}

                        {isOverdue && (
                          <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border-l-4 border-red-500">
                            <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                              This book is overdue. Please return it as soon as possible to avoid additional fines.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredBorrowedBooks.length === 0 && (
                    <div className="text-center py-12">
                      <BookMarked className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No Borrowed Books Found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {searchTerm || statusFilter !== 'all' 
                          ? 'No books match your search criteria.' 
                          : 'You haven\'t borrowed any books yet.'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Available Books */}
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Book className="h-5 w-5 text-green-600" />
                      <span>Available Books</span>
                    </CardTitle>
                    <CardDescription>
                      Browse and search available books in the library
                    </CardDescription>
                  </div>
                  
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    data-testid="select-category-filter"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAvailableBooks.slice(0, 6).map((book) => (
                    <div key={book.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-all duration-200" data-testid={`card-available-book-${book.id}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                          {book.title}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {book.available_copies} available
                        </Badge>
                      </div>
                      
                      {book.title_bn && (
                        <p className="text-gray-600 dark:text-gray-300 text-xs mb-1">
                          {book.title_bn}
                        </p>
                      )}
                      
                      <p className="text-gray-600 dark:text-gray-300 text-xs mb-2">
                        by {book.author}
                      </p>
                      
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">{book.category}</span>
                        <span className="text-gray-500">{book.location}</span>
                      </div>
                      
                      {book.publish_year && (
                        <p className="text-gray-500 text-xs mt-1">
                          Published: {book.publish_year}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                
                {filteredAvailableBooks.length === 0 && (
                  <div className="text-center py-8">
                    <Book className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No available books found matching your criteria.
                    </p>
                  </div>
                )}
                
                {filteredAvailableBooks.length > 6 && (
                  <div className="text-center mt-4">
                    <Button variant="outline" size="sm" data-testid="button-view-all-books">
                      View All Books ({filteredAvailableBooks.length})
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookMarked className="h-5 w-5 text-purple-600" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" size="sm" data-testid="button-search-catalog">
                  <Search className="h-4 w-4 mr-2" />
                  Search Catalog
                </Button>
                <Button variant="outline" className="w-full" size="sm" data-testid="button-browse-category">
                  <Book className="h-4 w-4 mr-2" />
                  Browse by Category
                </Button>
                <Button variant="outline" className="w-full" size="sm" data-testid="button-request-book">
                  <User className="h-4 w-4 mr-2" />
                  Request Book
                </Button>
              </CardContent>
            </Card>

            {/* Library Rules */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Library Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-1">Borrowing Period</h4>
                  <p className="text-blue-700 dark:text-blue-400">
                    Books can be borrowed for 14 days and renewed once
                  </p>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-1">Late Return Fine</h4>
                  <p className="text-yellow-700 dark:text-yellow-400">
                    ৳2 per day for each overdue book
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-300 mb-1">Maximum Books</h4>
                  <p className="text-green-700 dark:text-green-400">
                    Students can borrow up to 3 books at a time
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Popular Categories */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Popular Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.slice(0, 5).map((category) => {
                    const bookCount = availableBooks?.filter(book => book.category === category).length || 0;
                    return (
                      <div key={category} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {category}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {bookCount} books
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
