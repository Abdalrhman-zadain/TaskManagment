import { useState } from "react";
import api from "../api/client";

export default function EditUserModal({
  user,
  sections,
  onClose,
  onSuccess,
  currentUserRole,
}) {
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editPassword, setEditPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [editRole, setEditRole] = useState(user.role);
  const [editSectionId, setEditSectionId] = useState(user.section?.id || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");

    if (!editName.trim() || !editEmail.trim()) {
      setError("Name and email are required");
      return;
    }

    if (editPassword && editPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (currentUserRole === "CEO" && editRole === "MANAGER" && !editSectionId) {
      setError("Section is required for Manager role");
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        name: editName.trim(),
        email: editEmail.trim(),
      };

      if (editPassword) {
        updateData.password = editPassword;
      }

      if (currentUserRole === "CEO") {
        updateData.role = editRole;
      }

      if (currentUserRole === "CEO" || editRole !== "CLIENT") {
        updateData.sectionId = editSectionId || null;
      }

      await api.patch(`/users/${user.id}`, updateData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
      <div className="app-panel w-full max-w-md p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          Edit User: {user.name}
        </h2>

        <div className="mb-4">
          <label className="app-label">Name</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="app-input"
          />
        </div>

        <div className="mb-4">
          <label className="app-label">Email</label>
          <input
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            className="app-input"
          />
        </div>

        <div className="mb-4">
          <label className="app-label">New Password (optional)</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              className="app-input pr-10"
              placeholder="Leave empty to keep current password"
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>
        </div>

        {currentUserRole === "CEO" && (
          <>
            <div className="mb-4">
              <label className="app-label">Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="app-input"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="CLIENT">Client</option>
              </select>
            </div>

            {editRole !== "CLIENT" && (
              <div className="mb-4">
                <label className="app-label">
                  Section{" "}
                  {editRole === "MANAGER" && (
                    <span className="text-rose-600">*</span>
                  )}
                </label>
                <select
                  value={editSectionId}
                  onChange={(e) => setEditSectionId(e.target.value)}
                  className="app-input"
                >
                  <option value="">
                    {editRole === "MANAGER" ? "Select a section" : "Unassigned"}
                  </option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
