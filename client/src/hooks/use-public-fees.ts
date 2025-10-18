import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface FeeReceiptWithItems {
  id: number;
  receiptNumber: string;
  totalAmount: string;
  paidAmount: string;
  dueAmount: string;
  paymentMethod: string;
  paymentDate: string;
  academicYear: string;
  month: string;
  status: string;
  notes: string;
  items: {
    id: number;
    itemName: string;
    amount: string;
    description: string;
  }[];
}

export function usePublicFees(token: string | null, studentId: number | null) {
  return useQuery({
    queryKey: ['/api/public/fees', token, studentId],
    queryFn: async () => {
      if (!token || !studentId) {
        throw new Error('No access token or student ID provided');
      }

      console.log('💳 Fetching public fees for student:', studentId);

      // Fetch fee receipts with items
      const { data, error } = await supabase
        .from('fee_receipts')
        .select(`
          id,
          receipt_number,
          total_amount,
          paid_amount,
          due_amount,
          payment_method,
          payment_date,
          academic_year,
          month,
          status,
          notes,
          created_at,
          items:fee_items!receipt_id (
            id,
            item_name,
            amount,
            description
          )
        `)
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('❌ Fees fetch error:', error);
        throw new Error('Failed to fetch fee information');
      }

      console.log('✅ Fee receipts fetched:', data?.length || 0);

      return data?.map((receipt: any) => ({
        id: receipt.id,
        receiptNumber: receipt.receipt_number,
        totalAmount: receipt.total_amount,
        paidAmount: receipt.paid_amount,
        dueAmount: receipt.due_amount,
        paymentMethod: receipt.payment_method,
        paymentDate: receipt.payment_date,
        academicYear: receipt.academic_year,
        month: receipt.month,
        status: receipt.status,
        notes: receipt.notes,
        items: receipt.items?.map((item: any) => ({
          id: item.id,
          itemName: item.item_name,
          amount: item.amount,
          description: item.description
        })) || []
      })) as FeeReceiptWithItems[];
    },
    enabled: !!token && !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
