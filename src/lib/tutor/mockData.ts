// Sidebar history/friends item shapes. Data now comes from useSessionsAndFriends (real DB).

export interface HistoryItem {
  id: string;
  title: string;
  hintsUsed: number;
  completedAt: string;
  status?: "active" | "completed" | "abandoned";
}

export interface FriendUpdate {
  id: string;
  name: string;
  message: string;
  timeAgo: string;
}
