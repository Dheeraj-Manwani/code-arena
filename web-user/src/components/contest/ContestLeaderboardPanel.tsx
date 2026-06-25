import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { useLeaderboardQuery } from "@/queries/leaderboard.queries";
import { contestWebSocket, type ConnectionStatus } from "@/lib/websocket";
import { useAuthStore } from "@/stores/auth.store";

interface ContestLeaderboardPanelProps {
  contestId: number;
}

/** Small live-connection indicator (issues.md §6.6). */
function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
        <Wifi className="w-3 h-3" /> Live
      </span>
    );
  }
  if (status === "offline") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <WifiOff className="w-3 h-3" /> Offline
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-400">
      <Loader2 className="w-3 h-3 animate-spin" /> Reconnecting…
    </span>
  );
}

export default function ContestLeaderboardPanel({ contestId }: ContestLeaderboardPanelProps) {
  const { data: entries = [], isLoading } = useLeaderboardQuery(contestId);
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    contestWebSocket.getStatus()
  );

  // Refetch the leaderboard whenever the gateway signals a change (issues.md §1.1).
  // The WS frame is anonymised — it only tells us to refetch, so no other user's
  // score is exposed over the socket.
  useEffect(() => {
    const unsubscribe = contestWebSocket.onLeaderboardUpdate((data) => {
      if (data.contestId === contestId) {
        queryClient.invalidateQueries({ queryKey: ["leaderboard", contestId] });
      }
    });
    return unsubscribe;
  }, [contestId, queryClient]);

  useEffect(() => {
    return contestWebSocket.onStatusChange(setConnectionStatus);
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card/30 overflow-hidden h-full min-h-0 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/20">
        <span className="text-sm font-medium text-muted-foreground">Leaderboard</span>
        <ConnectionIndicator status={connectionStatus} />
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No submissions yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground sticky top-0">
                <th className="text-left px-4 py-2 font-medium">#</th>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-right px-4 py-2 font-medium">Points</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isCurrentUser = entry.userId === currentUserId;
                return (
                  <tr
                    key={entry.userId}
                    className={`border-t border-border/50 hover:bg-muted/20 ${
                      isCurrentUser ? "bg-primary/10" : ""
                    }`}
                  >
                    <td className="px-4 py-2 font-mono font-medium">
                      {entry.rank <= 3 ? (
                        <span
                          className={
                            entry.rank === 1
                              ? "text-amber-500"
                              : entry.rank === 2
                                ? "text-slate-400"
                                : "text-amber-700"
                          }
                        >
                          #{entry.rank}
                        </span>
                      ) : (
                        `#${entry.rank}`
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {entry.name}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-primary">(You)</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{entry.totalPoints}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
