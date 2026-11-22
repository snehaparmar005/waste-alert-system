import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { apiRequest, clearSession } from "../api/client";

const h = React.createElement;

function BrandLogo({ className = "h-10 w-10" }) {
  return h(
    "svg",
    {
      xmlns: "http://w3.org",
      viewBox: "0 0 200 210",
      className: `${className} rounded-xl bg-white p-1 shrink-0`,
    },
    h("path", {
      d: "M 65 162 A 42 15 0 1 0 135 162",
      fill: "none",
      stroke: "#159B43",
      strokeWidth: "11",
      strokeLinecap: "round",
    }),
    h("path", {
      d: "M 100 42 C 66 42 39 69 39 103 C 39 144 100 182 100 182 C 100 182 161 144 161 103 C 161 69 134 42 100 42 Z",
      fill: "#0B4650",
    }),
    h("circle", { cx: "100", cy: "102", r: "35", fill: "#FFFFFF" }),
    h("circle", { cx: "100", cy: "102", r: "26", fill: "#0B4650" }),
    h("circle", { cx: "91", cy: "94", r: "7", fill: "#FFFFFF" }),
    h("path", {
      d: "M 80 104 A 20 20 0 0 1 98 83",
      fill: "none",
      stroke: "#FFFFFF",
      strokeWidth: "3.5",
      strokeLinecap: "round",
    }),
    h("circle", { cx: "111", cy: "110", r: "4.5", fill: "#F8C31C" }),
    h("path", {
      d: "M 103 44 C 101 20 120 5 148 6 C 147 32 131 46 108 45 C 117 34 127 25 137 18 C 125 23 113 33 103 44 Z",
      fill: "#159B43",
    }),
    h("path", {
      d: "M 122 50 C 134 35 152 31 168 37 C 161 53 145 59 125 53 C 136 49 146 45 156 42 C 145 43 133 46 122 50 Z",
      fill: "#159B43",
    })
  );
}

export default function AppShell({ user, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const role = user?.role;

  const handleLogout = async () => {
    try {
      await apiRequest("/api/logout", { method: "POST" });
    } catch {
      // Clear local session regardless
    }
    clearSession();
    onLogout();
    navigate("/login");
  };

  const navItemsByRole = {
    citizen: [
      { to: "/report", label: "Report Waste" },
      { to: "/my-reports", label: "My Reports" },
      { to: "/profile", label: "Settings & Profile" },
    ],
    gov: [
      { to: "/gov/dashboard", label: "Dashboard" },
      { to: "/gov/reports", label: "Manage Complaints" },
    ],
    worker: [
      { to: "/worker/dashboard", label: "Assigned Tasks" },
    ],
    admin: [
      { to: "/admin/dashboard", label: "Dashboard" },
      { to: "/admin/reports", label: "Manage Complaints" },
      { to: "/admin/users", label: "Staff Management" },
      { to: "/admin/authorities", label: "Wards & Map" },
      { to: "/admin/alerts", label: "Notifications" },
    ],
  };

  if (!role) {
    return h(
      "div",
      { className: "min-h-screen flex flex-col bg-[#F4F7F6] text-[#172B27]" },
      h(
        "header",
        { className: "bg-[#0B4650] text-white px-6 py-3.5 shadow-sm flex items-center justify-between" },
        h(
          Link,
          { to: "/", className: "flex items-center gap-3" },
          h(BrandLogo, { className: "h-10 w-10" }),
          h(
            "div",
            null,
            h(
              "span",
              { className: "font-brand text-xl font-extrabold block leading-none" },
              "Click-",
              h("span", { className: "text-[#F8C31C]" }, "2"),
              "-Clean"
            ),
            h(
              "span",
              { className: "text-[11px] uppercase tracking-widest text-emerald-200" },
              "Snap. Sort. Alert."
            )
          )
        ),
        h(
          "div",
          { className: "flex items-center gap-4 text-sm font-medium" },
          h(Link, { to: "/", className: "hover:text-[#F8C31C]" }, "Home"),
          h(Link, { to: "/login", className: "hover:text-[#F8C31C]" }, "Login"),
          h(
            Link,
            {
              to: "/register",
              className: "bg-[#159B43] hover:bg-[#118037] text-white px-4 py-2 rounded-lg font-semibold",
            },
            "Register"
          )
        )
      ),
      h("main", { className: "flex-grow" }, children)
    );
  }

  const links = navItemsByRole[role] || [];

  return h(
    "div",
    { className: "min-h-screen flex bg-[#F4F7F6] text-[#172B27]" },
    h(
      "aside",
      {
        className: `fixed inset-y-0 left-0 z-40 w-64 bg-[#0B4650] text-white flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`,
      },
      h(
        "div",
        null,
        h(
          "div",
          { className: "p-5 flex items-center gap-3 border-b border-white/10" },
          h(BrandLogo, { className: "h-11 w-11" }),
          h(
            "div",
            null,
            h(
              "span",
              { className: "font-brand text-lg font-extrabold tracking-tight block leading-tight" },
              "Click-",
              h("span", { className: "text-[#F8C31C]" }, "2"),
              "-Clean"
            ),
            h("span", { className: "text-[11px] text-emerald-200 tracking-wide" }, "Snap. Sort. Alert.")
          )
        ),
        h(
          "nav",
          { className: "p-4 space-y-1.5 text-sm font-medium" },
          links.map((item) =>
            h(
              NavLink,
              {
                key: item.to,
                to: item.to,
                onClick: () => setSidebarOpen(false),
                className: ({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                    isActive
                      ? "bg-[#159B43] text-white font-semibold shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`,
              },
              h("span", null, item.label)
            )
          )
        )
      ),
      h(
        "div",
        { className: "p-4 border-t border-white/10 space-y-3" },
        h(
          "div",
          { className: "bg-white/5 rounded-xl p-3 text-center" },
          h("p", { className: "text-xs font-semibold text-emerald-200" }, "Cleaner City"),
          h("p", { className: "text-xs text-white/70" }, "Greener Tomorrow")
        ),
        h(
          "button",
          {
            onClick: handleLogout,
            className: "w-full bg-red-500/90 hover:bg-red-600 text-white py-2.5 rounded-xl text-xs font-semibold transition",
          },
          `Logout (${user.name})`
        )
      )
    ),
    h(
      "div",
      { className: "flex-1 flex flex-col min-w-0" },
      h(
        "header",
        { className: "bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-30" },
        h(
          "button",
          {
            type: "button",
            onClick: () => setSidebarOpen(!sidebarOpen),
            className: "lg:hidden px-3 py-1.5 rounded-lg border text-xs font-bold text-gray-600",
          },
          "Menu"
        ),
        h(
          "div",
          { className: "ml-auto flex items-center gap-3" },
          h(
            "div",
            { className: "h-9 w-9 rounded-full bg-[#0B4650] text-white font-bold text-sm flex items-center justify-center uppercase" },
            (user.name || "U").charAt(0)
          ),
          h(
            "div",
            { className: "leading-tight" },
            h("p", { className: "text-sm font-bold text-gray-800" }, user.name),
            h(
              "p",
              { className: "text-[11px] text-gray-500 capitalize" },
              role === "gov" ? "Nagar Nigam" : role
            )
          )
        )
      ),
      h("main", { className: "flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto" }, children)
    )
  );
}