import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../api/client";

export default function ProfileEdit() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role =
    user.role === "CEO"
      ? "CEO"
      : user.role === "MANAGER"
        ? "Manager"
        : user.role === "CLIENT"
          ? "Client"
          : "Employee";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
  });

  useEffect(() => {
    api
      .get("/users/me")
      .then((res) => {
        setForm((prev) => ({
          ...prev,
          name: res.data.name || "",
          email: res.data.email || "",
        }));
      })
      .catch((err) => {
        setSaveError(err.response?.data?.error || "Failed to load profile");
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setSaveError("");

    const payload = {
      name: form.name,
      email: form.email,
    };

    if (form.newPassword.trim()) {
      payload.currentPassword = form.currentPassword;
      payload.newPassword = form.newPassword;
    }

    try {
      setSaving(true);
      const res = await api.patch("/users/me", payload);

      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...storedUser,
          name: res.data.name,
          email: res.data.email,
        })
      );

      navigate("/profile");
    } catch (err) {
      setSaveError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar role={role} />

      <main className="flex-1 overflow-y-auto p-7">
        <h1 className="page-title mb-7">Edit Profile</h1>

        <div className="app-panel max-w-xl p-6">
          {loading ? (
            <p className="text-sm text-slate-500">Loading profile...</p>
          ) : (
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-[#1275e2] transition focus:ring-2"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-[#1275e2] transition focus:ring-2"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Current Password
                </label>
                <input
                  type="password"
                  value={form.currentPassword}
                  onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Required only when changing password"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-[#1275e2] transition focus:ring-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  New Password
                </label>
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Leave blank to keep current password"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-[#1275e2] transition focus:ring-2"
                />
              </div>

              {saveError && <p className="text-sm text-rose-600">{saveError}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="rounded-lg bg-[#1275e2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f66c7] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
