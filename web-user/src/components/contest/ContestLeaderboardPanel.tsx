import { useState, useEffect, useRef } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

/** Dummy leaderboard entry for real-time demo */
interface LeaderboardEntry {
    rank: number;
    name: string;
    totalPoints: number;
    questionsSolved: number;
    /** 1 = moved up, -1 = moved down, 0 = no change */
    rankChange?: number;
}

/** Dummy data - simulates real-time updates by slightly varying points periodically */
const DUMMY_ENTRIES: LeaderboardEntry[] = [
    { rank: 1, name: "Alice", totalPoints: 450, questionsSolved: 3 },
    { rank: 2, name: "Bob", totalPoints: 380, questionsSolved: 3 },
    { rank: 3, name: "Charlie", totalPoints: 320, questionsSolved: 2 },
    { rank: 4, name: "Diana", totalPoints: 250, questionsSolved: 2 },
    { rank: 5, name: "Eve", totalPoints: 180, questionsSolved: 1 },
    { rank: 6, name: "Frank", totalPoints: 100, questionsSolved: 1 },
];

export default function ContestLeaderboardPanel() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>(DUMMY_ENTRIES);
    const prevRankByRef = useRef<Record<string, number>>({});

    useEffect(() => {
        const interval = setInterval(() => {
            setEntries((prev) => {
                const updated = [...prev]
                    .map((e) => ({
                        ...e,
                        totalPoints: Math.max(0, e.totalPoints + (Math.random() > 0.5 ? 5 : -5)),
                    }))
                    .sort((a, b) => b.totalPoints - a.totalPoints)
                    .map((e, i) => {
                        const newRank = i + 1;
                        const oldRank = prevRankByRef.current[e.name] ?? newRank;
                        const rankChange =
                            newRank < oldRank ? 1 : newRank > oldRank ? -1 : 0;
                        return { ...e, rank: newRank, rankChange };
                    });

                prevRankByRef.current = Object.fromEntries(
                    updated.map((e) => [e.name, e.rank])
                );
                return updated;
            });
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="rounded-lg border border-border bg-card/30 overflow-hidden h-full min-h-0 flex flex-col">

            <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-muted/30 text-muted-foreground sticky top-0">
                            <th className="text-left px-4 py-2 font-medium">#</th>
                            <th className="text-left px-4 py-2 font-medium">Name</th>
                            <th className="text-right px-4 py-2 font-medium">Points</th>
                            <th className="text-right px-4 py-2 font-medium">Solved</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry) => (
                            <tr
                                key={entry.name}
                                className="border-t border-border/50 hover:bg-muted/20"
                            >
                                <td className="px-4 py-2 font-mono font-medium">
                                    <span className="inline-flex items-center gap-1">
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
                                    </span>
                                </td>
                                <td className="px-4 py-2">{entry.name}</td>
                                <td className="px-4 py-2 text-right font-mono">{entry.totalPoints}</td>
                                <td className="px-4 py-2 text-right">{entry.questionsSolved}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
