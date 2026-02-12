import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, type To } from "react-router-dom";
import toast from "react-hot-toast";
import { getSubscribedChannels } from "../../../lib/api/subscription";
import { useAuth } from "../../../context/auth-context";
import { Image, Text } from "lucide-react";

/* ---------------- Types ---------------- */

type NavBase = {
  label: string;
  icon: React.ReactNode;
};

type NavLinkItem = NavBase & {
  to: To;
};

type NavActionItem = NavBase & {
  onClick: () => void;
};

type NavItem = NavLinkItem | NavActionItem;

type ChannelItem = {
  _id: string;
  name: string;
  avatar?: string;
};

type ApiResponse<T> = {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
};

export default function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { state } = useAuth();

  const topNav: NavItem[] = [
    { label: "Home", to: "/", icon: <HomeIcon className="h-6 w-6" /> },
    {
      label: "Thread",
      icon: <Text className="h-6 w-6" />,
      to: "/threads",
    },
  ];

  const youNav: NavLinkItem[] = [
    {
      label: "History",
      to: "/watch-history",
      icon: <HistoryIcon className="h-6 w-6" />,
    },
    {
      label: "Playlists",
      to: "/playlists",
      icon: <PlaylistsIcon className="h-6 w-6" />,
    },
  ];

  const [subscriptions, setSubscriptions] = useState<ChannelItem[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);

  const authed = state.status === "authed";
  const userId = authed ? String((state as any).user?._id || "") : "";

  const showAuthError = (err: any) => {
    const status = err?.response?.status;
    const msg = String(
      err?.response?.data?.message || err?.message || "",
    ).toLowerCase();

    if (status === 401 || msg.includes("jwt expired")) {
      toast.error("You need to login", { position: "bottom-right" });
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");
      navigate("/login", { replace: true });
      return true;
    }
    return false;
  };

  const getInitials = (name: string) => {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const a = parts[0]?.[0] || "C";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase();
  };

  /**
   * ✅ Normalize backend response for subscribed channels
   * Expected (from fixed backend):
   * [
   *   { _id, subscriber, channel: { _id, username, fullname, avatar }, createdAt... }
   * ]
   */
  const normalizeSubscribedChannels = (data: any[]): ChannelItem[] => {
    const out: ChannelItem[] = [];

    for (const item of data || []) {
      const channelObj = Array.isArray(item?.channel)
        ? item.channel?.[0]
        : item?.channel;

      const _id = channelObj?._id || item?.channel?._id;
      if (!_id) continue;

      const name =
        channelObj?.fullname ||
        channelObj?.username ||
        channelObj?.name ||
        "Channel";

      const avatar = channelObj?.avatar;

      out.push({
        _id: String(_id),
        name: String(name),
        avatar,
      });
    }

    // de-dupe by _id
    const map = new Map<string, ChannelItem>();
    for (const c of out) map.set(c._id, c);
    return Array.from(map.values());
  };

  /* ---------------- Fetch subscriptions ---------------- */
  useEffect(() => {
    let alive = true;

    // guest: don't fetch
    if (!authed || !userId) {
      setSubsLoading(false);
      setSubscriptions([]);
      return;
    }

    const fetchSubscribed = async () => {
      try {
        setSubsLoading(true);
        const res = await getSubscribedChannels(userId);
        const payload = res.data as ApiResponse<any>;

        const list = Array.isArray(payload?.data) ? payload.data : [];
        const normalized = normalizeSubscribedChannels(list);

        if (!alive) return;
        setSubscriptions(normalized);
      } catch (err: any) {
        if (!alive) return;
        const handled = showAuthError(err);
        if (!handled) setSubscriptions([]);
      } finally {
        if (alive) setSubsLoading(false);
      }
    };

    fetchSubscribed();

    return () => {
      alive = false;
    };
  }, [authed, userId]);

  const subscriptionsSection = useMemo(() => {
    if (!authed) {
      return (
        <div className="mt-2 px-3 text-sm text-black/55 dark:text-white/55">
          Login to see subscriptions.
        </div>
      );
    }

    if (subsLoading) {
      return (
        <div className="mt-1 space-y-2 px-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            >
              <div className="h-9 w-9 animate-pulse rounded-full bg-[#f2f2f2] dark:bg-[#272727]" />
              <div className="h-4 w-40 animate-pulse rounded bg-[#f2f2f2] dark:bg-[#272727]" />
            </div>
          ))}
        </div>
      );
    }

    if (!subscriptions.length) {
      return (
        <div className="mt-2 px-3 text-sm text-black/55 dark:text-white/55">
          No subscriptions yet.
        </div>
      );
    }

    return (
      <div className="mt-1 space-y-0.5">
        {subscriptions.map((s) => (
          <Link key={s._id} to={`/channel/${s._id}`} className="block">
            <div className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[#f2f2f2] dark:hover:bg-[#272727]">
              <Avatar label={getInitials(s.name)} avatar={s.avatar} />
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium tracking-tight">
                {s.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    );
  }, [subscriptions, subsLoading, authed]);

  return (
    <aside className="h-screen w-[280px] shrink-0 flex-none bg-white text-[#272727] dark:bg-[#0f0f0f] dark:text-white">
      <div className="h-full overflow-y-auto px-4 py-4">
        {/* Top section */}
        <div className="space-y-1">
          {topNav.map((item) => {
            const isLink = "to" in item;
            const active = isLink && pathname === String(item.to);

            const row = (
              <NavRow active={!!active} icon={item.icon} label={item.label} />
            );

            if (isLink) {
              return (
                <Link key={item.label} to={item.to} className="block">
                  {row}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="block w-full text-left"
              >
                {row}
              </button>
            );
          })}
        </div>

        <Divider />

        {/* ✅ Subscriptions */}
        <SectionHeader title="Subscriptions" />
        {subscriptionsSection}

        <Divider />

        {/* You */}
        <SectionHeader title="You" />
        <div className="mt-1 space-y-0.5">
          {youNav.map((item) => {
            const active = pathname === String(item.to);
            return (
              <Link key={item.label} to={item.to} className="block">
                <NavRow active={active} icon={item.icon} label={item.label} />
              </Link>
            );
          })}
        </div>

        <div className="h-6" />
      </div>
    </aside>
  );
}

/* ---------- UI building blocks ---------- */

function NavRow({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center gap-3 rounded-xl px-3 py-2.5 transition",
        active
          ? "bg-[#f2f2f2] dark:bg-[#272727]"
          : "hover:bg-[#f2f2f2] dark:hover:bg-[#272727]",
      ].join(" ")}
    >
      <div className="grid h-9 w-9 place-items-center rounded-full bg-[#f2f2f2] text-[#272727] dark:bg-[#272727] dark:text-white">
        {icon}
      </div>
      <span className="text-[15px] font-semibold tracking-tight">{label}</span>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mt-2 flex items-center justify-between px-2 py-2">
      <div className="flex items-center gap-2">
        <h3 className="text-[15px] font-extrabold tracking-tight">{title}</h3>
        <ChevronRightIcon className="h-5 w-5 opacity-80" />
      </div>
    </div>
  );
}

function Divider() {
  return <div className="my-4 h-px w-full bg-[#eaeaea] dark:bg-[#2a2a2a]" />;
}

function Avatar({ label, avatar }: { label: string; avatar?: string }) {
  return (
    <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-[#2b2b2b]">
      {avatar ? (
        <img src={avatar} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center text-sm font-semibold text-white/90">
          {label}
        </div>
      )}
    </div>
  );
}

/* ---------- Icons (inline SVGs) ---------- */

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3.1 3 10v11h6.5v-6.5h5V21H21V10l-9-6.9z"
      />
    </svg>
  );
}

function ShortsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.5 4.5c-1.9 0-3.4 1.5-3.4 3.4 0 .6.2 1.2.5 1.7l-5.2 3c-1.1.6-1.7 1.8-1.7 3.1 0 2 1.6 3.6 3.6 3.6h6.2c2.7 0 4.9-2.2 4.9-4.9V9.4c0-2.7-2.2-4.9-4.9-4.9Z"
      />
      <path fill="currentColor" d="M11 10.2 16.2 13 11 15.8z" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6l6 6-6 6"
      />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12a9 9 0 1 0 3-6.7"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4v6h6"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7v5l3 2"
      />
    </svg>
  );
}

function PlaylistsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M4 6h16M4 12h10M4 18h16"
      />
      <path fill="currentColor" d="M16 10.5 21 12.9 16 15.3z" />
    </svg>
  );
}

function WatchLaterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 7v5l3 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
