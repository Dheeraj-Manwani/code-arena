import { ShieldX, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogoutMutation } from "@/queries/auth.mutations";

const AccessDenied = () => {
  const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg text-center">
        <div className="arena-card border-2 border-destructive/30 bg-card/80 space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
          </div>

          <h1 className="font-mono text-xl font-bold text-foreground">
            Admin Access Required
          </h1>

          <p className="text-foreground/90 leading-relaxed">
            You are currently logged in, but your account does not have
            permission to access this Admin Panel.
          </p>

          <div>
            <p className="text-sm font-medium text-foreground mb-1">
              Please contact:
            </p>
            <p className="font-mono text-sm text-primary">
              Dheeraj (dheerajmanwani2000@gmail.com)
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              to request admin/creator access.
            </p>
          </div>

          <div className="pt-4 border-t border-border space-y-3">
            <a
              href="https://example.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/90 text-sm block"
            >
              Want to participate in contests? Click here.
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              disabled={isLoggingOut}
              className="w-full sm:w-auto"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {isLoggingOut ? "Logging out..." : "Log out"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
