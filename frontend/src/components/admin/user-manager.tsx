"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { APP_ROLES, type AppRole } from "@/lib/auth/constants";
import { lmsMutation } from "@/lib/client-api";
import type { AdminUser } from "@/lib/types";

const roles: Array<{ value: AppRole; label: string }> = [
  { value: APP_ROLES.ADMIN, label: "Admin" },
  { value: APP_ROLES.CONTENT_MANAGER, label: "Content Manager" },
  { value: APP_ROLES.INSTRUCTOR, label: "Instructor" },
  { value: APP_ROLES.STUDENT, label: "Student" },
];

export function UserManager({
  initialUsers,
  actorDocumentId,
}: {
  initialUsers: AdminUser[];
  actorDocumentId?: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");

  async function changeRole(user: AdminUser, role: AppRole | null) {
    setPendingId(user.documentId);
    setError("");
    try {
      const result = await lmsMutation<AdminUser>(
        `/api/lms/admin/users/${user.documentId}/role`,
        "PATCH",
        { role },
      );
      setUsers((current) =>
        current.map((item) =>
          item.documentId === user.documentId ? result.data : item,
        ),
      );
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The role could not be changed.",
      );
    } finally {
      setPendingId("");
    }
  }

  async function toggleStatus(user: AdminUser) {
    setPendingId(user.documentId);
    setError("");
    try {
      const result = await lmsMutation<AdminUser>(
        `/api/lms/admin/users/${user.documentId}/status`,
        "PATCH",
        { blocked: !user.blocked },
      );
      setUsers((current) =>
        current.map((item) =>
          item.documentId === user.documentId ? result.data : item,
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The account status could not be changed.",
      );
    } finally {
      setPendingId("");
    }
  }

  async function remove(user: AdminUser) {
    if (!window.confirm(`Permanently delete ${user.username}?`)) return;
    setPendingId(user.documentId);
    setError("");
    try {
      await lmsMutation(`/api/lms/admin/users/${user.documentId}`, "DELETE");
      setUsers((current) =>
        current.filter((item) => item.documentId !== user.documentId),
      );
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The user could not be deleted.",
      );
      setPendingId("");
    }
  }

  return (
    <section className="admin-users-panel">
      <div className="admin-panel-heading">
        <div>
          <p className="eyebrow">Access control</p>
          <h2>Users and roles</h2>
          <p>
            Changes are validated by Strapi, including last-admin and
            self-protection rules.
          </p>
        </div>
        <span>{users.length} accounts</span>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-user-table-wrap">
        <table className="admin-user-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.documentId === actorDocumentId;
              const pending = pendingId === user.documentId;
              return (
                <tr key={user.documentId}>
                  <td>
                    <div className="admin-user-cell">
                      <span>{user.username.slice(0, 2).toUpperCase()}</span>
                      <div>
                        <strong>
                          {user.username}
                          {isSelf ? " (you)" : ""}
                        </strong>
                        <small>{user.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      aria-label={`Role for ${user.username}`}
                      disabled={pending}
                      onChange={(event) =>
                        changeRole(
                          user,
                          event.target.value
                            ? (event.target.value as AppRole)
                            : null,
                        )
                      }
                      value={user.role?.type ?? ""}
                    >
                      <option value="">No role</option>
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span
                      className={
                        user.blocked
                          ? "account-status blocked"
                          : "account-status active"
                      }
                    >
                      {user.blocked ? "Blocked" : "Active"}
                    </span>
                  </td>
                  <td>
                    {user.createdAt
                      ? new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                        }).format(new Date(user.createdAt))
                      : "—"}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        disabled={pending || isSelf}
                        onClick={() => toggleStatus(user)}
                        type="button"
                      >
                        {pending
                          ? "Working…"
                          : user.blocked
                            ? "Unblock"
                            : "Block"}
                      </button>
                      <button
                        className="delete"
                        disabled={pending || isSelf}
                        onClick={() => remove(user)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
