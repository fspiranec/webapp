"use client";

import Link from "next/link";
import PollsCard from "./PollsCard";
import { formatDateTime } from "@/lib/dateTime";
import type {
  FriendRow,
  InviteRow,
  MemberRow,
  OrganizerTab,
  PollOptionRow,
  PollRow,
  PollVoteRow,
  TaskRow,
} from "./event-types";

type Props = {
  eventId: string;
  event: { id: string; title: string };
  meId: string;
  isCreator: boolean;
  members: MemberRow[];
  polls: PollRow[];
  pollOptions: PollOptionRow[];
  pollVotes: PollVoteRow[];
  invites: InviteRow[];
  friends: FriendRow[];
  tasks: TaskRow[];
  selectedFriends: FriendRow[];
  organizerTab: OrganizerTab;
  setOrganizerTab: (tab: OrganizerTab) => void;
  deletePw: string;
  setDeletePw: (value: string) => void;
  deleteStatus: string;
  deleteEventWithPassword: () => Promise<void>;
  inviteLink: string;
  inviteEmail: string;
  setInviteEmail: (value: string) => void;
  inviteStatus: string;
  sendSingleInvite: () => Promise<void>;
  setSelectedFriendIdsFromSelect: (ids: string[]) => void;
  inviteSelectedFriends: () => Promise<void>;
  clearSelected: () => void;
  bulkStatus: string;
  emailAllSubject: string;
  setEmailAllSubject: (value: string) => void;
  emailAllMessage: string;
  setEmailAllMessage: (value: string) => void;
  fillChangedDateTemplate: () => void;
  emailAllInvitedUsers: () => Promise<void>;
  emailAllStatus: string;
  uninvite: (inviteId: string) => Promise<void>;
  taskTitle: string;
  setTaskTitle: (value: string) => void;
  taskDescription: string;
  setTaskDescription: (value: string) => void;
  taskAssigneeId: string;
  setTaskAssigneeId: (value: string) => void;
  taskVisibility: "public" | "secret";
  setTaskVisibility: (value: "public" | "secret") => void;
  taskStatus: "todo" | "in_progress" | "done";
  setTaskStatus: (value: "todo" | "in_progress" | "done") => void;
  createTask: () => Promise<void>;
  canViewTask: (task: TaskRow) => boolean;
  editTaskId: string | null;
  editTaskTitle: string;
  setEditTaskTitle: (value: string) => void;
  editTaskDescription: string;
  setEditTaskDescription: (value: string) => void;
  editTaskAssigneeId: string;
  setEditTaskAssigneeId: (value: string) => void;
  editTaskVisibility: "public" | "secret";
  setEditTaskVisibility: (value: "public" | "secret") => void;
  editTaskStatus: "todo" | "in_progress" | "done";
  setEditTaskStatus: (value: "todo" | "in_progress" | "done") => void;
  saveTaskEdit: () => Promise<void>;
  cancelTaskEdit: () => void;
  startTaskEdit: (task: TaskRow) => void;
  deleteTask: (taskId: string) => Promise<void>;
  displayNameByUser: (userId: string, fullName: string | null, email: string | null) => string;
  loadAll: () => Promise<void>;
  btnPrimary: React.CSSProperties;
  btnGhost: React.CSSProperties;
  btnDanger: React.CSSProperties;
  btnDangerSmall: React.CSSProperties;
  rowStyle: React.CSSProperties;
  cardInsetStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  navLink: React.CSSProperties;
  statusBoxStyle: (ok: boolean) => React.CSSProperties;
  primaryBtnStyle: (disabled: boolean) => React.CSSProperties;
};

