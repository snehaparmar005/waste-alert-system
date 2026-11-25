import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Download,
  LoaderCircle,
  Search,
  ShieldCheck,
} from "lucide-react";
import { apiRequest } from "../../api/client";

const CSV_COLUMNS = [
  ["Timestamp", "created_at"],
  ["User", "user_name"],
  ["Role", "user_role"],
  ["Action", "action"],
  ["Entity", "entity"],
  ["IP Address", "ip_address"],
  ["Details", "details"],
];

function escapeCsv(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function formatTimestamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      apiRequest("/api/admin/audit-logs")
        .then((data) => {
          if (active) setLogs(Array.isArray(data) ? data : []);
        })
        .catch((requestError) => {
          if (active) setError(requestError.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const filteredLogs = useMemo(() => {
    const userQuery = userFilter.trim().toLowerCase();
    const actionQuery = actionFilter.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesUser = !userQuery || [
        log.user_name,
        log.user_id,
        log.user_role,
      ].some((value) => String(value || "").toLowerCase().includes(userQuery));
      const matchesAction =
        !actionQuery || String(log.action || "").toLowerCase().includes(actionQuery);
      return matchesUser && matchesAction;
    });
  }, [actionFilter, logs, userFilter]);

  const exportCsv = () => {
    const rows = [
      CSV_COLUMNS.map(([label]) => escapeCsv(label)).join(","),
      ...filteredLogs.map((log) =>
        CSV_COLUMNS.map(([, field]) => escapeCsv(log[field])).join(","),
      ),
    ];
    const blob = new Blob([`\uFEFF${rows.join("\r\n")}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "click-2-clean-audit-logs.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#159B43]">
            System Administration
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#0B4650]">Audit Logs</h1>
          <p className="mt-2 text-sm text-gray-600">
            Review account, report, and worker activity across the system.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filteredLogs.length === 0}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0B4650] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#093a42] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="relative">
            <span className="sr-only">Filter by user</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={userFilter}
              onChange={(event) => setUserFilter(event.target.value)}
              placeholder="Filter by user name, role, or ID"
              className="min-h-11 w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
            />
          </label>
          <label className="relative">
            <span className="sr-only">Filter by action</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              placeholder="Filter by action"
              className="min-h-11 w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
            />
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#159B43]" />
            <h2 className="font-bold text-[#0B4650]">Activity History</h2>
          </div>
          <span className="text-xs text-gray-500">{filteredLogs.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-[#F4F7F6] text-xs uppercase tracking-wide text-[#0B4650]">
              <tr>
                {CSV_COLUMNS.map(([label]) => (
                  <th scope="col" key={label} className="px-4 py-3">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={CSV_COLUMNS.length} className="px-4 py-10 text-center text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading audit logs...
                    </span>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={CSV_COLUMNS.length} className="px-4 py-10 text-center text-gray-500">
                    No audit entries match these filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="align-top text-gray-700 hover:bg-gray-50/70">
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-600">
                      {formatTimestamp(log.created_at)}
                    </td>
                    <td className="px-4 py-4 font-medium text-[#0B4650]">
                      {log.user_name || (log.user_id ? `User ${log.user_id}` : "System")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {log.user_role || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold">
                      {log.action || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">{log.entity || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs">
                      {log.ip_address || "—"}
                    </td>
                    <td className="max-w-sm whitespace-normal px-4 py-4 text-gray-600">
                      {log.details || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
