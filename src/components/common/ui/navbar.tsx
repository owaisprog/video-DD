import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Menu,
  Search,
  Mic,
  Plus,
  Sun,
  Moon,
  User,
  Settings2Icon,
  LogOut,
  ArrowRight,
  LogInIcon,
} from "lucide-react";
import { useTheme } from "../../../theme";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/auth-context";
import toast from "react-hot-toast";
import { extractMessageFromHtml } from "../../../utils/extractMessageFromHtml";
import { logoutApi } from "../../../lib/api/auth";

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const { state, revalidate } = useAuth();
  const navigate = useNavigate();

  const [loggingOut, setLoggingOut] = useState(false);

  const initials = useMemo(() => {
    if (state.status !== "authed") return "O";
    const u: any = state.user;
    const name = u?.fullname || u?.username || u?.email || "User";
    return String(name).trim().charAt(0).toUpperCase();
  }, [state]);

  const showError = (err: any) => {
    const data = err?.response?.data;

    const serverMessage =
      typeof data === "string"
        ? extractMessageFromHtml(data)
        : data?.message || data?.error || "";

    const status = err?.response?.status;
    const msg = (serverMessage || err?.message || "").toLowerCase();

    const isJwtExpired = msg.includes("jwt expired");
    const isUnauthorized = status === 401;

    if (isJwtExpired || isUnauthorized) {
      // If token already invalid, treat as logged out
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");
      revalidate();
      navigate("/login", { replace: true });
      return;
    }

    toast.error(
      serverMessage ||
        err?.message ||
        "Something went wrong. Please try again.",
      { position: "bottom-right" },
    );
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      // ✅ 1) Call backend logout (clears cookies + refreshToken on server)
      await logoutApi();

      // ✅ 2) Clear client tokens (if you store accessToken in storage)
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");

      // ✅ 3) Update auth state
      await revalidate();

      // ✅ 4) Close dropdown + redirect
      setOpen(false);
      navigate("/login", { replace: true });
    } catch (err: any) {
      // still clear local tokens even if api fails (safe fallback)
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");
      await revalidate();

      showError(err);
    } finally {
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(e: any) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="w-full bg-light-background text-dark dark:bg-dark-background dark:text-light">
      <div className="mx-auto flex h-16 items-center gap-4 px-4">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-black/10 dark:hover:bg-white/10">
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <img
              src="/icons/logo.png"
              alt="logo"
              className="h-9 w-9 object-cover"
            />
            <span className="text-lg font-semibold">Vide-DD</span>
          </div>
        </div>

        {/* Center */}
        <div className="flex flex-1 justify-center">
          <div className="flex w-full max-w-[720px] items-center gap-3">
            <div className="flex h-10 flex-1 items-center rounded-full bg-[#f2f2f2] px-4 ring-1 ring-black/10 dark:bg-[#121212] dark:ring-white/10">
              <span className="text-sm text-black/50 dark:text-white/50">
                Search
              </span>
            </div>

            <button className="grid h-10 w-10 place-items-center rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15">
              <Search className="h-5 w-5" />
            </button>

            <button className="grid h-10 w-10 place-items-center rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15">
              <Mic className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Right */}
        <div className="relative flex items-center gap-3" ref={dropdownRef}>
          <button className="inline-flex h-10 items-center gap-2 rounded-full bg-black/5 px-4 text-sm font-medium hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15">
            <Plus className="h-4 w-4" />
            Create
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggle}
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* Profile Button */}
          <button
            onClick={() => setOpen((p) => !p)}
            className="grid h-8 w-8 place-items-center rounded-full bg-green-600 text-white font-medium cursor-pointer"
          >
            {initials}
          </button>

          {/* Dropdown */}
          {open && (
            <ProfileDropdown
              authed={state.status === "authed"}
              onLogout={handleLogout}
              loggingOut={loggingOut}
            />
          )}
        </div>
      </div>
    </header>
  );
}

/* ===========================
   Profile Dropdown Component
=========================== */

function ProfileDropdown({
  authed,
  onLogout,
  loggingOut,
}: {
  authed: boolean;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const { theme, toggle } = useTheme();
  const [showAppearanceDropDown, setShowAppearanceDropDown] = useState(false);

  const handleToggle = () => {
    setShowAppearanceDropDown((prev) => !prev);
  };

  return (
    <div className="absolute z-20 right-0 top-14 w-72 rounded-xl bg-[#282828] text-white shadow-2xl ring-1 ring-black/30 overflow-hidden">
      {/* ✅ Auth section */}
      <div className="border-b border-white/10">
        {!authed ? (
          <Link to={"/login"}>
            <button className="w-full p-4 hover:bg-white/10 text-left cursor-pointer flex justify-start items-center gap-2">
              <LogInIcon className="h-5 w-5" />
              <span>Login</span>
            </button>
          </Link>
        ) : (
          <button
            onClick={onLogout}
            disabled={loggingOut}
            className="w-full p-4 hover:bg-white/10 text-left cursor-pointer flex justify-start items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <LogOut className="h-5 w-5" />
            <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
          </button>
        )}
      </div>

      {/* Menu */}
      <div className="py-2 text-sm">
        <Link to="/account">
          <button className="w-full px-4 py-2 hover:bg-white/10 text-left cursor-pointer flex justify-start items-center gap-2">
            <User className="h-5 w-5" />
            <span>Account</span>
          </button>
        </Link>

        <AppearanceDropdown
          onBack={handleToggle}
          showAppearanceDropDown={showAppearanceDropDown}
          theme={theme}
          setTheme={toggle as any}
        />

        <button className="w-full px-4 py-2 hover:bg-white/10 text-left cursor-pointer flex justify-start items-center gap-2">
          <Settings2Icon className="h-5 w-5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}

function AppearanceDropdown({
  showAppearanceDropDown,
  onBack,
  theme,
  setTheme,
}: {
  onBack: () => void;
  showAppearanceDropDown: boolean;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}) {
  return (
    <div>
      {/* Header */}
      <div
        onClick={onBack}
        className="w-full px-4 py-2 hover:bg-white/10 text-left cursor-pointer flex justify-start items-center gap-2"
      >
        <ArrowRight className="h-5 w-5" />
        <p className="font-medium">Appearance</p>
      </div>

      {/* Options */}
      {showAppearanceDropDown && (
        <div className="py-2 text-sm">
          {(["light", "dark"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setTheme(item)}
              className="w-full px-4 py-2 hover:bg-white/10 cursor-pointer flex items-center justify-start gap-2"
            >
              {item === "dark" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <span className="capitalize">{item}</span>
              {theme === item && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
