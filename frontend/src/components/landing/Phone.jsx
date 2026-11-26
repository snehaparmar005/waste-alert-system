import { Camera, MapPin, BellRing } from "lucide-react";
const cameraView = { url: "/images/overflowing-bin.png" };
function Phone({ step }) {
  return <div className="mx-auto w-56 rounded-[2.5rem] border-[6px] border-ink bg-card p-1.5 shadow-soft md:w-64" role="img" aria-label={`Phone showing step ${step + 1}`}>
      <div key={step} className="relative h-80 overflow-hidden rounded-[2rem] bg-tint md:h-[420px]">
        {step === 0 && <>
          <img src={cameraView.url} alt="Photo of an overflowing garbage bin being reported" className="absolute inset-0 h-full w-full rounded-[1.75rem] object-cover" />
          {["left-3 top-3 border-l-4 border-t-4 rounded-tl-xl", "right-3 top-3 border-r-4 border-t-4 rounded-tr-xl", "bottom-3 left-3 border-b-4 border-l-4 rounded-bl-xl", "bottom-3 right-3 border-b-4 border-r-4 rounded-br-xl"].map((c) => <span key={c} aria-hidden className={`absolute h-8 w-8 border-card ${c}`} />)}
          <div className="anim-flash absolute inset-0 bg-card" />
          <div className="absolute bottom-6 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border-4 border-ink bg-card"><Camera className="h-6 w-6 text-ink" /></div>
        </>}
        {step === 1 && <div className="relative h-full">
          <img src={cameraView.url} alt="AI scanning the garbage photo and sorting items" className="absolute inset-0 h-full w-full rounded-[1.75rem] object-cover" />
          <div aria-hidden className="anim-scan absolute left-0 h-0.5 w-full bg-bio shadow-[0_0_12px_2px_var(--bio)]" />
          {[
    { label: "Battery · Hazardous", chip: "bg-hazard", box: "border-hazard", pos: "left-[28%] top-[16%] h-[10%] w-[26%]", delay: "1.7s", align: "left-0" },
    { label: "Plastic bottle · Dry waste", chip: "bg-nonbio", box: "border-nonbio", pos: "left-[50%] top-[56%] h-[13%] w-[40%]", delay: "1.9s", align: "right-0" },
    { label: "Food waste · Wet", chip: "bg-bio", box: "border-bio", pos: "left-[6%] top-[72%] h-[15%] w-[42%]", delay: "2.1s", align: "left-0" }
  ].map((d) => <div key={d.label} aria-hidden className={`anim-detect absolute ${d.pos}`} style={{ animationDelay: d.delay }}>
              <span className={`absolute -top-5 ${d.align} whitespace-nowrap rounded-full ${d.chip} px-2 py-0.5 text-[10px] font-bold text-ink shadow-sm`}>{d.label}</span>
              <span className={`block h-full w-full rounded-lg border-2 ${d.box} bg-card/10`} />
            </div>)}
        </div>}
        {step === 2 && <div className="relative h-full">
          <svg viewBox="0 0 224 420" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
            <rect width="224" height="420" fill="var(--tint)" />
            <g stroke="var(--border)" strokeWidth="7" fill="none" strokeLinecap="round">
              <path d="M 58 -10 C 70 120 48 260 72 430" />
              <path d="M -10 140 C 80 128 150 152 234 136" />
              <path d="M -10 282 C 90 292 150 268 234 286" />
              <path d="M 162 -10 C 150 140 176 300 164 430" />
              <path d="M -10 60 C 60 70 120 50 234 66" />
            </g>
            <ellipse cx="150" cy="336" rx="36" ry="22" fill="var(--nonbio)" opacity=".35" />
            <g fill="var(--ink)" opacity=".55" fontSize="9" fontWeight="600">
              <text x="16" y="124">Race Course Rd</text>
              <text x="16" y="44">Gwalior Fort</text>
              <text x="118" y="220">City Centre</text>
              <text x="106" y="340" textAnchor="end">Phool Bagh</text>
            </g>
          </svg>
          <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-ink/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink">Sample report</span>
          <span aria-hidden className="anim-ring absolute left-[46%] top-[31%] h-12 w-12 rounded-full border-2 border-hazard" />
          <div className="absolute left-[46%] top-[31%]"><MapPin className="anim-pin h-10 w-10 fill-hazard text-card" style={{ transform: "translate(-50%,-100%)" }} /></div>
          <span className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-card px-3 py-1 text-[11px] font-semibold text-ink shadow-sm"><MapPin className="h-3 w-3 text-hazard" />Location attached automatically</span>
        </div>}
        {step === 3 && <div className="relative flex h-full flex-col items-center justify-center gap-3 p-4 text-center animate-in fade-in duration-500">
          <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-ink/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink">Sample report</span>
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent"><BellRing className="anim-bell h-8 w-8 text-ink" /></span>
          <p className="font-display text-lg font-bold text-ink">Nagar Nigam Alerted</p>
          <div className="w-full rounded-2xl bg-card p-3 text-left shadow-soft">
            <div className="flex items-center gap-3">
              <img src={cameraView.url} alt="Reported garbage photo thumbnail" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-ink/60">New report</p>
                <p className="text-[13px] font-bold leading-tight text-ink">Plastic · Dry waste</p>
              </div>
            </div>
            <p className="mt-1.5 text-xs text-ink/70">Near Race Course Rd</p>
            <div className="relative mt-2 h-6" aria-label="Status cycles: Reported, In progress, Resolved">
              <span className="anim-status absolute left-0 rounded-full border border-ink/20 bg-tint px-2.5 py-0.5 text-[10px] font-bold text-ink" style={{ animationDelay: "0s" }}>Reported</span>
              <span className="anim-status absolute left-0 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-ink" style={{ animationDelay: "-4s" }}>In progress</span>
              <span className="anim-status absolute left-0 rounded-full bg-bio px-2.5 py-0.5 text-[10px] font-bold text-ink" style={{ animationDelay: "-2s" }}>Resolved</span>
            </div>
          </div>
        </div>}
      </div>
    </div>;
}
export {
  Phone
};
