import { useParams, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppBreadcrumb from "@/components/common/AppBreadcrumb";
import { Loader } from "@/components/Loader";
import { useProblemQuery } from "@/queries/practice.queries";
import type { Difficulty } from "@/schema/problem.schema";
import { paths } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { Clock, Cpu, Trophy, ArrowLeft, Code2, CheckCircle2 } from "lucide-react";

const difficultyStyles: Record<Difficulty, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-500",
  hard: "text-rose-500",
};

const ProblemDetails = () => {
  const { slug } = useParams();
  const { data: problem, isLoading, isError } = useProblemQuery(slug);

  if (isLoading) {
    return <Loader message="Loading problem" />;
  }

  if (isError || !problem) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6">
          <div className="rounded-lg border border-border py-16 text-center">
            <h1 className="mb-2 text-2xl font-bold text-foreground">
              Problem Not Found
            </h1>
            <p className="mb-6 text-muted-foreground">
              This problem doesn&apos;t exist, or isn&apos;t available for practice.
            </p>
            <Link to={paths.problems}>
              <Button className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Problems
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto space-y-6 px-4 py-6">
        <AppBreadcrumb
          items={[
            { label: "Problems", href: paths.problems },
            { label: problem.title },
          ]}
        />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">{problem.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span
                className={cn(
                  "font-medium capitalize",
                  difficultyStyles[problem.difficulty],
                )}
              >
                {problem.difficulty}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Trophy className="h-3.5 w-3.5" />
                {problem.points} pts
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {problem.timeLimit} ms
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Cpu className="h-3.5 w-3.5" />
                {problem.memoryLimit} MB
              </span>
              {problem.totalSubmissions > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {Math.round(problem.acceptanceRate * 100)}% acceptance ·{" "}
                  {problem.solvedBy} solved
                </span>
              )}
            </div>

            {problem.status && (
              <Badge
                variant="secondary"
                className={cn(
                  "font-normal",
                  problem.status === "solved"
                    ? "text-emerald-500"
                    : "text-amber-500",
                )}
              >
                {problem.status === "solved" ? "Solved" : "Attempted"}
              </Badge>
            )}
            <div className="flex flex-wrap gap-1.5">
              {problem.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <Link to={paths.problemSolve(problem.slug)}>
            <Button size="lg" className="gap-2">
              <Code2 className="h-4 w-4" />
              Solve
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {problem.description}
            </p>

            {problem.inputFormat && (
              <div>
                <h3 className="mb-1.5 font-semibold text-foreground">Input</h3>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {problem.inputFormat}
                </p>
              </div>
            )}

            {problem.outputFormat && (
              <div>
                <h3 className="mb-1.5 font-semibold text-foreground">Output</h3>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {problem.outputFormat}
                </p>
              </div>
            )}

            {problem.constraints.length > 0 && (
              <div>
                <h3 className="mb-1.5 font-semibold text-foreground">Constraints</h3>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  {problem.constraints.map((constraint, i) => (
                    <li key={i} className="font-mono text-sm">
                      {constraint}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {problem.sampleTestCases.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Examples</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {problem.sampleTestCases.map((testCase, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Example {i + 1}
                  </p>
                  <div className="space-y-2 font-mono text-sm">
                    <div>
                      <span className="text-muted-foreground">Input: </span>
                      <span className="text-foreground">{testCase.input}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Output: </span>
                      <span className="text-foreground">{testCase.expectedOutput}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ProblemDetails;
