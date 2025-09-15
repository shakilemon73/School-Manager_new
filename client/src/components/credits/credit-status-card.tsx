import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { Wallet, AlertCircle, TrendingUp, Gift } from "lucide-react";

interface CreditStatusCardProps {
  className?: string;
}

export function CreditStatusCard({ className }: CreditStatusCardProps) {
  const [_, setLocation] = useLocation();
  const { user } = useSupabaseDirectAuth();
  
  // Fetch credit balance directly from working endpoint
  const { data: userCreditBalance } = useQuery({
    queryKey: ["/api/simple-credit-balance", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(`/api/simple-credit-balance/${user.id}`);
      return response.json();
    },
    enabled: !!user?.id
  });

  // Fetch recent usage logs for insights
  const { data: usageLogs } = useQuery({
    queryKey: ["/api/credit-usage"],
  });

  // Fetch packages for quick purchase
  const { data: packages } = useQuery({
    queryKey: ["/api/credit-packages"],
  });

  const credits = userCreditBalance?.currentCredits || 0;
  const maxCredits = 250; // Dynamic threshold based on usage patterns
  const creditPercentage = Math.min(100, Math.round((credits / maxCredits) * 100));
  
  // Calculate recent usage trend
  const recentUsage = usageLogs?.slice(0, 5) || [];
  const totalRecentUsage = recentUsage.reduce((sum, log) => sum + log.credits, 0);
  
  // Get credit status and recommendation
  const getCreditStatus = () => {
    if (credits < 20) return { status: "খুবই কম", color: "destructive", icon: AlertCircle };
    if (credits < 50) return { status: "কম", color: "warning", icon: AlertCircle };
    if (credits < 100) return { status: "মাঝামাঝি", color: "secondary", icon: TrendingUp };
    return { status: "ভালো", color: "success", icon: Gift };
  };

  const statusInfo = getCreditStatus();
  
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/20 to-transparent rounded-full -translate-y-16 translate-x-16" />
      
      <CardHeader className="pb-4 relative">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>আপনার ক্রেডিট</span>
          </CardTitle>
          <Badge 
            variant={statusInfo.color === "destructive" ? "destructive" : statusInfo.color === "warning" ? "secondary" : "default"}
            className="flex items-center space-x-1"
          >
            <statusInfo.icon className="h-3 w-3" />
            <span>{statusInfo.status}</span>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Credit Balance Display */}
        <div className="text-center space-y-2">
          <div className="text-4xl font-bold text-primary">{credits}</div>
          <div className="text-sm text-muted-foreground">ক্রেডিট বাকি আছে</div>
        </div>

        {/* Credit indicator */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>ব্যালেন্স স্ট্যাটাস</span>
            <span className="font-medium">{creditPercentage}%</span>
          </div>
          <Progress value={creditPercentage} className="h-3" />
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>০ ক্রেডিট</span>
            <span>{maxCredits}+ ক্রেডিট</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-semibold text-red-500">{totalRecentUsage}</div>
            <div className="text-xs text-muted-foreground">সাম্প্রতিক ব্যবহার</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-semibold text-green-500">{recentUsage.length}</div>
            <div className="text-xs text-muted-foreground">সাম্প্রতিক কার্যক্রম</div>
          </div>
        </div>
        
        {/* Recent usage */}
        {recentUsage.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>সাম্প্রতিক ব্যবহার</span>
            </h4>
            <div className="space-y-2">
              {recentUsage.slice(0, 3).map((log, index) => (
                <div key={index} className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">{log.feature}</span>
                  <span className="font-medium text-red-500">-{log.credits}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Quick Purchase Options */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center space-x-2">
            <Gift className="h-4 w-4" />
            <span>দ্রুত কিনুন</span>
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {packages?.slice(0, 3).map((pkg) => (
              <div 
                key={pkg.id}
                className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-3 text-center cursor-pointer hover:from-primary/20 hover:to-primary/10 transition-all border border-primary/20 hover:border-primary/40" 
                onClick={() => setLocation(`/credits/buy?packageId=${pkg.id}`)}
              >
                <div className="text-lg font-bold text-primary">{pkg.credits}</div>
                <div className="text-xs text-muted-foreground">৳{pkg.price}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="space-y-2">
          <Button 
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            onClick={() => setLocation("/credits/buy")}
          >
            <Wallet className="h-4 w-4 mr-2" />
            ক্রেডিট কিনুন
          </Button>
          
          <Button 
            variant="outline"
            className="w-full"
            onClick={() => setLocation("/credits/transactions")}
          >
            লেনদেন ইতিহাস দেখুন
          </Button>
        </div>

        {/* Low credit warning */}
        {credits < 20 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">ক্রেডিট শেষ হয়ে যাচ্ছে!</span>
            </div>
            <p className="text-xs text-destructive/80 mt-1">
              আরও ডকুমেন্ট তৈরি করতে ক্রেডিট কিনুন
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}