export default function OrganizerToolsPanel(props: Props) {
  const {
    eventId,
    event,
    meId,
    isCreator,
    members,
    polls,
    pollOptions,
    pollVotes,
    invites,
    friends,
    tasks,
    selectedFriends,
    organizerTab,
    setOrganizerTab,
    deletePw,
    setDeletePw,
    deleteStatus,
    deleteEventWithPassword,
    inviteLink,
    inviteEmail,
    setInviteEmail,
    inviteStatus,
    sendSingleInvite,
    setSelectedFriendIdsFromSelect,
    inviteSelectedFriends,
    clearSelected,
    bulkStatus,
    emailAllSubject,
    setEmailAllSubject,
    emailAllMessage,
    setEmailAllMessage,
    fillChangedDateTemplate,
    emailAllInvitedUsers,
    emailAllStatus,
    uninvite,
    taskTitle,
    setTaskTitle,
    taskDescription,
    setTaskDescription,
    taskAssigneeId,
    setTaskAssigneeId,
    taskVisibility,
    setTaskVisibility,
    taskStatus,
    setTaskStatus,
    createTask,
    canViewTask,
    editTaskId,
    editTaskTitle,
    setEditTaskTitle,
    editTaskDescription,
    setEditTaskDescription,
    editTaskAssigneeId,
    setEditTaskAssigneeId,
    editTaskVisibility,
    setEditTaskVisibility,
    editTaskStatus,
    setEditTaskStatus,
    saveTaskEdit,
    cancelTaskEdit,
    startTaskEdit,
    deleteTask,
    displayNameByUser,
    loadAll,
    btnPrimary,
    btnGhost,
    btnDanger,
    btnDangerSmall,
    rowStyle,
    cardInsetStyle,
    inputStyle,
    navLink,
    statusBoxStyle,
    primaryBtnStyle,
  } = props;

  return (
    <>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: "rgba(229,231,235,0.75)", marginBottom: 8, fontWeight: 800 }}>Planning</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => setOrganizerTab("polls")} style={organizerTab === "polls" ? btnPrimary : btnGhost}>
            Polls
          </button>
          <button onClick={() => setOrganizerTab("tasks")} style={organizerTab === "tasks" ? btnPrimary : btnGhost}>
            Tasks
          </button>
          <button onClick={() => setOrganizerTab("invite")} style={organizerTab === "invite" ? btnPrimary : btnGhost}>
            Invite guests
          </button>
        </div>
        <div style={{ fontSize: 12, color: "rgba(229,231,235,0.75)", margin: "12px 0 8px", fontWeight: 800 }}>Settings</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => setOrganizerTab("event")} style={organizerTab === "event" ? btnPrimary : btnGhost}>
            Event details
          </button>
        </div>
      </div>

      {organizerTab === "polls" && (
        <div style={{ marginTop: 12 }}>
          <PollsCard
            eventId={eventId}
            meId={meId}
            isCreator={isCreator}
            eventMemberCount={members.length}
            polls={polls}
            options={pollOptions}
            votes={pollVotes}
            onReload={loadAll}
            title="Manage polls"
          />
        </div>
      )}

      {organizerTab === "event" && (
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <Link href={`/events/${event.id}/edit`} style={{ ...btnGhost, textDecoration: "none", display: "inline-block", textAlign: "center" }}>
            Edit event
          </Link>
          <details style={{ ...cardInsetStyle, border: "1px solid rgba(252,165,165,0.3)" }}>
            <summary style={{ cursor: "pointer", color: "#fecaca", fontWeight: 900 }}>Danger zone: Delete event</summary>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <p style={{ color: "rgba(229,231,235,0.75)", margin: 0 }}>
                Delete event permanently (requires your password).
              </p>
              <input
                type="password"
                value={deletePw}
                onChange={(e) => setDeletePw(e.target.value)}
                placeholder="Your password"
                style={inputStyle}
              />
              <button onClick={deleteEventWithPassword} style={btnDanger}>
                Delete event permanently
              </button>
              {deleteStatus && <div style={statusBoxStyle(deleteStatus.startsWith("✅"))}>{deleteStatus}</div>}
            </div>
          </details>
        </div>
      )}

      {organizerTab === "invite" && (
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Invitation link</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input value={inviteLink} readOnly style={inputStyle} />
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteLink);
                }}
                style={btnGhost}
              >
                Copy link
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Invite multiple friends</div>
            {friends.length === 0 ? (
              <div style={{ color: "rgba(229,231,235,0.75)" }}>
                No friends yet. Add them in{" "}
                <Link href="/profile" style={navLink}>
                  /profile
                </Link>
                .
              </div>
            ) : (
              <select
                multiple
                value={selectedFriends.map((f) => f.id)}
                onChange={(e) => {
                  const ids = Array.from(e.target.selectedOptions)
                    .map((opt) => opt.value)
                    .filter(Boolean);
                  setSelectedFriendIdsFromSelect(ids);
                }}
                style={{ ...inputStyle, minHeight: 140 }}
              >
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.friend_name ? `${f.friend_name} — ${f.friend_email}` : f.friend_email}
                  </option>
                ))}
              </select>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button onClick={inviteSelectedFriends} style={btnPrimary}>
                Invite selected ({selectedFriends.length})
              </button>
              <button onClick={clearSelected} style={btnGhost}>
                Clear selection
              </button>
            </div>
            {bulkStatus && <div style={statusBoxStyle(bulkStatus.startsWith("✅"))}>{bulkStatus}</div>}
          </div>

          <div style={{ ...cardInsetStyle }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Email all invited users</div>
            <div style={{ display: "grid", gap: 10 }}>
              <input
                value={emailAllSubject}
                onChange={(e) => setEmailAllSubject(e.target.value)}
                placeholder={`Subject (default: Reminder: ${event.title})`}
                style={inputStyle}
              />
              <textarea
                value={emailAllMessage}
                onChange={(e) => setEmailAllMessage(e.target.value)}
                placeholder="Write your email message here..."
                style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
              />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button onClick={fillChangedDateTemplate} style={btnGhost}>
                Use date/time change template
              </button>
              <button onClick={emailAllInvitedUsers} style={btnPrimary}>
                Send custom email ({invites.length})
              </button>
            </div>
            {emailAllStatus && <div style={statusBoxStyle(emailAllStatus.startsWith("✅"))}>{emailAllStatus}</div>}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="friend@email.com"
              style={inputStyle}
            />
            <button onClick={sendSingleInvite} style={btnPrimary}>
              Send invite
            </button>
          </div>
          {inviteStatus && <div style={statusBoxStyle(inviteStatus.startsWith("✅"))}>{inviteStatus}</div>}

          <div style={{ display: "grid", gap: 10 }}>
            {invites.map((inv) => (
              <div key={inv.id} style={rowStyle}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900 }}>{inv.email}</div>
                  <div style={{ fontSize: 13, color: "rgba(229,231,235,0.75)" }}>
                    {inv.accepted ? "✅ Accepted" : "Pending"} • {formatDateTime(inv.created_at)}
                  </div>
                </div>
                <button style={btnDangerSmall} onClick={() => uninvite(inv.id)}>
                  Uninvite
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {organizerTab === "tasks" && (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <input
            placeholder="Task title"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            style={inputStyle}
          />
          <textarea
            placeholder="Task description"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            style={{ ...inputStyle, minHeight: 90, resize: "vertical" as const }}
          />
          <select value={taskAssigneeId} onChange={(e) => setTaskAssigneeId(e.target.value)} style={inputStyle}>
            <option value="">Assign to…</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {displayNameByUser(m.user_id, m.full_name, null)}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select
              value={taskVisibility}
              onChange={(e) => setTaskVisibility(e.target.value as "public" | "secret")}
              style={inputStyle}
            >
              <option value="public">Public</option>
              <option value="secret">Secret</option>
            </select>
            <select
              value={taskStatus}
              onChange={(e) => setTaskStatus(e.target.value as "todo" | "in_progress" | "done")}
              style={inputStyle}
            >
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <button onClick={createTask} disabled={!taskTitle.trim()} style={primaryBtnStyle(!taskTitle.trim())}>
            + Add task
          </button>

          <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
            {tasks.filter(canViewTask).map((task) => {
              const editing = editTaskId === task.id;
              return (
                <div key={task.id} style={rowStyle}>
                  <div style={{ flex: 1 }}>
                    {editing ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <input value={editTaskTitle} onChange={(e) => setEditTaskTitle(e.target.value)} style={inputStyle} />
                        <textarea
                          value={editTaskDescription}
                          onChange={(e) => setEditTaskDescription(e.target.value)}
                          style={{ ...inputStyle, minHeight: 90, resize: "vertical" as const }}
                        />
                        <select value={editTaskAssigneeId} onChange={(e) => setEditTaskAssigneeId(e.target.value)} style={inputStyle}>
                          <option value="">Assign to…</option>
                          {members.map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                              {displayNameByUser(m.user_id, m.full_name, null)}
                            </option>
                          ))}
                        </select>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <select value={editTaskVisibility} onChange={(e) => setEditTaskVisibility(e.target.value as "public" | "secret")} style={inputStyle}>
                            <option value="public">Public</option>
                            <option value="secret">Secret</option>
                          </select>
                          <select value={editTaskStatus} onChange={(e) => setEditTaskStatus(e.target.value as "todo" | "in_progress" | "done")} style={inputStyle}>
                            <option value="todo">To do</option>
                            <option value="in_progress">In progress</option>
                            <option value="done">Done</option>
                          </select>
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button onClick={saveTaskEdit} style={btnPrimary}>Save</button>
                          <button onClick={cancelTaskEdit} style={btnGhost}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <b>{task.title}</b>
                        <div style={{ marginTop: 6, color: "rgba(229,231,235,0.75)" }}>{task.description || "No description"}</div>
                      </>
                    )}
                  </div>
                  {!editing && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => startTaskEdit(task)} style={btnGhost}>Edit</button>
                      <button onClick={() => deleteTask(task.id)} style={btnDangerSmall}>Delete</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
