export type PollRow = {
  id: string;
  event_id: string;
  question: string;
  mode: "single" | "multi";
  created_by: string;
  created_at: string;
  closed_at: string | null;
};

export type PollOptionRow = {
  id: string;
  poll_id: string;
  label: string;
};

export type PollVoteRow = {
  id: string;
  event_id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
};

export type EventRow = {
  id: string;
  creator_id: string;
  title: string;
  type: string;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  description: string | null;
  surprise_mode: boolean;
  cover_image_path: string | null;
  expense_policy: "host_covers_all" | "shared";
  expenses_closed_at: string | null;
};

export type ItemRow = {
  id: string;
  event_id: string;
  title: string;
  notes: string | null;
  claim_mode: "single" | "multi";
  created_by: string;
  created_at?: string;
};

export type ClaimRow = {
  id: string;
  event_item_id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
};

export type InviteRow = {
  id: string;
  event_id?: string;
  email: string;
  accepted: boolean;
  created_at: string;
};

export type FriendRow = {
  id: string;
  friend_email: string;
  friend_name: string | null;
};

export type MemberRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  rsvp: "accepted" | "maybe" | "declined" | null;
};

export type MsgRow = {
  id: string;
  event_id: string;
  sender_id: string;
  visibility: "general" | "secret";
  body: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
};

export type TaskRow = {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  visibility: "public" | "secret";
  status: "todo" | "in_progress" | "done";
  created_by: string;
  created_at: string;
};

export type OrganizerTab = "polls" | "event" | "invite" | "tasks";

export type ExpenseRow = {
  id: string;
  event_id: string;
  created_by: string;
  title: string;
  amount: number;
  note: string | null;
  shared_with_all: boolean;
  created_at: string;
};

export type ExpenseParticipantRow = {
  expense_id: string;
  user_id: string;
};
