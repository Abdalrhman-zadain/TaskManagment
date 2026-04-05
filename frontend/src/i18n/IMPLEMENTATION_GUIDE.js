/**
 * TRANSLATION IMPLEMENTATION GUIDE
 * 
 * To add translations to any page:
 * 
 * 1. Import useTranslation hook at the top:
 *    import { useTranslation } from "react-i18next";
 * 
 * 2. In your component, add:
 *    const { t } = useTranslation();
 * 
 * 3. Replace all hardcoded strings with t("translation.key"):
 *    
 *    Before:  <h1>Dashboard</h1>
 *    After:   <h1>{t("dashboard.title")}</h1>
 * 
 * 4. Add missing translation keys to:
 *    - frontend/src/i18n/locales/en.json
 *    - frontend/src/i18n/locales/ar.json
 * 
 * ============================================
 * PAGES THAT NEED TRANSLATIONS:
 * ============================================
 * 
 * ✓ Login.jsx - DONE (already has translations)
 * ✓ Sidebar.jsx - DONE (already has translations)
 * 
 * TODO - Add translations to:
 * 
 * [ ] CEODashboard.jsx
 * [ ] ManagerDashboard.jsx
 * [ ] EmployeeDashboard.jsx
 * [ ] ClientDashboard.jsx
 * [ ] TasksPage.jsx
 * [ ] TaskDetail.jsx
 * [ ] TaskCreate.jsx
 * [ ] ProjectsPage.jsx
 * [ ] SectionsPage.jsx
 * [ ] UsersPage.jsx
 * [ ] Profile.jsx
 * [ ] NotificationsPage.jsx
 * [ ] CalendarPage.jsx
 * 
 * ============================================
 * EXAMPLE - Converting CEODashboard.jsx:
 * ============================================
 * 
 * Step 1: Add import at top
 * import { useTranslation } from "react-i18next";
 * 
 * Step 2: In component, add hook
 * export default function CEODashboard() {
 *   const { t } = useTranslation();
 *   ...
 * }
 * 
 * Step 3: Replace text
 * 
 * OLD CODE:
 *   <h1 className="page-title">CEO Dashboard</h1>
 *   <p className="page-subtitle">{new Date().toDateString()}</p>
 *   <button className="btn-primary">+ New Task</button>
 *   <StatCard label="Total Tasks" value={tasks.length} />
 * 
 * NEW CODE:
 *   <h1 className="page-title">{t("dashboard.title")}</h1>
 *   <p className="page-subtitle">{new Date().toDateString()}</p>
 *   <button className="btn-primary">{t("common.add")} {t("common.tasks")}</button>
 *   <StatCard label={t("dashboard.stats")} value={tasks.length} />
 * 
 * ============================================
 * QUICK SEARCH REPLACE PATTERN:
 * ============================================
 * 
 * For common words, use these keys:
 * 
 * "Dashboard" → t("common.dashboard")
 * "Tasks" → t("common.tasks")
 * "Projects" → t("common.projects")
 * "Users" → t("common.users")
 * "Add" → t("common.add")
 * "Edit" → t("common.edit")
 * "Delete" → t("common.delete")
 * "Save" → t("common.save")
 * "Cancel" → t("common.cancel")
 * "Loading..." → t("common.loading")
 * "Search" → t("common.search")
 */
