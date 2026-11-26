import { MapPin } from "lucide-react";
const tiles = [["Total complaints", "128"], ["In progress", "34"], ["Resolved", "81"], ["New today", "13"]];
const rows = [["#1042", "Plastic heap", "Dry", "Reported"], ["#1041", "Food waste", "Wet", "In Progress"], ["#1039", "Batteries", "Hazardous", "Resolved"], ["#1036", "Cardboard", "Dry", "Resolved"]];
const st = { Reported: "bg-accent text-ink", "In Progress": "bg-nonbio text-primary-foreground", Resolved: "bg-primary text-primary-foreground" };
function Dashboard() {
  return <figure>
      <div className="dash-card card-c overflow-hidden p-4 md:p-5" role="img" aria-label="Dashboard preview with sample data: stat tiles, complaint map, category chart and complaints table">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map(([k, v]) => <div key={k} className="rounded-2xl bg-tint p-3"><p className="text-xs font-medium text-body">{k}</p><p className="font-display text-2xl font-bold text-ink">{v}</p></div>)}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <div className="relative h-44 overflow-hidden rounded-2xl border border-border bg-tint md:col-span-3" style={{ backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)", backgroundSize: "28px 28px" }}>
            <span className="absolute left-2 top-2 rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-ink">Live map</span>
            {[["22%", "40%", "text-hazard"], ["48%", "62%", "text-nonbio"], ["66%", "30%", "text-bio"], ["78%", "70%", "text-hazard"], ["35%", "78%", "text-bio"]].map(([l, t, c]) => <MapPin key={l} className={`hotspot absolute h-6 w-6 ${c}`} style={{ left: l, top: t }} />)}
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border p-3 md:col-span-2">
            <div className="h-24 w-24 shrink-0 rounded-full" style={{ background: "conic-gradient(var(--bio) 0 45%, var(--nonbio) 45% 85%, var(--hazard) 85%)", mask: "radial-gradient(circle, transparent 42%, #000 43%)" }} />
            <ul className="space-y-1 text-xs font-medium text-ink">{[["bg-bio", "Wet 45%"], ["bg-nonbio", "Dry 40%"], ["bg-hazard", "Hazardous 15%"]].map(([c, t]) => <li key={t} className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${c}`} />{t}</li>)}</ul>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-tint text-xs text-ink"><tr>{["ID", "Complaint", "Category", "Status"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => <tr key={r[0]} className="border-t border-border text-ink">{r.map((c, i) => <td key={i} className="px-3 py-2">{i === 3 ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st[c]}`}>{c}</span> : c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-sm font-medium text-body">Dashboard preview (sample data)</figcaption>
    </figure>;
}
export {
  Dashboard
};
