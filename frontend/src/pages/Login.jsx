import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/client";

export default function Login() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const navigate = useNavigate();

  useEffect(() => {
    // Sync language from localStorage on mount
    const savedLang = localStorage.getItem("language") || "en";
    if (savedLang !== i18n.language) {
      i18n.changeLanguage(savedLang);
    }
    
    setCurrentLang(i18n.language);

    // Listen for language changes
    const handleLanguageChanged = (lang) => {
      setCurrentLang(lang);
    };

    i18n.on("languageChanged", handleLanguageChanged);

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, [i18n]);

  function changeLanguage(lang) {
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
    
    if (lang === "ar") {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";
    } else {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
    }
  }

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
    <div className="app-shell flex min-h-screen flex-col items-center justify-center px-4">
      {/* Language Toggle */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => changeLanguage("en")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            currentLang === "en"
              ? "bg-[#1275e2] text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          EN
        </button>
        <button
          onClick={() => changeLanguage("ar")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            currentLang === "ar"
              ? "bg-[#1275e2] text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          AR
        </button>
      </div>

      <div className="app-panel w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Team<span className="text-[#1275e2]">Task</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("login.subtitle")}</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="app-label">{t("login.email")}</label>
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
            <label className="app-label">{t("login.password")}</label>
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
            {loading ? t("login.loginFailed") : t("login.loginButton")}
          </button>
        </form>
      </div>
    </div>
  );
}
