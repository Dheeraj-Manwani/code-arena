import type { Contest, ContestWithDates } from "@/schema/contest.schema";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Accepts API contest (date strings) or UI contest (Date). */
export const getContestDuration = (contest: Contest | ContestWithDates): string | undefined => {
  const startTime = contest.startTime ? new Date(contest.startTime as string | Date) : null;
  const endTime = contest.endTime ? new Date(contest.endTime as string | Date) : null;

  if (!startTime || !endTime) {
    return;
  }

  const diff = endTime.getTime() - startTime.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

export const convertHHmmToMilliseconds = (timeString: string): number => {
  const [hours, minutes] = timeString.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return (hours * 60 + minutes) * 60 * 1000;
};