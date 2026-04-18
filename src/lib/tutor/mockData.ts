// Mock data for sidebar History and Friends. Updates from local state during the session.

export interface HistoryItem {
  id: string;
  title: string;
  hintsUsed: number;
  completedAt: string;
}

export interface FriendUpdate {
  id: string;
  name: string;
  message: string;
  timeAgo: string;
}

export const initialHistory: HistoryItem[] = [
  { id: "h1", title: "Quadratic equations: factoring", hintsUsed: 3, completedAt: "Yesterday" },
  { id: "h2", title: "Newton's second law worksheet", hintsUsed: 5, completedAt: "2 days ago" },
  { id: "h3", title: "Photosynthesis short answer", hintsUsed: 2, completedAt: "Last week" },
];

export const initialFriends: FriendUpdate[] = [
  { id: "f1", name: "Jonas", message: "solved a calculus problem in 2 hints", timeAgo: "5m" },
  { id: "f2", name: "Azul", message: "is on his 5th hint right now, hang in there", timeAgo: "12m" },
  { id: "f3", name: "Maya", message: "mastered the connection game on first try", timeAgo: "32m" },
  { id: "f4", name: "Devin", message: "started a new chemistry session", timeAgo: "1h" },
  { id: "f5", name: "Priya", message: "finally got past the trig identity wall", timeAgo: "2h" },
];
