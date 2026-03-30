import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      const role = res.data.user.role;
      if (role === "CEO") navigate("/ceo");
      if (role === "MANAGER") navigate("/manager");
      if (role === "EMPLOYEE") navigate("/employee");
      if (role === "CLIENT") navigate("/client");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4">
      <div className="app-panel w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Team<span className="text-[#1275e2]">Task</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your workspace</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="app-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="app-input"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="app-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="app-input"
              placeholder="Enter your password"
            />
          </div>

          {error && <p className="text-center text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-2 w-full py-2.5 text-sm font-medium"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
