import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

const ContestCardSkeleton = () => {
  return (
    <Card className="min-h-[280px] overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full mt-2" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent className="pb-3">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="mt-4 pt-3 border-t border-border">
          <Skeleton className="h-5 w-full" />
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t border-border">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
};

export default ContestCardSkeleton;
