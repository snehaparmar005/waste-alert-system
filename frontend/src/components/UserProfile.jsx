import { useEffect, useState } from "react";
import {
  FileText,
  LockKeyhole,
  Mail,
  Pencil,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { apiRequest, getSession, saveSession } from "../api/client";

const ROLE_LABELS = {
  citizen: "Citizen",
  gov: "Nagar Nigam Officer",
  officer: "Nagar Nigam Officer",
  worker: "Field Worker",
  admin: "System Admin",
};

const initialPasswordForm = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

export default function UserProfile({ onProfileUpdate }) {
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [error, setError] = useState("");
  const [editError, setEditError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/profile", { signal: controller.signal })
      .then((user) => {
        setProfile(user);
        setDisplayName(user.name || "");
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const applyUpdatedUser = (updatedUser) => {
    setProfile((currentProfile) => ({ ...currentProfile, ...updatedUser }));
    const currentSession = getSession();
    if (currentSession) {
      saveSession({
        ...currentSession,
        user: { ...(currentSession.user || {}), ...updatedUser },
      });
    }
    onProfileUpdate?.(updatedUser);
  };

  const closeEditModal = () => {
    setIsEditing(false);
    setDisplayName(profile?.name || "");
    setEditError("");
  };

  const handleSaveName = async (event) => {
    event.preventDefault();
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setEditError("Display name cannot be empty.");
      return;
    }

    setIsSavingName(true);
    setEditError("");
    setError("");
    setStatusMessage("");
    try {
      const updatedUser = await apiRequest("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ name: trimmedName }),
      });
      applyUpdatedUser(updatedUser);
      setIsEditing(false);
      setStatusMessage("Your display name has been updated.");
    } catch (requestError) {
      setEditError(requestError.message);
    } finally {
      setIsSavingName(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setError("");
    setStatusMessage("");

    if (passwordForm.new_password.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const updatedUser = await apiRequest("/api/profile", {
        method: "PUT",
        body: JSON.stringify(passwordForm),
      });
      applyUpdatedUser(updatedUser);
      setPasswordForm(initialPasswordForm);
      setStatusMessage("Your password has been updated.");
    } catch (requestError) {
      setPasswordError(requestError.message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const roleLabel = ROLE_LABELS[profile?.role] || "User";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-wider text-[#159B43]">
          Account
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[#0B4650]">Account Profile</h1>
        <p className="mt-2 text-sm text-gray-600">
          View and manage your Click-2-Clean account details.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {statusMessage && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-[#159B43]/30 bg-[#EAF5EE] p-3 text-sm text-[#0B4650]"
        >
          {statusMessage}
        </div>
      )}

      {isLoading ? (
        <div
          role="status"
          className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-600 shadow-sm"
        >
          Loading your profile...
        </div>
      ) : profile ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF5EE] text-[#0B4650]">
                  <UserRound className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-[#0B4650]">Personal Details</h2>
                  <p className="text-sm text-gray-500">Your account information</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDisplayName(profile.name || "");
                  setEditError("");
                  setIsEditing(true);
                }}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#0B4650]/20 px-3 py-2 text-sm font-semibold text-[#0B4650] transition hover:bg-[#EAF5EE]"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </button>
            </div>

            <dl className="mt-5 space-y-5">
              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-[#159B43]" />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Name
                  </dt>
                  <dd className="mt-1 font-medium text-gray-900">{profile.name}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#159B43]" />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Email
                  </dt>
                  <dd className="mt-1 break-all font-medium text-gray-900">{profile.email}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#159B43]" />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Role
                  </dt>
                  <dd className="mt-1">
                    <span className="inline-flex rounded-full bg-[#EAF5EE] px-3 py-1 text-sm font-semibold text-[#0B4650]">
                      {roleLabel}
                    </span>
                  </dd>
                </div>
              </div>
            </dl>

            <div className="mt-7 flex items-center gap-3 rounded-xl bg-[#0B4650] p-4 text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-white/75">Total reports submitted</p>
                <p className="text-xl font-bold">{profile.report_count ?? 0}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF5EE] text-[#0B4650]">
                <LockKeyhole className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-[#0B4650]">Change Password</h2>
                <p className="text-sm text-gray-500">Choose a strong new password</p>
              </div>
            </div>

            {passwordError && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label
                  htmlFor="current-password"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Current Password
                </label>
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={passwordForm.current_password}
                  onChange={(event) =>
                    setPasswordForm((form) => ({
                      ...form,
                      current_password: event.target.value,
                    }))
                  }
                  className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
                />
              </div>
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={passwordForm.new_password}
                  onChange={(event) =>
                    setPasswordForm((form) => ({
                      ...form,
                      new_password: event.target.value,
                    }))
                  }
                  className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
                />
                <p className="mt-1 text-xs text-gray-500">Use at least 6 characters.</p>
              </div>
              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={passwordForm.confirm_password}
                  onChange={(event) =>
                    setPasswordForm((form) => ({
                      ...form,
                      confirm_password: event.target.value,
                    }))
                  }
                  className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingPassword}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0B4650] px-4 py-2.5 font-semibold text-white transition hover:bg-[#093a42] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LockKeyhole className="h-4 w-4" />
                {isSavingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close edit profile dialog"
            onClick={closeEditModal}
            className="absolute inset-0 bg-black/50"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="edit-profile-title" className="text-xl font-bold text-[#0B4650]">
                  Edit Profile
                </h2>
                <p className="mt-1 text-sm text-gray-500">Update your display name.</p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label
                  htmlFor="display-name"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Display Name
                </label>
                <input
                  id="display-name"
                  type="text"
                  autoFocus
                  required
                  maxLength={120}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="min-h-10 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingName}
                  className="min-h-10 rounded-lg bg-[#159B43] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#118037] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingName ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
