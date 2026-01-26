import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppBreadcrumb from "@/components/common/AppBreadcrumb";
import { ArrowRight } from "lucide-react";

const ContestResultsPage = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <AppBreadcrumb
            items={[
              { label: "My Contests", href: "/my-contests" },
              { label: "Results" },
            ]}
          />
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Contest Results
              </h1>
              <p className="text-muted-foreground mb-6">
                {attemptId
                  ? `Results for attempt #${attemptId} will be available when the attempt API is connected.`
                  : "No attempt selected."}
              </p>
              <Button onClick={() => navigate("/my-contests")} className="gap-2">
                Back to My Contests
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ContestResultsPage;
