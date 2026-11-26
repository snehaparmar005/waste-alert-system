import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";

const PUBLIC_PATHS = new Set(["/", "/login", "/register"]);

export default function Navbar({ user }) {
  const { pathname } = useLocation();

  if (user || !PUBLIC_PATHS.has(pathname)) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 font-sans text-body backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        <Link to="/" className="flex min-h-11 items-center gap-2">
          <img
            src={logo}
            alt="Click-2-Clean logo"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 object-contain"
          />
          <span className="font-display text-xl font-extrabold text-ink">
            Click-2-<span className="text-primary">Clean</span>
          </span>
        </Link>
        <nav aria-label="Public navigation" className="flex items-center gap-3 text-sm font-semibold">
          {pathname !== "/" && (
            <Link to="/" className="flex min-h-11 items-center gap-1 text-ink hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          )}
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center rounded-full border-2 border-ink bg-card px-5 py-2 text-ink hover:bg-tint"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="inline-flex min-h-11 items-center rounded-full border-2 border-ink bg-accent px-5 py-2 text-ink shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5"
          >
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}
