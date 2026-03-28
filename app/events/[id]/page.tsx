"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useIsMobile } from "@/lib/useIsMobile";
import { formatDateRange, formatDateTime } from "@/lib/dateTime";
import PollsCard from "./PollsCard";
import type {
  ClaimRow,
  EventRow,
  ExpenseParticipantRow,
  ExpenseRow,
  FriendRow,
  InviteRow,
  ItemRow,
  MemberRow,
  MsgRow,
  OrganizerTab,
  PollOptionRow,
  PollRow,
  PollVoteRow,
  TaskRow,
} from "./event-types";
const OrganizerToolsPanel = dynamic(() => import("./OrganizerToolsPanel"), {
  ssr: false,
  loading: () => <div style={{ color: "rgba(229,231,235,0.75)", marginTop: 12 }}>Loading organizer tools…</div>,
});

const EVENT_IMAGE_BUCKET = "event-images";

/* ================= PAGE ================= */

// Event detail workspace combining membership, invites, polls, tasks, items, and chat.
// This component is intentionally large because it orchestrates cross-feature state in one place.
export default function EventPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [me, setMe] = useState<{ id: string; email?: string } | null>(null);

  const [event, setEvent] = useState<EventRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [expenseParticipants, setExpenseParticipants] = useState<ExpenseParticipantRow[]>([]);

  // Polls
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [pollOptions, setPollOptions] = useState<PollOptionRow[]>([]);
  const [pollVotes, setPollVotes] = useState<PollVoteRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [expensesStatus, setExpensesStatus] = useState("");

  // Items
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [newItemMode, setNewItemMode] = useState<"single" | "multi">("single");

  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editMode, setEditMode] = useState<"single" | "multi">("single");

  // Invites
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [emailAllStatus, setEmailAllStatus] = useState("");
  const [emailAllSubject, setEmailAllSubject] = useState("");
  const [emailAllMessage, setEmailAllMessage] = useState("");
  const [pendingMyInvites, setPendingMyInvites] = useState(0);

  // Multi-invite selection
  const [selectedFriendIds, setSelectedFriendIds] = useState<Record<string, boolean>>({});
  const [bulkStatus, setBulkStatus] = useState("");

  // Delete event with password
  const [deletePw, setDeletePw] = useState("");
  const [deleteStatus, setDeleteStatus] = useState("");

  // Leave event
  const [leaveStatus, setLeaveStatus] = useState("");
  const [rsvpStatus, setRsvpStatus] = useState("");

  // Chat
  const [chatTab, setChatTab] = useState<"general" | "secret">("general");
  const [organizerTab, setOrganizerTab] = useState<OrganizerTab>("polls");
  const [organizerToolsExpanded, setOrganizerToolsExpanded] = useState(false);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [msgText, setMsgText] = useState("");
  const [chatStatus, setChatStatus] = useState("");

  // Tasks
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskVisibility, setTaskVisibility] = useState<"public" | "secret">("public");
  const [taskStatus, setTaskStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [taskStatusMsg, setTaskStatusMsg] = useState("");
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskAssigneeId, setEditTaskAssigneeId] = useState("");
  const [editTaskVisibility, setEditTaskVisibility] = useState<"public" | "secret">("public");
  const [editTaskStatus, setEditTaskStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [expensesExpanded, setExpensesExpanded] = useState(false);
  const [peopleExpanded, setPeopleExpanded] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseShareAll, setExpenseShareAll] = useState(true);
  const [selectedExpenseParticipantIds, setSelectedExpenseParticipantIds] = useState<Record<string, boolean>>({});
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const [editExpenseName, setEditExpenseName] = useState("");
  const [editExpenseAmount, setEditExpenseAmount] = useState("");
  const [editExpenseNote, setEditExpenseNote] = useState("");
  const [editExpenseShareAll, setEditExpenseShareAll] = useState(true);
  const [editExpenseParticipantIds, setEditExpenseParticipantIds] = useState<Record<string, boolean>>({});

  /* ================= HELPERS ================= */

  // Derived permission flags used across the page to avoid repeating role checks in JSX.
  const isCreator = me?.id === event?.creator_id;
  const hideClaims = !!event?.surprise_mode && !!isCreator;
  const isBirthday = event?.type === "birthday";
  const inviteLink =
    typeof window !== "undefined" ? `${window.location.origin}/join/${eventId}` : `/join/${eventId}`;
  const coverImageUrl = useMemo(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !event?.cover_image_path) return "";
    return supabase.storage.from(EVENT_IMAGE_BUCKET).getPublicUrl(event.cover_image_path).data.publicUrl;
  }, [event?.cover_image_path]);

  // Secret tasks are visible only to the event creator and the explicit assignee.
  // This keeps surprise/sensitive prep work private while preserving collaboration.
  function canViewTask(task: TaskRow) {
    if (task.visibility === "public") return true;
    if (isCreator) return true;
    if (task.assignee_id && task.assignee_id === me?.id) return true;
    return false;
  }

  // Status changes are allowed for both creator and assignee because completion progress
  // is usually updated by the person doing the work.
  function canChangeTaskStatus(task: TaskRow) {
    return !!isCreator || (!!task.assignee_id && task.assignee_id === me?.id);
  }

  // Build a lookup map once per claims change so rendering each item is O(1).
  // Without this memoization each render would repeatedly filter the full claims array.
  const claimsByItem = useMemo(() => {
    const map = new Map<string, ClaimRow[]>();
    for (const c of claims) {
      const arr = map.get(c.event_item_id) ?? [];
      arr.push(c);
      map.set(c.event_item_id, arr);
    }
    return map;
  }, [claims]);

  // Prefer profile full name, then email, then a short id fallback so every row
  // always has a stable human-readable label.
  function displayNameByUser(userId: string, fullName: string | null, email?: string | null) {
    const name = (fullName ?? "").trim();
    if (name) return name;
    const em = (email ?? "").trim();
    if (em) return em;
    return userId.slice(0, 6);
  }

  // Convert checkbox-like selection state into actual friend rows for bulk invite UX.
  const selectedFriends = useMemo(() => {
    const ids = Object.keys(selectedFriendIds).filter((k) => selectedFriendIds[k]);
    return friends.filter((f) => ids.includes(f.id));
  }, [selectedFriendIds, friends]);

  const myMember = useMemo(() => {
    if (!me) return null;
    return members.find((m) => m.user_id === me.id) ?? null;
  }, [members, me]);

  const compactPeopleRows = useMemo(() => {
    const rows: Array<{
      key: string;
      label: string;
      meta: string;
      status: "Confirmed";
    }> = [];

    for (const m of members) {
      if (m.rsvp && m.rsvp !== "accepted") continue;
      rows.push({
        key: `member-${m.user_id}`,
        label: displayNameByUser(m.user_id, m.full_name, m.email),
        meta: [m.email, m.user_id === event?.creator_id ? "creator" : "", m.user_id === me?.id ? "you" : ""]
          .filter(Boolean)
          .join(" • "),
        status: "Confirmed",
      });
    }

    return rows.sort((a, b) => a.label.localeCompare(b.label));
  }, [members, event?.creator_id, me?.id]);

  const confirmedMembers = useMemo(() => {
    return members.filter((m) => !m.rsvp || m.rsvp === "accepted");
  }, [members]);

  const expenseParticipantOptions = useMemo(() => {
    return confirmedMembers
      .map((m) => ({
        user_id: m.user_id,
        label: displayNameByUser(m.user_id, m.full_name, m.email),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [confirmedMembers]);

  const expenseParticipantsByExpense = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of expenseParticipants) {
      const rows = map.get(p.expense_id) ?? [];
      rows.push(p.user_id);
      map.set(p.expense_id, rows);
    }
    return map;
  }, [expenseParticipants]);

  const expenseSettlement = useMemo(() => {
    const netByUser = new Map<string, number>();
    for (const member of confirmedMembers) netByUser.set(member.user_id, 0);

    for (const exp of expenses) {
      const participants = exp.shared_with_all
        ? confirmedMembers.map((m) => m.user_id)
        : expenseParticipantsByExpense.get(exp.id) ?? [];
      if (participants.length === 0) continue;
      const amount = Number(exp.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const share = amount / participants.length;
      netByUser.set(exp.created_by, (netByUser.get(exp.created_by) ?? 0) + amount);
      for (const uid of participants) {
        netByUser.set(uid, (netByUser.get(uid) ?? 0) - share);
      }
    }

    const creditors = Array.from(netByUser.entries())
      .filter(([, net]) => net > 0.009)
      .map(([user_id, amount]) => ({ user_id, amount }));
    const debtors = Array.from(netByUser.entries())
      .filter(([, net]) => net < -0.009)
      .map(([user_id, amount]) => ({ user_id, amount: Math.abs(amount) }));

    const transfers: Array<{ from: string; to: string; amount: number }> = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const settled = Math.min(debtor.amount, creditor.amount);
      if (settled > 0.009) {
        transfers.push({ from: debtor.user_id, to: creditor.user_id, amount: settled });
      }
      debtor.amount -= settled;
      creditor.amount -= settled;
      if (debtor.amount <= 0.009) i += 1;
      if (creditor.amount <= 0.009) j += 1;
    }

    return {
      balances: Array.from(netByUser.entries()).map(([user_id, net]) => ({ user_id, net })),
      transfers,
    };
  }, [confirmedMembers, expenses, expenseParticipantsByExpense]);

  // Resets bulk selection after a successful invite operation.
  function clearSelected() {
    setSelectedFriendIds({});
  }

  // Normalizes a list of selected ids into a dictionary for constant-time lookups in UI.
  function setSelectedFriendIdsFromSelect(selectedIds: string[]) {
    setSelectedFriendIds(
      selectedIds.reduce<Record<string, boolean>>((acc, id) => {
        acc[id] = true;
        return acc;
      }, {})
    );
  }

  /* ================= LOAD ALL ================= */

  // Central data loader for the entire screen.
  // It fetches user/session first, then all event-related resources in a deterministic order.
  async function loadAll(opts?: { background?: boolean }) {
    if (!opts?.background) setLoading(true);
    setStatus("");
    setInviteStatus("");
    setBulkStatus("");
    setEmailAllStatus("");
    setDeleteStatus("");
    setLeaveStatus("");
    setRsvpStatus("");
    setChatStatus("");
    setTaskStatusMsg("");
    setExpensesStatus("");

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      router.replace("/login");
      return;
    }
    const user = sess.session.user;
    setMe({ id: user.id, email: user.email ?? "" });

    // Event
    const ev = await supabase.from("events").select("*").eq("id", eventId).single();
    if (ev.error) {
      setStatus(`❌ ${ev.error.message}`);
      setLoading(false);
      return;
    }
    setEvent(ev.data as EventRow);

    // Items
    const it = await supabase
      .from("event_items")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (it.error) {
      setStatus(`❌ ${it.error.message}`);
      setLoading(false);
      return;
    }
    setItems((it.data ?? []) as ItemRow[]);

    // Claims
    const cl = await supabase
      .from("item_claims")
      .select("id,event_item_id,user_id,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (cl.error) {
      setStatus(`❌ ${cl.error.message}`);
      setLoading(false);
      return;
    }

    const rawClaims = (cl.data ?? []) as { id: string; event_item_id: string; user_id: string }[];
    const claimUserIds = [...new Set(rawClaims.map((c) => c.user_id))];

    const claimProfilesMap = new Map<string, { full_name: string | null; email: string | null }>();

    if (claimUserIds.length > 0) {
      const pr = await supabase.from("profiles").select("id, full_name, email").in("id", claimUserIds);
      if (!pr.error) {
        (pr.data ?? []).forEach((p: any) => {
          if (p?.id) claimProfilesMap.set(p.id, { full_name: p.full_name ?? null, email: p.email ?? null });
        });
      }
    }

    setClaims(
      rawClaims.map((c) => {
        const prof = claimProfilesMap.get(c.user_id);
        return {
          id: c.id,
          event_item_id: c.event_item_id,
          user_id: c.user_id,
          full_name: prof?.full_name ?? null,
          email: prof?.email ?? null,
        };
      })
    );

    // Invites
    const inv = await supabase
      .from("event_invites")
      .select("id,event_id,email,accepted,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    setInvites((inv.data ?? []) as InviteRow[]);

    const myInv = await supabase
      .from("event_invites")
      .select("id", { count: "exact", head: true })
      .eq("accepted", false)
      .eq("email", (user.email ?? "").toLowerCase());
    setPendingMyInvites(myInv.count ?? 0);

    // Friends
    const fr = await supabase.from("friends").select("id,friend_email,friend_name").order("created_at", { ascending: false });

    const frList = (fr.data ?? []) as FriendRow[];
    setFriends(frList);

    setSelectedFriendIds((prev) => {
      const allowed = new Set(frList.map((f) => f.id));
      const next: Record<string, boolean> = {};
      for (const k of Object.keys(prev)) if (allowed.has(k) && prev[k]) next[k] = true;
      return next;
    });

    // Members list
    const mem = await supabase.from("event_members").select("user_id,rsvp").eq("event_id", eventId);
    const memberRows = (mem.data ?? []) as Array<{ user_id: string; rsvp: "accepted" | "maybe" | "declined" | null }>;
    const memberIds = memberRows.map((m) => m.user_id);

    const memberProfilesMap = new Map<string, { full_name: string | null; email: string | null }>();
    if (memberIds.length > 0) {
      const pr2 = await supabase.from("profiles").select("id, full_name, email").in("id", memberIds);
      if (!pr2.error) {
        (pr2.data ?? []).forEach((p: any) => {
          if (p?.id) memberProfilesMap.set(p.id, { full_name: p.full_name ?? null, email: p.email ?? null });
        });
      }
    }

    setMembers(
      memberRows.map((member) => {
        const uid = member.user_id;
        const prof = memberProfilesMap.get(uid);
        return {
          user_id: uid,
          full_name: prof?.full_name ?? null,
          email: uid === user.id ? user.email ?? prof?.email ?? null : prof?.email ?? null,
          rsvp: member.rsvp ?? "accepted",
        };
      })
    );

    const exp = await supabase
      .from("event_expenses")
      .select("id,event_id,created_by,title,amount,note,shared_with_all,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    if (exp.error) {
      setExpenses([]);
      setExpensesStatus(`❌ ${exp.error.message}`);
    } else {
      setExpenses((exp.data ?? []) as ExpenseRow[]);
    }

    const expIds = (exp.data ?? []).map((row: any) => row.id);
    if (expIds.length > 0) {
      const expParticipants = await supabase
        .from("event_expense_participants")
        .select("expense_id,user_id")
        .in("expense_id", expIds);
      if (expParticipants.error) {
        setExpenseParticipants([]);
        setExpensesStatus(`❌ ${expParticipants.error.message}`);
      } else {
        setExpenseParticipants((expParticipants.data ?? []) as ExpenseParticipantRow[]);
      }
    } else {
      setExpenseParticipants([]);
    }

    // ===== POLLS (inside loadAll) =====
    const p = await supabase
      .from("event_polls")
      .select("id,event_id,question,mode,created_by,created_at,closed_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (p.error) {
      setStatus(`❌ ${p.error.message}`);
      setPolls([]);
      setPollOptions([]);
      setPollVotes([]);
    } else {
      setPolls((p.data ?? []) as any);

      const pollIds = (p.data ?? []).map((x: any) => x.id);

      if (pollIds.length === 0) {
        setPollOptions([]);
        setPollVotes([]);
      } else {
        const o = await supabase
          .from("event_poll_options")
          .select("id,poll_id,label,created_at")
          .in("poll_id", pollIds)
          .order("created_at", { ascending: true });

        setPollOptions((o.data ?? []) as any);

        const v = await supabase
          .from("event_poll_votes")
          .select("id,event_id,poll_id,option_id,user_id,created_at")
          .eq("event_id", eventId);

        setPollVotes((v.data ?? []) as any);
      }
    }

    // Chat messages for current tab
    await loadMessages(chatTab);

    // Tasks
    const t = await supabase
      .from("event_tasks")
      .select("id,event_id,title,description,assignee_id,visibility,status,created_by,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (t.error) {
      setTaskStatusMsg(`❌ ${t.error.message}`);
      setTasks([]);
    } else {
      setTasks((t.data ?? []) as TaskRow[]);
    }

    if (!opts?.background) setLoading(false);
  }

  // Loads chat messages per visibility channel and enriches them with sender profile data
  // so the UI can show names instead of raw ids.
  async function loadMessages(tab: "general" | "secret") {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const msg = await supabase
      .from("event_messages")
      .select("id,event_id,sender_id,visibility,body,created_at")
      .eq("event_id", eventId)
      .eq("visibility", tab)
      .order("created_at", { ascending: true });

    const raw = (msg.data ?? []) as any[];
    const ids = [...new Set(raw.map((m) => m.sender_id))];

    const profilesMap = new Map<string, { full_name: string | null; email: string | null }>();
    if (ids.length > 0) {
      const pr = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      if (!pr.error) {
        (pr.data ?? []).forEach((p: any) => {
          if (p?.id) profilesMap.set(p.id, { full_name: p.full_name ?? null, email: p.email ?? null });
        });
      }
    }

    setMessages(
      raw.map((m) => {
        const prof = profilesMap.get(m.sender_id);
        return {
          ...m,
          full_name: prof?.full_name ?? null,
          email: prof?.email ?? null,
        };
      }) as MsgRow[]
    );
  }

  useEffect(() => {
    loadAll().catch((e: any) => {
      setStatus(`❌ ${e?.message ?? "Unknown error"}`);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !me?.email) return;

    const eventChannel = supabase
      .channel(`event-live-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_members", filter: `event_id=eq.${eventId}` }, () => {
        loadAll({ background: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "item_claims", filter: `event_id=eq.${eventId}` }, () => {
        loadAll({ background: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_items", filter: `event_id=eq.${eventId}` }, () => {
        loadAll({ background: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_tasks", filter: `event_id=eq.${eventId}` }, () => {
        loadAll({ background: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_polls", filter: `event_id=eq.${eventId}` }, () => {
        loadAll({ background: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_poll_options" }, () => {
        loadAll({ background: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_poll_votes", filter: `event_id=eq.${eventId}` }, () => {
        loadAll({ background: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_messages", filter: `event_id=eq.${eventId}` }, () => {
        loadMessages(chatTab);
      })
      .subscribe();

    const inviteChannel = supabase
      .channel(`event-invites-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_invites", filter: `event_id=eq.${eventId}` }, () => {
        loadAll({ background: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_invites", filter: `email=eq.${me.email.toLowerCase()}` }, () => {
        loadAll({ background: true });
      })
      .subscribe();

    const fallbackPoll = window.setInterval(() => {
      loadAll({ background: true });
    }, 20000);

    return () => {
      window.clearInterval(fallbackPoll);
      supabase.removeChannel(eventChannel);
      supabase.removeChannel(inviteChannel);
    };
  }, [eventId, me?.email, chatTab]);

  /* ================= ACTIONS: ITEMS ================= */

  // Creates a new gift/task item proposed by the current member.
  // Validation runs client-side first to reduce unnecessary round-trips.
  async function addItem() {
    setStatus("");
    const title = newItemTitle.trim();
    if (!title || !me) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const res = await supabase.from("event_items").insert({
      event_id: eventId,
      title,
      notes: newItemNotes.trim() ? newItemNotes.trim() : null,
      claim_mode: newItemMode,
      created_by: me.id,
    });

    if (res.error) {
      setStatus(`❌ ${res.error.message}`);
      return;
    }

    setNewItemTitle("");
    setNewItemNotes("");
    setNewItemMode("single");
    setStatus("✅ Item added");
    await loadAll({ background: true });
  }

  // Enters inline edit mode by copying the current item fields into dedicated edit state.
  function startEdit(it: ItemRow) {
    setEditItemId(it.id);
    setEditTitle(it.title);
    setEditNotes(it.notes ?? "");
    setEditMode(it.claim_mode);
    setStatus("");
  }

  // Exits edit mode and leaves persisted data untouched.
  function cancelEdit() {
    setEditItemId(null);
    setEditTitle("");
    setEditNotes("");
    setEditMode("single");
  }

  // Persists item edits and then refreshes all data so related aggregates stay consistent.
  async function saveEdit() {
    if (!editItemId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const res = await supabase
      .from("event_items")
      .update({
        title: editTitle.trim(),
        notes: editNotes.trim() ? editNotes.trim() : null,
        claim_mode: editMode,
      })
      .eq("id", editItemId)
      .eq("event_id", eventId);

    if (res.error) {
      setStatus(`❌ ${res.error.message}`);
      return;
    }

    setStatus("✅ Item updated");
    cancelEdit();
    await loadAll({ background: true });
  }

  // Permanently removes an item. This is destructive and therefore handled explicitly.
  async function deleteItem(itemId: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const res = await supabase.from("event_items").delete().eq("id", itemId).eq("event_id", eventId);
    if (res.error) {
      setStatus(`❌ ${res.error.message}`);
      return;
    }

    setStatus("✅ Item deleted");
    await loadAll({ background: true });
  }

  // Claims an item for the current user, respecting single vs multi-claim server constraints.
  async function claim(itemId: string) {
    setStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !me) return;

    const res = await supabase.from("item_claims").insert({
      event_id: eventId,
      event_item_id: itemId,
      user_id: me.id,
    });

    if (res.error) {
      setStatus(`❌ ${res.error.message}`);
      return;
    }

    setStatus("✅ Claimed");
    await loadAll({ background: true });
  }

  // Removes the current user claim from an item (undo action).
  async function unclaim(itemId: string) {
    setStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !me) return;

    const res = await supabase
      .from("item_claims")
      .delete()
      .eq("event_id", eventId)
      .eq("event_item_id", itemId)
      .eq("user_id", me.id);

    if (res.error) {
      setStatus(`❌ ${res.error.message}`);
      return;
    }

    setStatus("✅ Unclaimed");
    await loadAll({ background: true });
  }

  /* ================= ACTIONS: INVITES ================= */

  // Shared invite helper used by both single-email invite and bulk friend invite flows.
  async function sendInvite(email: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { ok: false, message: "No supabase client" };

    const clean = email.trim().toLowerCase();
    if (!clean.includes("@")) return { ok: false, message: `Invalid email: ${email}` };

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user) return { ok: false, message: "Not logged in" };

    const res = await supabase.from("event_invites").insert({
      event_id: eventId,
      email: clean,
      invited_by: user.id,
    });

    if (res.error) {
      const msg = res.error.message.toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) return { ok: true, message: `Already invited: ${clean}` };
      return { ok: false, message: res.error.message };
    }

    return { ok: true, message: `Invited: ${clean}` };
  }

  // Validates and sends one typed email invite from the input box.
  async function sendSingleInvite() {
    setInviteStatus("");
    setBulkStatus("");

    const clean = inviteEmail.trim();
    if (!clean) {
      setInviteStatus("❌ Enter an email or choose a friend");
      return;
    }

    setInviteStatus("Sending…");
    const result = await sendInvite(clean);

    if (!result.ok) {
      setInviteStatus(`❌ ${result.message}`);
      return;
    }

    setInviteEmail("");
    setInviteStatus("✅ Invite created");
    await loadAll({ background: true });
  }

  // Sends many invites sequentially and keeps granular error reporting for each email.
  async function inviteSelectedFriends() {
    setInviteStatus("");
    setBulkStatus("");

    if (selectedFriends.length === 0) {
      setBulkStatus("❌ Select at least one friend");
      return;
    }

    setBulkStatus("Inviting selected…");

    const okMsgs: string[] = [];
    const badMsgs: string[] = [];

    for (const f of selectedFriends) {
      const r = await sendInvite(f.friend_email);
      if (r.ok) okMsgs.push(r.message);
      else badMsgs.push(`${f.friend_email}: ${r.message}`);
    }

    if (badMsgs.length === 0) {
      setBulkStatus(`✅ Invited ${okMsgs.length} friend(s)`);
      clearSelected();
    } else {
      setBulkStatus(`⚠️ Invited ${okMsgs.length}, failed ${badMsgs.length}: ${badMsgs.join(" | ")}`);
    }

    await loadAll({ background: true });
  }

  // Revokes a pending invite. Accepted invites are guarded by backend policies.
  function buildEmailChangeTemplate() {
    if (!event) return "";

    const when = event.starts_at ? formatDateRange(event.starts_at, event.ends_at) : "Time will be shared soon.";

    return [
      `Hello,`,
      "",
      `There is an important update for ${event.title}.`,
      "The event date/time has been changed.",
      `New schedule: ${when}`,
      event.location ? `Location: ${event.location}` : null,
      "",
      "Please check the event page for the latest details.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function fillChangedDateTemplate() {
    if (!event) return;

    setEmailAllSubject(`Updated event schedule: ${event.title}`);
    setEmailAllMessage(buildEmailChangeTemplate());
    setEmailAllStatus("");
  }

  async function emailAllInvitedUsers() {
    if (!event) return;

    setEmailAllStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setEmailAllStatus("❌ Supabase not ready");
      return;
    }

    const recipientEmails = Array.from(new Set(invites.map((inv) => inv.email.trim().toLowerCase()).filter(Boolean)));
    if (recipientEmails.length === 0) {
      setEmailAllStatus("❌ No invited users to email");
      return;
    }

    setEmailAllStatus("Sending email…");

    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;
      if (!token) {
        setEmailAllStatus("❌ Please sign in again before sending emails");
        return;
      }
      const response = await fetch("/api/events/email-invited-users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eventId,
          eventTitle: event.title,
          eventType: event.type,
          startsAt: event.starts_at,
          endsAt: event.ends_at,
          location: event.location,
          description: event.description,
          inviteLink,
          recipientEmails,
          subject: emailAllSubject.trim() || undefined,
          message: emailAllMessage.trim() || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; sent?: number } | null;
      if (!response.ok) {
        setEmailAllStatus(`❌ ${payload?.error ?? "Failed to send email"}`);
        return;
      }

      setEmailAllStatus(`✅ Email sent to ${payload?.sent ?? recipientEmails.length} invited user(s)`);
    } catch (error) {
      setEmailAllStatus(`❌ ${error instanceof Error ? error.message : "Failed to send email"}`);
    }
  }

  async function uninvite(inviteId: string) {
    setInviteStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const res = await supabase.rpc("creator_uninvite", { eid: eventId, invite_id: inviteId });
    if (res.error) {
      setInviteStatus(`❌ ${res.error.message}`);
      return;
    }

    setInviteStatus("✅ Uninvited and removed from event");
    await loadAll({ background: true });
  }

  /* ================= LEAVE EVENT ================= */

  // Current user exits membership using RPC so related membership/invite state is cleaned atomically.
  async function leaveEvent() {
    setLeaveStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setLeaveStatus("Leaving…");
    const res = await supabase.rpc("leave_event_keep_invite", { eid: eventId });
    if (res.error) {
      setLeaveStatus(`❌ ${res.error.message}`);
      return;
    }

    setLeaveStatus("✅ Left event. Invite kept so you can rejoin from Invites.");
    router.push("/invites");
  }

  async function updateMyRsvp(nextRsvp: "accepted" | "maybe" | "declined") {
    if (!me) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setRsvpStatus("Updating RSVP…");
    const res = await supabase
      .from("event_members")
      .update({ rsvp: nextRsvp })
      .eq("event_id", eventId)
      .eq("user_id", me.id);

    if (res.error) {
      setRsvpStatus(`❌ ${res.error.message}`);
      return;
    }
    setRsvpStatus("✅ RSVP updated");
    await loadAll({ background: true });
  }

  async function addExpense() {
    if (!me || !event) return;
    if (event.expenses_closed_at) {
      setExpensesStatus("❌ Expenses are closed. Ask host to reopen.");
      return;
    }

    const name = expenseName.trim();
    const amount = Number(expenseAmount);
    if (!name) {
      setExpensesStatus("❌ Expense name is required");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setExpensesStatus("❌ Amount must be greater than 0");
      return;
    }

    const selectedIds = expenseShareAll
      ? confirmedMembers.map((m) => m.user_id)
      : Object.keys(selectedExpenseParticipantIds).filter((id) => selectedExpenseParticipantIds[id]);
    if (selectedIds.length === 0) {
      setExpensesStatus("❌ Select at least one attendee to share with");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setExpensesStatus("Saving expense…");
    const created = await supabase
      .from("event_expenses")
      .insert({
        event_id: eventId,
        created_by: me.id,
        title: name,
        amount,
        note: expenseNote.trim() ? expenseNote.trim() : null,
        shared_with_all: expenseShareAll,
      })
      .select("id")
      .single();
    if (created.error) {
      setExpensesStatus(`❌ ${created.error.message}`);
      return;
    }

    if (!expenseShareAll) {
      const participantsInsert = await supabase.from("event_expense_participants").insert(
        selectedIds.map((uid) => ({
          expense_id: created.data.id,
          user_id: uid,
        }))
      );
      if (participantsInsert.error) {
        setExpensesStatus(`❌ ${participantsInsert.error.message}`);
        return;
      }
    }

    setExpenseName("");
    setExpenseAmount("");
    setExpenseNote("");
    setExpenseShareAll(true);
    setSelectedExpenseParticipantIds({});
    setExpensesStatus("✅ Expense added");
    await loadAll({ background: true });
  }

  async function toggleExpensesClosed(nextClosed: boolean) {
    if (!isCreator || !event) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setExpensesStatus(nextClosed ? "Closing expenses…" : "Reopening expenses…");
    const res = await supabase
      .from("events")
      .update({ expenses_closed_at: nextClosed ? new Date().toISOString() : null })
      .eq("id", eventId);
    if (res.error) {
      setExpensesStatus(`❌ ${res.error.message}`);
      return;
    }
    setExpensesStatus(nextClosed ? "✅ Expenses closed and settlement ready." : "✅ Expenses reopened.");
    await loadAll({ background: true });
  }

  function startExpenseEdit(expense: ExpenseRow) {
    setEditExpenseId(expense.id);
    setEditExpenseName(expense.title);
    setEditExpenseAmount(String(Number(expense.amount)));
    setEditExpenseNote(expense.note ?? "");
    setEditExpenseShareAll(expense.shared_with_all);
    const selected = (expenseParticipantsByExpense.get(expense.id) ?? []).reduce<Record<string, boolean>>((acc, uid) => {
      acc[uid] = true;
      return acc;
    }, {});
    setEditExpenseParticipantIds(selected);
    setExpensesStatus("");
  }

  function cancelExpenseEdit() {
    setEditExpenseId(null);
    setEditExpenseName("");
    setEditExpenseAmount("");
    setEditExpenseNote("");
    setEditExpenseShareAll(true);
    setEditExpenseParticipantIds({});
  }

  async function saveExpenseEdit() {
    if (!editExpenseId || !me || !event) return;
    if (event.expenses_closed_at) {
      setExpensesStatus("❌ Reopen expenses first to edit.");
      return;
    }
    const name = editExpenseName.trim();
    const amount = Number(editExpenseAmount);
    if (!name) {
      setExpensesStatus("❌ Expense name is required");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setExpensesStatus("❌ Amount must be greater than 0");
      return;
    }
    const selectedIds = editExpenseShareAll
      ? confirmedMembers.map((m) => m.user_id)
      : Object.keys(editExpenseParticipantIds).filter((id) => editExpenseParticipantIds[id]);
    if (!editExpenseShareAll && selectedIds.length === 0) {
      setExpensesStatus("❌ Select at least one attendee to share with");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setExpensesStatus("Updating expense…");
    const updateRes = await supabase
      .from("event_expenses")
      .update({
        title: name,
        amount,
        note: editExpenseNote.trim() ? editExpenseNote.trim() : null,
        shared_with_all: editExpenseShareAll,
      })
      .eq("id", editExpenseId);
    if (updateRes.error) {
      setExpensesStatus(`❌ ${updateRes.error.message}`);
      return;
    }

    const clearParticipants = await supabase.from("event_expense_participants").delete().eq("expense_id", editExpenseId);
    if (clearParticipants.error) {
      setExpensesStatus(`❌ ${clearParticipants.error.message}`);
      return;
    }

    if (!editExpenseShareAll) {
      const insertParticipants = await supabase.from("event_expense_participants").insert(
        selectedIds.map((uid) => ({
          expense_id: editExpenseId,
          user_id: uid,
        }))
      );
      if (insertParticipants.error) {
        setExpensesStatus(`❌ ${insertParticipants.error.message}`);
        return;
      }
    }

    setExpensesStatus("✅ Expense updated");
    cancelExpenseEdit();
    await loadAll({ background: true });
  }

  async function deleteExpense(expenseId: string) {
    if (!event) return;
    if (event.expenses_closed_at) {
      setExpensesStatus("❌ Reopen expenses first to delete.");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setExpensesStatus("Deleting expense…");
    const res = await supabase.from("event_expenses").delete().eq("id", expenseId);
    if (res.error) {
      setExpensesStatus(`❌ ${res.error.message}`);
      return;
    }
    if (editExpenseId === expenseId) cancelExpenseEdit();
    setExpensesStatus("✅ Expense deleted");
    await loadAll({ background: true });
  }

  /* ================= DELETE EVENT (creator + password required) ================= */

  // Extra safety for destructive delete: re-auth with password before removing the event.
  async function deleteEventWithPassword() {
    if (!event || !me?.email) return;

    const pw = deletePw.trim();
    if (!pw) {
      setDeleteStatus("❌ Enter your password");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setDeleteStatus("Re-authenticating…");

    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: me.email!,
      password: pw,
    });

    if (reauthErr) {
      setDeleteStatus(`❌ ${reauthErr.message}`);
      return;
    }

    setDeleteStatus("Deleting event…");
    const del = await supabase.from("events").delete().eq("id", eventId);

    if (del.error) {
      setDeleteStatus(`❌ ${del.error.message}`);
      return;
    }

    setDeleteStatus("✅ Deleted");
    router.push("/events");
  }

  /* ================= CHAT ================= */

  // Changes active chat channel and immediately loads the matching message history.
  async function switchTab(tab: "general" | "secret") {
    setChatTab(tab);
    await loadMessages(tab);
  }

  // Posts a new chat message in the currently selected visibility channel.
  async function sendMessage() {
    setChatStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !me) return;

    const body = msgText.trim();
    if (!body) return;

    setChatStatus("Sending…");
    const res = await supabase.from("event_messages").insert({
      event_id: eventId,
      sender_id: me.id,
      visibility: chatTab,
      body,
    });

    if (res.error) {
      setChatStatus(`❌ ${res.error.message}`);
      return;
    }

    setMsgText("");
    setChatStatus("✅ Sent");
    await loadMessages(chatTab);
  }

  /* ================= TASKS ================= */

  // Creates planning tasks that can be public or secret and optionally assigned to a member.
  async function createTask() {
    if (!me || !isCreator) return;
    setTaskStatusMsg("");

    const title = taskTitle.trim();
    if (!title) {
      setTaskStatusMsg("❌ Task title is required");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const res = await supabase.from("event_tasks").insert({
      event_id: eventId,
      title,
      description: taskDescription.trim() ? taskDescription.trim() : null,
      assignee_id: taskAssigneeId || null,
      visibility: taskVisibility,
      status: taskStatus,
      created_by: me.id,
    });

    if (res.error) {
      setTaskStatusMsg(`❌ ${res.error.message}`);
      return;
    }

    setTaskTitle("");
    setTaskDescription("");
    setTaskAssigneeId("");
    setTaskVisibility("public");
    setTaskStatus("todo");
    setTaskStatusMsg("✅ Task created");
    await loadAll({ background: true });
  }

  // Opens task edit mode with a snapshot of current values.
  function startTaskEdit(task: TaskRow) {
    setEditTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description ?? "");
    setEditTaskAssigneeId(task.assignee_id ?? "");
    setEditTaskVisibility(task.visibility);
    setEditTaskStatus(task.status);
    setTaskStatusMsg("");
  }

  // Closes task editing state without persisting pending form changes.
  function cancelTaskEdit() {
    setEditTaskId(null);
    setEditTaskTitle("");
    setEditTaskDescription("");
    setEditTaskAssigneeId("");
    setEditTaskVisibility("public");
    setEditTaskStatus("todo");
  }

  // Saves task field updates. Only creators can execute this path (guarded in UI and policies).
  async function saveTaskEdit() {
    if (!editTaskId || !isCreator) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const res = await supabase
      .from("event_tasks")
      .update({
        title: editTaskTitle.trim(),
        description: editTaskDescription.trim() ? editTaskDescription.trim() : null,
        assignee_id: editTaskAssigneeId || null,
        visibility: editTaskVisibility,
        status: editTaskStatus,
      })
      .eq("id", editTaskId)
      .eq("event_id", eventId);

    if (res.error) {
      setTaskStatusMsg(`❌ ${res.error.message}`);
      return;
    }

    setTaskStatusMsg("✅ Task updated");
    cancelTaskEdit();
    await loadAll({ background: true });
  }

  // Removes a task entirely from the event plan.
  async function deleteTask(taskId: string) {
    if (!isCreator) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const res = await supabase.from("event_tasks").delete().eq("id", taskId).eq("event_id", eventId);
    if (res.error) {
      setTaskStatusMsg(`❌ ${res.error.message}`);
      return;
    }

    setTaskStatusMsg("✅ Task deleted");
    await loadAll();
  }

  // Lightweight status-only update, intentionally separated from full edit for fast progress tracking.
  async function updateTaskStatus(task: TaskRow, status: TaskRow["status"]) {
    if (!canChangeTaskStatus(task)) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const res = await supabase.from("event_tasks").update({ status }).eq("id", task.id).eq("event_id", eventId);
    if (res.error) {
      setTaskStatusMsg(`❌ ${res.error.message}`);
      return;
    }

    setTaskStatusMsg("✅ Task status updated");
    await loadAll({ background: true });
  }

  /* ================= UI ================= */

  // First paint guard: show a lightweight shell while all parallel data requests resolve.
  if (loading)
    return (
      <div style={{ ...pageStyle, padding: isMobile ? 16 : 24 }}>
        <Card>
          <p>Loading…</p>
        </Card>
      </div>
    );

  // If event lookup failed (deleted/unauthorized), render a friendly fallback card.
  if (!event) {
    return (
      <div style={{ ...pageStyle, padding: isMobile ? 16 : 24 }}>
        <Card>
          <Link href="/events" style={linkStyle}>
            ← Back
          </Link>
          <h2 style={{ marginTop: 10 }}>Event not found</h2>
          {status && <p style={{ color: "#fca5a5" }}>{status}</p>}
        </Card>
      </div>
    );
  }

  // ✅ AUTO-FIT grids already collapse to 1 column on mobile, so no manual isMobile override needed
  const topLayoutStyle = topLayout;
  const twoColumnLayoutStyle = twoColumnLayout;

  // Main page layout: gradient background + centered max-width container for readability.
  return (
    <div style={{ ...pageStyle, padding: isMobile ? 16 : 24 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 1600, // change to "100%" for true edge-to-edge
          margin: "0 auto",
          color: "#e5e7eb",
          fontFamily: "system-ui",
        }}
      >
        <Link href="/events" style={linkStyle}>
          ← Back to events
        </Link>

        <div style={mainSectionStackStyle}>
          {/* Top area: event metadata plus creator-only destructive controls. */}
          <div style={topLayoutStyle}>
            {/* Event summary card: title, schedule, location, quick navigation links. */}
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <h1 style={{ margin: 0 }}>{event.title}</h1>
                <div style={{ color: "rgba(229,231,235,0.75)", marginTop: 6 }}>
                  <b>{event.type}</b> {event.surprise_mode ? "• 🎁 surprise mode" : ""}
                </div>
                {event.starts_at && (
                  <div style={{ marginTop: 6 }}>
                    🗓 {formatDateTime(event.starts_at)}
                    {event.ends_at ? ` — ${formatDateTime(event.ends_at)}` : ""}
                  </div>
                )}
                {event.location && <div style={{ marginTop: 6 }}>📍 {event.location}</div>}
              </div>

              <div style={{ fontSize: 13, color: "rgba(229,231,235,0.75)" }}>
                {me?.email ? (
                  <>
                    Signed in as <b>{me.email}</b>
                  </>
                ) : null}
                <div style={{ marginTop: 6 }}>
                  <Link href="/profile" style={navLink}>
                    Profile
                  </Link>{" "}
                  <Link href="/invites" style={navLink}>
                    Invites{pendingMyInvites > 0 ? ` (${pendingMyInvites}) 🔔` : ""}
                  </Link>
                </div>
              </div>

              {coverImageUrl && (
                <div style={eventCoverWrapStyle}>
                  <img src={coverImageUrl} alt={`${event.title} cover`} style={eventCoverStyle} />
                </div>
              )}
              </div>

              {event.description && <p style={{ marginTop: 12, color: "rgba(229,231,235,0.85)" }}>{event.description}</p>}
            </Card>
          </div>

        {isCreator && (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>Organizer tools</h2>
              <button onClick={() => setOrganizerToolsExpanded((s) => !s)} style={btnGhostSmall}>
                {organizerToolsExpanded ? "Minimize" : "Expand"}
              </button>
            </div>

            {organizerToolsExpanded && me && (
              <OrganizerToolsPanel
                eventId={eventId}
                event={event}
                meId={me.id}
                isCreator={!!isCreator}
                members={members}
                polls={polls}
                pollOptions={pollOptions}
                pollVotes={pollVotes}
                invites={invites}
                friends={friends}
                tasks={tasks}
                selectedFriends={selectedFriends}
                organizerTab={organizerTab}
                setOrganizerTab={setOrganizerTab}
                deletePw={deletePw}
                setDeletePw={setDeletePw}
                deleteStatus={deleteStatus}
                deleteEventWithPassword={deleteEventWithPassword}
                inviteLink={inviteLink}
                inviteEmail={inviteEmail}
                setInviteEmail={setInviteEmail}
                inviteStatus={inviteStatus}
                sendSingleInvite={sendSingleInvite}
                setSelectedFriendIdsFromSelect={setSelectedFriendIdsFromSelect}
                inviteSelectedFriends={inviteSelectedFriends}
                clearSelected={clearSelected}
                bulkStatus={bulkStatus}
                emailAllSubject={emailAllSubject}
                setEmailAllSubject={setEmailAllSubject}
                emailAllMessage={emailAllMessage}
                setEmailAllMessage={setEmailAllMessage}
                fillChangedDateTemplate={fillChangedDateTemplate}
                emailAllInvitedUsers={emailAllInvitedUsers}
                emailAllStatus={emailAllStatus}
                uninvite={uninvite}
                taskTitle={taskTitle}
                setTaskTitle={setTaskTitle}
                taskDescription={taskDescription}
                setTaskDescription={setTaskDescription}
                taskAssigneeId={taskAssigneeId}
                setTaskAssigneeId={setTaskAssigneeId}
                taskVisibility={taskVisibility}
                setTaskVisibility={setTaskVisibility}
                taskStatus={taskStatus}
                setTaskStatus={setTaskStatus}
                createTask={createTask}
                canViewTask={canViewTask}
                editTaskId={editTaskId}
                editTaskTitle={editTaskTitle}
                setEditTaskTitle={setEditTaskTitle}
                editTaskDescription={editTaskDescription}
                setEditTaskDescription={setEditTaskDescription}
                editTaskAssigneeId={editTaskAssigneeId}
                setEditTaskAssigneeId={setEditTaskAssigneeId}
                editTaskVisibility={editTaskVisibility}
                setEditTaskVisibility={setEditTaskVisibility}
                editTaskStatus={editTaskStatus}
                setEditTaskStatus={setEditTaskStatus}
                saveTaskEdit={saveTaskEdit}
                cancelTaskEdit={cancelTaskEdit}
                startTaskEdit={startTaskEdit}
                deleteTask={deleteTask}
                displayNameByUser={displayNameByUser}
                loadAll={loadAll}
                btnPrimary={btnPrimary}
                btnGhost={btnGhost}
                btnDanger={btnDanger}
                btnDangerSmall={btnDangerSmall}
                rowStyle={rowStyle}
                cardInsetStyle={cardInsetStyle}
                inputStyle={inputStyle}
                navLink={navLink}
                statusBoxStyle={statusBoxStyle}
                primaryBtnStyle={primaryBtnStyle}
              />
            )}
          </Card>
        )}

        {/* ✅ AUTO-FIT grid: becomes 1 col on mobile, 2/3/4 on bigger screens */}
        <div style={twoColumnLayoutStyle}>
          <div style={columnStack}>
            <PeoplePanel
              rows={compactPeopleRows}
              isCreator={!!isCreator}
              onLeave={leaveEvent}
              leaveStatus={leaveStatus}
              myRsvp={myMember?.rsvp ?? "accepted"}
              onRsvpChange={updateMyRsvp}
              rsvpStatus={rsvpStatus}
              expanded={peopleExpanded}
              onToggleExpanded={() => setPeopleExpanded((v) => !v)}
            />

          </div>

          {/* Collaboration tools column: polls for decisions + tasks for execution planning. */}
          <div style={columnStack}>
            {/* Poll widget requires authenticated user id for vote ownership checks. */}
            {me && (
              <PollsCard
                eventId={eventId}
                meId={me.id}
                isCreator={!!isCreator}
                eventMemberCount={members.length}
                polls={polls}
                options={pollOptions}
                votes={pollVotes}
                onReload={loadAll}
                title="Active polls"
                showCreatePoll={false}
                showManagementActions={false}
                activeOnly
              />
            )}

            {/* Active task list for quick status visibility on the main page. */}
            <Card>
              <h2 style={{ marginTop: 0 }}>Active tasks</h2>

              {taskStatusMsg && <div style={statusBoxStyle(taskStatusMsg.startsWith("✅"))}>{taskStatusMsg}</div>}

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {tasks.filter((task) => canViewTask(task) && task.status !== "done").length === 0 ? (
                  <div style={{ color: "rgba(229,231,235,0.75)" }}>No active tasks.</div>
                ) : (
                  tasks
                    .filter((task) => canViewTask(task) && task.status !== "done")
                    .map((task) => {
                    const assignee = task.assignee_id ? members.find((m) => m.user_id === task.assignee_id) : null;

                    return (
                      <div
                        key={task.id}
                        style={{
                          ...rowStyle,
                          flexDirection: isMobile ? "column" : "row",
                          alignItems: isMobile ? "flex-start" : "center",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <b style={{ fontSize: 16 }}>{task.title}</b>
                            <span style={pillStyle(taskStatusColor(task.status))}>
                              {task.status.replace("_", " ").toUpperCase()}
                            </span>
                            <span style={pillStyle(task.visibility === "secret" ? "#fca5a5" : "#93c5fd")}>
                              {task.visibility.toUpperCase()}
                            </span>
                          </div>
                          {task.description && (
                            <div style={{ marginTop: 6, color: "rgba(229,231,235,0.8)" }}>{task.description}</div>
                          )}
                          <div style={{ marginTop: 6, color: "rgba(229,231,235,0.7)", fontSize: 13 }}>
                            {assignee
                              ? `Assigned to ${displayNameByUser(assignee.user_id, assignee.full_name, null)}`
                              : "Unassigned"}
                          </div>
                        </div>

                        <div
                          style={{
                            ...itemActionRow,
                            flexDirection: isMobile ? "column" : "row",
                            alignItems: isMobile ? "stretch" : "center",
                          }}
                        >
                          <select
                            value={task.status}
                            onChange={(e) => updateTaskStatus(task, e.target.value as TaskRow["status"])}
                            disabled={!canChangeTaskStatus(task)}
                            style={inputStyle}
                          >
                            <option value="todo">To do</option>
                            <option value="in_progress">In progress</option>
                            <option value="done">Done</option>
                          </select>
                        </div>
                      </div>
                    );
                    })
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Shared items board where members can claim responsibilities or contributions. */}
        <Card>
          <h2 style={{ marginTop: 0 }}>Items</h2>

          <div style={{ display: "grid", gap: 10 }}>
            <input
              placeholder="Item name (e.g. Beer, Burgers, Plates)"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Notes (optional)"
              value={newItemNotes}
              onChange={(e) => setNewItemNotes(e.target.value)}
              style={inputStyle}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <select value={newItemMode} onChange={(e) => setNewItemMode(e.target.value as any)} style={inputStyle}>
                <option value="single">Single claim</option>
                <option value="multi">Multi claim</option>
              </select>

              <button onClick={addItem} disabled={!newItemTitle.trim()} style={primaryBtnStyle(!newItemTitle.trim())}>
                + Add item
              </button>
            </div>

            {status && <div style={statusBoxStyle(status.startsWith("✅"))}>{status}</div>}
          </div>

          <hr style={hrStyle} />

          {items.length === 0 ? (
            <p style={{ color: "rgba(229,231,235,0.75)" }}>No items yet. Add the first one above.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {items.map((it) => {
                const cs = claimsByItem.get(it.id) ?? [];
                const iClaimed = !!me && cs.some((c) => c.user_id === me.id);
                const canEdit = !!me && (it.created_by === me.id || isCreator);

                const claimText = hideClaims
                  ? "🎁 Surprise mode: creator can’t see claims"
                  : cs.length === 0
                  ? "Not claimed yet"
                  : it.claim_mode === "single"
                  ? `Claimed by ${displayNameByUser(cs[0].user_id, cs[0].full_name, cs[0].email)}`
                  : `Claimed by ${cs.map((c) => displayNameByUser(c.user_id, c.full_name, c.email)).join(", ")}`;

                const editing = editItemId === it.id;

                return (
                  <div key={it.id} style={itemRowStyle}>
                    <div style={{ flex: 1 }}>
                      {editing ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={inputStyle} />
                          <input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} style={inputStyle} />
                          <select value={editMode} onChange={(e) => setEditMode(e.target.value as any)} style={inputStyle}>
                            <option value="single">Single claim</option>
                            <option value="multi">Multi claim</option>
                          </select>

                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button style={btnPrimary} onClick={saveEdit}>
                              Save
                            </button>
                            <button style={btnGhost} onClick={cancelEdit}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <b style={{ fontSize: 16 }}>{it.title}</b>
                            <span style={pillStyle(it.claim_mode === "multi" ? "#34d399" : "#60a5fa")}>
                              {it.claim_mode.toUpperCase()}
                            </span>
                            {canEdit ? (
                              <span style={{ fontSize: 12, color: "rgba(229,231,235,0.7)" }}>(you can edit)</span>
                            ) : null}
                          </div>

                          {it.notes && <div style={{ marginTop: 6, color: "rgba(229,231,235,0.75)" }}>{it.notes}</div>}

                          <div style={{ marginTop: 8, color: "rgba(229,231,235,0.82)", fontSize: 13 }}>{claimText}</div>
                        </>
                      )}
                    </div>

                    {!editing && (
                      <div
                        style={{
                          ...itemActionRow,
                          flexDirection: isMobile ? "column" : "row",
                          alignItems: isMobile ? "stretch" : "center",
                        }}
                      >
                        {!iClaimed ? (
                          <button onClick={() => claim(it.id)} style={smallBtnStyle}>
                            Claim
                          </button>
                        ) : (
                          <button onClick={() => unclaim(it.id)} style={smallBtnDangerStyle}>
                            Unclaim
                          </button>
                        )}

                        {canEdit && (
                          <>
                            <button onClick={() => startEdit(it)} style={btnGhostSmall}>
                              Edit
                            </button>
                            <button onClick={() => deleteItem(it.id)} style={btnDangerSmall}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <ExpensesPanel
          expanded={expensesExpanded}
          onToggleExpanded={() => setExpensesExpanded((v) => !v)}
          event={event}
          meId={me?.id ?? null}
          isCreator={!!isCreator}
          members={members}
          expenses={expenses}
          participantsByExpense={expenseParticipantsByExpense}
          settlement={expenseSettlement.transfers}
          balances={expenseSettlement.balances}
          expenseName={expenseName}
          setExpenseName={setExpenseName}
          expenseAmount={expenseAmount}
          setExpenseAmount={setExpenseAmount}
          expenseNote={expenseNote}
          setExpenseNote={setExpenseNote}
          expenseShareAll={expenseShareAll}
          setExpenseShareAll={setExpenseShareAll}
          selectedParticipantIds={selectedExpenseParticipantIds}
          setSelectedParticipantIds={setSelectedExpenseParticipantIds}
          participantOptions={expenseParticipantOptions}
          displayNameByUser={displayNameByUser}
          addExpense={addExpense}
          toggleExpensesClosed={toggleExpensesClosed}
          editExpenseId={editExpenseId}
          editExpenseName={editExpenseName}
          setEditExpenseName={setEditExpenseName}
          editExpenseAmount={editExpenseAmount}
          setEditExpenseAmount={setEditExpenseAmount}
          editExpenseNote={editExpenseNote}
          setEditExpenseNote={setEditExpenseNote}
          editExpenseShareAll={editExpenseShareAll}
          setEditExpenseShareAll={setEditExpenseShareAll}
          editExpenseParticipantIds={editExpenseParticipantIds}
          setEditExpenseParticipantIds={setEditExpenseParticipantIds}
          startExpenseEdit={startExpenseEdit}
          cancelExpenseEdit={cancelExpenseEdit}
          saveExpenseEdit={saveExpenseEdit}
          deleteExpense={deleteExpense}
          status={expensesStatus}
        />

        {/* Chat panel: channelized discussion (general + optional birthday secret channel). */}
        {/* Rendering keeps message history above composer so latest context is always visible. */}
        <Card>
          <h2 style={{ marginTop: 0 }}>Chat</h2>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => switchTab("general")} style={chatTab === "general" ? btnPrimary : btnGhost}>
              General
            </button>

            {isBirthday && (
              <button onClick={() => switchTab("secret")} style={chatTab === "secret" ? btnPrimary : btnGhost}>
                Secret (creator can’t read)
              </button>
            )}
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div style={chatBox}>
              {messages.length === 0 ? (
                <div style={{ color: "rgba(229,231,235,0.7)" }}>No messages yet.</div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 13, color: "rgba(229,231,235,0.75)" }}>
                      <b>{displayNameByUser(m.sender_id, m.full_name, m.email)}</b> •{" "}
                      {formatDateTime(m.created_at)}
                    </div>
                    <div style={{ marginTop: 3 }}>{m.body}</div>
                  </div>
                ))
              )}
            </div>

            <textarea
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder="Write a message…"
              style={{ ...inputStyle, minHeight: 90 }}
            />

            <button style={btnPrimary} onClick={sendMessage}>
              Send
            </button>

            {chatStatus && <div style={statusBoxStyle(chatStatus.startsWith("✅"))}>{chatStatus}</div>}
          </div>
        </Card>
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

// Shared card wrapper keeps visual rhythm and reduces repeated style declarations across sections.
function PeoplePanel({
  rows,
  isCreator,
  onLeave,
  leaveStatus,
  myRsvp,
  onRsvpChange,
  rsvpStatus,
  expanded,
  onToggleExpanded,
}: {
  rows: Array<{ key: string; label: string; meta: string; status: "Confirmed" }>;
  isCreator: boolean;
  onLeave: () => void;
  leaveStatus: string;
  myRsvp: "accepted" | "maybe" | "declined" | null;
  onRsvpChange: (next: "accepted" | "maybe" | "declined") => void;
  rsvpStatus: string;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>People arriving ({rows.length})</h2>
        <button onClick={onToggleExpanded} style={btnGhostSmall}>
          {expanded ? "Minimize" : "Expand"}
        </button>
      </div>

      {expanded && <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        {rows.length === 0 ? (
          <div style={{ color: "rgba(229,231,235,0.75)" }}>No people yet.</div>
        ) : (
          <div style={peopleListStyle}>
            {rows.map((p) => (
              <div key={p.key} style={compactPersonRowStyle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.label}
                  </div>
                  {p.meta && <div style={{ fontSize: 11, color: "rgba(229,231,235,0.65)", marginTop: 2 }}>{p.meta}</div>}
                </div>
                <span style={compactStatusStyle(p.status)}>{p.status}</span>
              </div>
            ))}
          </div>
        )}

        {!isCreator && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 13, color: "rgba(229,231,235,0.75)", marginBottom: 6 }}>Your RSVP</div>
            <select
              value={myRsvp ?? "accepted"}
              onChange={(e) => onRsvpChange(e.target.value as "accepted" | "maybe" | "declined")}
              style={inputStyle}
            >
              <option value="accepted">Accepted (I am coming)</option>
              <option value="maybe">Maybe</option>
              <option value="declined">Declined</option>
            </select>
            {rsvpStatus && <div style={statusBoxStyle(rsvpStatus.startsWith("✅"))}>{rsvpStatus}</div>}
            <button onClick={onLeave} style={btnDanger}>
              Leave event
            </button>
            {leaveStatus && <div style={statusBoxStyle(leaveStatus.startsWith("✅"))}>{leaveStatus}</div>}
          </div>
        )}
      </div>}
    </Card>
  );
}

function ExpensesPanel({
  expanded,
  onToggleExpanded,
  event,
  meId,
  isCreator,
  members,
  expenses,
  participantsByExpense,
  settlement,
  balances,
  expenseName,
  setExpenseName,
  expenseAmount,
  setExpenseAmount,
  expenseNote,
  setExpenseNote,
  expenseShareAll,
  setExpenseShareAll,
  selectedParticipantIds,
  setSelectedParticipantIds,
  participantOptions,
  displayNameByUser,
  addExpense,
  toggleExpensesClosed,
  editExpenseId,
  editExpenseName,
  setEditExpenseName,
  editExpenseAmount,
  setEditExpenseAmount,
  editExpenseNote,
  setEditExpenseNote,
  editExpenseShareAll,
  setEditExpenseShareAll,
  editExpenseParticipantIds,
  setEditExpenseParticipantIds,
  startExpenseEdit,
  cancelExpenseEdit,
  saveExpenseEdit,
  deleteExpense,
  status,
}: {
  expanded: boolean;
  onToggleExpanded: () => void;
  event: EventRow;
  meId: string | null;
  isCreator: boolean;
  members: MemberRow[];
  expenses: ExpenseRow[];
  participantsByExpense: Map<string, string[]>;
  settlement: Array<{ from: string; to: string; amount: number }>;
  balances: Array<{ user_id: string; net: number }>;
  expenseName: string;
  setExpenseName: (value: string) => void;
  expenseAmount: string;
  setExpenseAmount: (value: string) => void;
  expenseNote: string;
  setExpenseNote: (value: string) => void;
  expenseShareAll: boolean;
  setExpenseShareAll: (value: boolean) => void;
  selectedParticipantIds: Record<string, boolean>;
  setSelectedParticipantIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  participantOptions: Array<{ user_id: string; label: string }>;
  displayNameByUser: (userId: string, fullName: string | null, email?: string | null) => string;
  addExpense: () => Promise<void>;
  toggleExpensesClosed: (nextClosed: boolean) => Promise<void>;
  editExpenseId: string | null;
  editExpenseName: string;
  setEditExpenseName: (value: string) => void;
  editExpenseAmount: string;
  setEditExpenseAmount: (value: string) => void;
  editExpenseNote: string;
  setEditExpenseNote: (value: string) => void;
  editExpenseShareAll: boolean;
  setEditExpenseShareAll: (value: boolean) => void;
  editExpenseParticipantIds: Record<string, boolean>;
  setEditExpenseParticipantIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  startExpenseEdit: (expense: ExpenseRow) => void;
  cancelExpenseEdit: () => void;
  saveExpenseEdit: () => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  status: string;
}) {
  const isClosed = !!event.expenses_closed_at;
  const host = members.find((m) => m.user_id === event.creator_id);
  const hostLabel = displayNameByUser(event.creator_id, host?.full_name ?? null, host?.email ?? null);
  const isHostCoversAll = event.expense_policy === "host_covers_all";

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>Expenses</h2>
        <button onClick={onToggleExpanded} style={btnGhostSmall}>
          {expanded ? "Minimize" : "Expand"}
        </button>
      </div>

      {expanded && (
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {isHostCoversAll ? (
            <div style={statusBoxStyle(true)}>{`Host ${hostLabel} is covering all expenses. Just come and enjoy.`}</div>
          ) : (
            <>
              {!isClosed && (
                <div style={{ display: "grid", gap: 8 }}>
                  <input
                    value={expenseName}
                    onChange={(e) => setExpenseName(e.target.value)}
                    placeholder="Expense name"
                    style={inputStyle}
                  />
                  <input
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="Amount (EUR)"
                    type="number"
                    min="0"
                    step="0.01"
                    style={inputStyle}
                  />
                  <input
                    value={expenseNote}
                    onChange={(e) => setExpenseNote(e.target.value)}
                    placeholder="Note (optional)"
                    style={inputStyle}
                  />

                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={expenseShareAll}
                      onChange={(e) => setExpenseShareAll(e.target.checked)}
                    />
                    Share with whole group
                  </label>

                  {!expenseShareAll && (
                    <div style={peopleListStyle}>
                      {participantOptions.map((opt) => (
                        <label key={opt.user_id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={!!selectedParticipantIds[opt.user_id]}
                            onChange={(e) =>
                              setSelectedParticipantIds((prev) => ({ ...prev, [opt.user_id]: e.target.checked }))
                            }
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  )}

                  <button onClick={addExpense} style={btnPrimary}>
                    Add expense
                  </button>
                </div>
              )}

              {isClosed && (
                <div style={statusBoxStyle(true)}>
                  Expense list is closed. Balances are calculated automatically.
                </div>
              )}
            </>
          )}

          {isCreator && !isHostCoversAll && (
            <button onClick={() => toggleExpensesClosed(!isClosed)} style={isClosed ? btnGhost : btnPrimary}>
              {isClosed ? "Reopen expenses" : "Close expenses"}
            </button>
          )}

          {status && <div style={statusBoxStyle(status.startsWith("✅"))}>{status}</div>}

          {expenses.length > 0 && (
            <div style={{ display: "grid", gap: 8 }}>
              {expenses.map((exp) => {
                const payer = members.find((m) => m.user_id === exp.created_by);
                const payerName = displayNameByUser(exp.created_by, payer?.full_name ?? null, payer?.email ?? null);
                const canManage = meId === exp.created_by || isCreator;
                const isEditing = editExpenseId === exp.id;
                const sharedWith = exp.shared_with_all
                  ? "whole group"
                  : (participantsByExpense.get(exp.id) ?? [])
                      .map((uid) => {
                        const person = members.find((m) => m.user_id === uid);
                        return displayNameByUser(uid, person?.full_name ?? null, person?.email ?? null);
                      })
                      .join(", ");
                return (
                  <div key={exp.id} style={rowStyle}>
                    <div style={{ flex: 1 }}>
                      {isEditing ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          <input value={editExpenseName} onChange={(e) => setEditExpenseName(e.target.value)} style={inputStyle} />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editExpenseAmount}
                            onChange={(e) => setEditExpenseAmount(e.target.value)}
                            style={inputStyle}
                          />
                          <input value={editExpenseNote} onChange={(e) => setEditExpenseNote(e.target.value)} style={inputStyle} />
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                            <input
                              type="checkbox"
                              checked={editExpenseShareAll}
                              onChange={(e) => setEditExpenseShareAll(e.target.checked)}
                            />
                            Share with whole group
                          </label>
                          {!editExpenseShareAll && (
                            <div style={peopleListStyle}>
                              {participantOptions.map((opt) => (
                                <label key={opt.user_id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                                  <input
                                    type="checkbox"
                                    checked={!!editExpenseParticipantIds[opt.user_id]}
                                    onChange={(e) =>
                                      setEditExpenseParticipantIds((prev) => ({ ...prev, [opt.user_id]: e.target.checked }))
                                    }
                                  />
                                  {opt.label}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div style={{ fontWeight: 700 }}>{exp.title}</div>
                          <div style={{ fontSize: 13, color: "rgba(229,231,235,0.75)" }}>
                            {payerName} paid €{Number(exp.amount).toFixed(2)} • shared with {sharedWith || "nobody"}
                          </div>
                          {exp.note && <div style={{ marginTop: 4, fontSize: 13 }}>{exp.note}</div>}
                        </>
                      )}
                    </div>
                    <div style={{ ...itemActionRow, alignItems: "center" }}>
                      {meId === exp.created_by && <span style={pillStyle("#60a5fa")}>You paid</span>}
                      {canManage && !isClosed && (
                        <>
                          {isEditing ? (
                            <>
                              <button onClick={saveExpenseEdit} style={btnPrimary}>
                                Save
                              </button>
                              <button onClick={cancelExpenseEdit} style={btnGhostSmall}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button onClick={() => startExpenseEdit(exp)} style={btnGhostSmall}>
                              Edit
                            </button>
                          )}
                          <button onClick={() => deleteExpense(exp.id)} style={btnDangerSmall}>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isClosed && !isHostCoversAll && (
            <div style={{ display: "grid", gap: 8 }}>
              <h3 style={{ margin: "4px 0" }}>Who owes whom</h3>
              {settlement.length === 0 ? (
                <div style={{ color: "rgba(229,231,235,0.75)" }}>Everyone is settled up.</div>
              ) : (
                settlement.map((t, idx) => {
                  const from = members.find((m) => m.user_id === t.from);
                  const to = members.find((m) => m.user_id === t.to);
                  const fromName = displayNameByUser(t.from, from?.full_name ?? null, from?.email ?? null);
                  const toName = displayNameByUser(t.to, to?.full_name ?? null, to?.email ?? null);
                  return (
                    <div key={`${t.from}-${t.to}-${idx}`} style={rowStyle}>
                      {fromName} → {toName}: <b>€{t.amount.toFixed(2)}</b>
                    </div>
                  );
                })
              )}

              <h3 style={{ margin: "6px 0 0" }}>Net balance</h3>
              {balances
                .slice()
                .sort((a, b) => b.net - a.net)
                .map((b) => {
                  const p = members.find((m) => m.user_id === b.user_id);
                  const label = displayNameByUser(b.user_id, p?.full_name ?? null, p?.email ?? null);
                  return (
                    <div key={b.user_id} style={rowStyle}>
                      <span>{label}</span>
                      <span style={{ color: b.net >= 0 ? "#86efac" : "#fca5a5" }}>
                        {b.net >= 0 ? "+" : ""}€{b.net.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 18,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      {children}
    </div>
  );
}

// Page-level backdrop and spacing tokens for this screen.
const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #0b1020 0%, #0f172a 60%, #111827 100%)",
  padding: 24,
};

// Compact inline links used in the account/navigation area of the header.
const navLink: React.CSSProperties = { color: "#93c5fd", textDecoration: "none", marginRight: 10 };
// Generic link style for primary back-navigation anchors.
const linkStyle: React.CSSProperties = { color: "#93c5fd", textDecoration: "none", fontFamily: "system-ui" };

// Shared input foundation for text/select/textarea controls to keep forms visually consistent.
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(17,24,39,0.65)",
  color: "#e5e7eb",
  outline: "none",
};

const hrStyle: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid rgba(255,255,255,0.12)",
  margin: "16px 0",
};

const itemRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  padding: 12,
  borderRadius: 14,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const itemActionRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: 12,
  borderRadius: 14,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
};

/**
 * ✅ UPDATED: auto-fit grid
 * - mobile: 1 column
 * - medium: 2 columns
 * - wide: 3+ columns (as space allows)
 */
// Responsive top grid for summary + danger zone cards.
const topLayout: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
  alignItems: "start",
};

/**
 * ✅ UPDATED: auto-fit grid for the main content columns
 * (the section that used to be exactly 2 columns)
 */
// Responsive main content grid for the rest of the event tools.
const twoColumnLayout: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  alignItems: "start",
};

const mainSectionStackStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  marginTop: 16,
};

// Vertical stack used inside each main grid column.
const columnStack: React.CSSProperties = {
  display: "grid",
  gap: 16,
};

const peopleListStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  marginTop: 6,
  maxHeight: 360,
  overflowY: "auto",
  paddingRight: 2,
};

const compactPersonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  padding: "8px 10px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
};

// Scrollable chat transcript container with bounded height so input controls stay visible.
const chatBox: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.18)",
  padding: 12,
  minHeight: 220,
  maxHeight: 320,
  overflowY: "auto",
};

// Tiny style helpers centralize color tokens so status badges remain consistent app-wide.
function pillStyle(color: string): React.CSSProperties {
  return {
    fontSize: 12,
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    color,
    background: "rgba(0,0,0,0.15)",
  };
}

// Maps semantic task states to accessible, high-contrast label colors.
function taskStatusColor(status: TaskRow["status"]) {
  switch (status) {
    case "done":
      return "#34d399";
    case "in_progress":
      return "#fbbf24";
    case "todo":
    default:
      return "#60a5fa";
  }
}

// Primary button style with explicit disabled affordance to communicate non-clickable state.
function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: disabled ? "rgba(148,163,184,0.25)" : "linear-gradient(90deg,#60a5fa,#a78bfa)",
    color: "#0b1020",
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

const btnPrimary: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
  color: "#0b1020",
  fontWeight: 900,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "#e5e7eb",
  fontWeight: 900,
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(248,113,113,0.18)",
  color: "#fecaca",
  fontWeight: 900,
  cursor: "pointer",
  marginTop: 10,
};

const btnGhostSmall: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "#e5e7eb",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 12,
};

const btnDangerSmall: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(248,113,113,0.18)",
  color: "#fecaca",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 12,
};

const smallBtnStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(96,165,250,0.16)",
  color: "#bfdbfe",
  cursor: "pointer",
  fontWeight: 700,
};

const smallBtnDangerStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(248,113,113,0.16)",
  color: "#fecaca",
  cursor: "pointer",
  fontWeight: 700,
};

// Shared status message style for success/error feedback blocks.
function statusBoxStyle(ok: boolean): React.CSSProperties {
  return {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: ok ? "#86efac" : "#fca5a5",
  };
}

const cardInsetStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 14,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
};


const eventCoverWrapStyle: React.CSSProperties = {
  width: 320,
  maxWidth: "100%",
  flexShrink: 0,
};

const eventCoverStyle: React.CSSProperties = {
  width: "100%",
  height: 210,
  objectFit: "cover",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
};

function compactStatusStyle(status: "Confirmed"): React.CSSProperties {
  const color = "#86efac";
  return {
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    color,
    background: "rgba(0,0,0,0.15)",
    whiteSpace: "nowrap",
  };
}
