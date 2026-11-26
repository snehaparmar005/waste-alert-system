import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Camera,
  CheckCheck,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  ScrollText,
  ShieldAlert,
  User,
  Users,
  X,
  ArrowLeft,
} from "lucide-react";
import { apiRequest, clearSession } from "../api/client";
import logo from "@/assets/logo.png";

function formatNotificationTimestamp(value) {
  if (!value) return "";
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? ""
    : timestamp.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function BrandLogo({ className = "h-9 w-9" }) {
  return (
    <img
      src={logo}
      alt="Click-2-Clean logo"
      width={36}
      height={36}
      className={`${className} shrink-0 object-contain`}
    />
  );
}

const ROLE_LABELS = {
  citizen: "Citizen",
  gov: "Nagar Nigam Officer",
  worker: "Field Worker",
  admin: "System Admin",
};

const navItemsByRole = {
  citizen: [
    { to: "/citizen/report", label: "Report Waste", Icon: Camera },
    { to: "/my-reports", label: "My Reports", Icon: FileText },
    { to: "/profile", label: "My Profile", Icon: User },
  ],
  gov: [
    { to: "/gov/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { to: "/gov/reports", label: "Manage Complaints", Icon: ClipboardList },
    { to: "/gov/workers", label: "My Workers", Icon: Users },
    { to: "/profile", label: "My Profile", Icon: User },
  ],
  worker: [
    { to: "/worker/dashboard", label: "Assigned Tasks", Icon: CheckSquare },
    { to: "/profile", label: "My Profile", Icon: User },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { to: "/admin/reports", label: "Manage Complaints", Icon: ClipboardList },
    { to: "/admin/users", label: "Staff Management", Icon: Users },
    { to: "/admin/authorities", label: "Wards & Map", Icon: MapPin },
    { to: "/admin/audit-logs", label: "Audit Logs", Icon: ScrollText },
    { to: "/admin/alerts", label: "Audit & Alerts", Icon: ShieldAlert },
    { to: "/profile", label: "My Profile", Icon: User },
  ],
};

export default function AppShell({ user, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState("");
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const navigate = useNavigate();
  const role = user?.role;

  const loadNotifications = useCallback(async () => {
    try {
      const data = await apiRequest("/api/notifications");
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(Number(data.unread_count) || 0);
      setNotificationError("");
    } catch (error) {
      setNotificationError(error.message || "Could not load notifications.");
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setNotificationsOpen(false);
        setSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!role) return undefined;
    const initialFetch = window.setTimeout(loadNotifications, 0);
    const pollingInterval = window.setInterval(loadNotifications, 20000);
    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(pollingInterval);
    };
  }, [loadNotifications, role]);

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    setNotificationError("");
    try {
      await apiRequest("/api/notifications/read-all", { method: "PATCH" });
      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          is_read: true,
        })),
      );
      setUnreadCount(0);
    } catch (error) {
      setNotificationError(error.message || "Could not mark notifications as read.");
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest("/api/logout", { method: "POST" });
    } catch (error) {
      console.error("Could not complete the logout request; clearing the local session.", error);
    }
    clearSession();
    onLogout();
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
    navigate("/login");
  };

  if (!role) return <>{children}</>;

  const links = navItemsByRole[role] || [];
  const name = user?.name?.trim() || "User";
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="page-bg h-screen overflow-hidden font-sans text-body">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 cursor-default bg-black/40 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col justify-between border-r border-border bg-background text-ink transition-transform duration-200 lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="overflow-y-auto">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <Link to="/" className="flex min-h-11 items-center gap-2">
              <BrandLogo className="h-9 w-9" />
              <div>
                <span className="font-display block text-xl font-extrabold leading-tight text-ink">
                  Click-2-<span className="text-primary">Clean</span>
                </span>
                <span className="font-hand text-sm font-semibold text-bio-ink">
                  snap. sort. alert.
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="rounded-full p-2 text-ink hover:bg-tint lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav aria-label="Main navigation" className="space-y-2 p-4 text-sm font-semibold">
            {links.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-full px-4 py-2.5 transition ${
                    isActive
                      ? "border-2 border-ink bg-accent text-ink shadow-[3px_3px_0_var(--ink)]"
                      : "text-body hover:bg-tint hover:text-ink"
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="space-y-3 border-t border-border p-4">
          <Link
            to="/"
            className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-card py-2 text-xs font-semibold text-ink transition hover:bg-tint"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-hazard/10 py-2 text-xs font-semibold text-hazard-ink transition hover:bg-hazard hover:text-primary-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="flex h-full min-h-0 flex-col lg:pl-64">
        <header className="z-20 flex shrink-0 items-center justify-between gap-4 border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
            className="rounded-full border-2 border-ink bg-card p-2 text-ink hover:bg-tint lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden sm:block">
            <span className="sticker text-xs">
              {ROLE_LABELS[role] || "Portal"}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((isOpen) => !isOpen);
                  loadNotifications();
                }}
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
                aria-expanded={notificationsOpen}
                aria-controls="navbar-notifications"
                className="relative rounded-full border-2 border-ink bg-card p-2 text-ink transition hover:bg-tint"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-ink bg-accent px-1 text-[10px] font-bold leading-none text-ink">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <section
                  id="navbar-notifications"
                  aria-label="Recent notifications"
                  className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-800 shadow-xl sm:w-96"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
                    <div>
                      <h2 className="text-sm font-bold text-[#0B4650]">Notifications</h2>
                      <p className="text-xs text-gray-500">
                        {unreadCount} unread
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      disabled={unreadCount === 0 || markingAllRead}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#0B4650] transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCheck className="h-4 w-4 text-[#159B43]" />
                      Mark all as read
                    </button>
                  </div>

                  {notificationError && (
                    <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
                      {notificationError}
                    </p>
                  )}

                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-gray-500">
                        No notifications yet.
                      </p>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                          <li
                            key={notification.id}
                            className={`flex gap-3 px-4 py-3 ${
                              notification.is_read ? "bg-white" : "bg-emerald-50/60"
                            }`}
                          >
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                notification.is_read ? "bg-gray-300" : "bg-[#159B43]"
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[#0B4650]">
                                {notification.title || "Notification"}
                              </p>
                              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-600">
                                {notification.message}
                              </p>
                              <time
                                dateTime={notification.created_at || undefined}
                                className="mt-1 block text-[11px] text-gray-400"
                              >
                                {formatNotificationTimestamp(notification.created_at)}
                              </time>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              )}
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((isOpen) => !isOpen)}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-xl border border-gray-200 p-1.5 pr-2 text-left transition hover:bg-gray-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B4650] text-xs font-bold text-white">
                  {initials}
                </span>
                <span className="hidden sm:block">
                  <span className="block max-w-36 truncate text-sm font-semibold text-gray-800">
                    {name}
                  </span>
                  <span className="block text-left text-xs text-gray-500">
                    {ROLE_LABELS[role] || "Portal"}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-gray-200 bg-white p-2 shadow-lg"
                >
                  <div className="border-b border-gray-100 px-3 py-2">
                    <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                    <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      {ROLE_LABELS[role] || "Portal"}
                    </span>
                  </div>
                  <Link
                    to="/profile"
                    role="menuitem"
                    onClick={() => setProfileMenuOpen(false)}
                    className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="dots-mint portal-theme min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
