// src/pages/watch/Watch.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  ThumbsUp,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Bell,
  CheckCircle2,
  Copy,
  Facebook,
  Send,
  Instagram,
  ChevronRight,
  ChevronLeft,
  ListPlus,
  Check,
  Plus,
  X,
  RefreshCcw,
} from "lucide-react";

import {
  getVideoById,
  toggleVideoLike,
  incrementVideoView,
} from "../../lib/api/video";

import { toggleSubscription } from "../../lib/api/subscription";
import { addToWatchHistory } from "../../lib/api/watchHistory";

import {
  addVideoToPlaylist,
  getUserPlaylists,
  removeVideoFromPlaylist,
} from "../../lib/api/playlist";

import { extractMessageFromHtml } from "../../utils/extractMessageFromHtml";
import { VideoPlayer } from "../../components/media/VideoPlayer";
import { CommentsSection } from "./section/CommentSection";
import { SuggestedVideos } from "./section/SuggestedVideos";
import { CreatePlaylistModal } from "./components/CreatePlaylistModal";
import { useAuth } from "../../context/auth-context";

/* -------------------- Types -------------------- */
type OwnerUser = {
  _id: string;
  username: string;
  fullname: string;
  avatar?: string;
};

type ApiVideo = {
  _id: string;
  videoFile: string;
  thumbnail: string;
  title: string;
  description: string;
  duration: number;
  views: string;
  isPublished: boolean;
  owner: OwnerUser[];
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentCounts: number;

  isLiked?: boolean;
  isSubscribed?: boolean;
};

type ApiResponse<T> = {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
};

type ApiPlaylist = {
  _id: string;
  name: string;
  description?: string;
  videos?: any[]; // can be ids or docs depending on your backend
  createdAt?: string;
  updatedAt?: string;
};

type Paginated<T> = {
  docs?: T[];
  totalDocs?: number;
  limit?: number;
  page?: number;
  totalPages?: number;
};

/* -------------------- Helpers -------------------- */

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const mo = Math.floor(day / 30);
  const yr = Math.floor(day / 365);

  if (yr > 0) return `${yr} year${yr > 1 ? "s" : ""} ago`;
  if (mo > 0) return `${mo} month${mo > 1 ? "s" : ""} ago`;
  if (day > 0) return `${day} day${day > 1 ? "s" : ""} ago`;
  if (hr > 0) return `${hr} hour${hr > 1 ? "s" : ""} ago`;
  if (min > 0) return `${min} minute${min > 1 ? "s" : ""} ago`;
  return "just now";
};

const viewsText = (views: string) => {
  const n = Number(views || 0);
  if (!Number.isFinite(n)) return "0 views";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B views`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`;
  return `${n} view${n === 1 ? "" : "s"}`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

const ButtonPill = ({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={[
      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
      "bg-black/5 text-black/80 hover:bg-black/10",
      "dark:bg-white/5 dark:text-white/85 dark:hover:bg-white/10",
      disabled ? "opacity-60 cursor-not-allowed" : "",
      active
        ? "ring-2 ring-black/25 dark:ring-white/25 bg-black/10 dark:bg-white/10"
        : "",
    ].join(" ")}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const Skeleton = () => (
  <div className="animate-pulse">
    <div className="aspect-video w-full rounded-2xl bg-black/10 dark:bg-white/10" />
    <div className="mt-5 h-6 w-3/4 rounded bg-black/10 dark:bg-white/10" />
    <div className="mt-3 flex gap-3">
      <div className="h-10 w-64 rounded-full bg-black/10 dark:bg-white/10" />
      <div className="h-10 w-28 rounded-full bg-black/10 dark:bg-white/10" />
    </div>
    <div className="mt-5 h-28 w-full rounded-2xl bg-black/10 dark:bg-white/10" />
  </div>
);

const getIdsFromPlaylistVideos = (videos: any[] | undefined): string[] => {
  if (!Array.isArray(videos)) return [];
  return videos
    .map((v) => String(v?._id || v))
    .filter((x) => x && x !== "undefined" && x !== "null");
};

const extractPlaylists = (payload: any): ApiPlaylist[] => {
  // your API should be { data: { docs: [...] } }
  const base = payload?.data ?? payload?.message ?? payload;
  const docs =
    base?.docs ||
    base?.data?.docs ||
    base?.data?.data?.docs ||
    base?.data ||
    base;

  if (Array.isArray(docs)) return docs as ApiPlaylist[];
  if (Array.isArray(docs?.docs)) return docs.docs as ApiPlaylist[];
  return [];
};

/* -------------------------------- Watch Page -------------------------------- */

export const Watch = () => {
  const navigate = useNavigate();
  const { videoId } = useParams<{ videoId: string }>();
  const { state } = useAuth();

  const authed = state.status === "authed";
  const userId = authed ? String((state as any)?.user?._id) : null;

  const [video, setVideo] = useState<ApiVideo | null>(null);
  const [loading, setLoading] = useState(true);

  // Like states
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [liking, setLiking] = useState(false);

  // Subscribe states
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  // Share
  const [shareOpen, setShareOpen] = useState(false);
  const shareWrapRef = useRef<HTMLDivElement | null>(null);

  // ✅ More menu
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreMode, setMoreMode] = useState<"root" | "playlist">("root");
  const moreWrapRef = useRef<HTMLDivElement | null>(null);

  // playlists from backend
  const [playlists, setPlaylists] = useState<ApiPlaylist[]>([]);
  const [plLoading, setPlLoading] = useState(false);

  // create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // watch later local
  // const [watchLaterOn, setWatchLaterOn] = useState(false);

  // ✅ ensures we increment view only once per video
  const viewIncrementedForRef = useRef<string | null>(null);

  // ✅ ensures we add watch history only once per video
  const watchHistoryAddedForRef = useRef<string | null>(null);

  /* -------------------- ✅ Suggested Videos Infinite Scroll -------------------- */
  const SUGGEST_BATCH = 12;
  const SUGGEST_MAX = 120; // safety cap (prevents endless requests if backend has no "total")
  const [suggestLimit, setSuggestLimit] = useState(SUGGEST_BATCH);
  const [suggestBumping, setSuggestBumping] = useState(false);
  const suggestedSentinelRef = useRef<HTMLDivElement | null>(null);
  const suggestLockRef = useRef(false);

  // reset suggested limit when the route changes
  useEffect(() => {
    setSuggestLimit(SUGGEST_BATCH);
  }, [videoId]);

  // IntersectionObserver that increases limit when user scrolls near bottom of sidebar
  useEffect(() => {
    const el = suggestedSentinelRef.current;
    if (!el) return;
    if (!video?._id) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (suggestLockRef.current) return;

        // if we already reached max, stop
        if (suggestLimit >= SUGGEST_MAX) return;

        suggestLockRef.current = true;
        setSuggestBumping(true);

        setSuggestLimit((prev) => Math.min(SUGGEST_MAX, prev + SUGGEST_BATCH));

        // small cooldown so observer doesn't fire multiple bumps instantly
        window.setTimeout(() => {
          suggestLockRef.current = false;
          setSuggestBumping(false);
        }, 800);
      },
      {
        root: null,
        rootMargin: "900px", // load earlier before hitting bottom
        threshold: 0,
      },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [video?._id, suggestLimit]);
  /* -------------------------------------------------------------------------- */

  const shareUrl = useMemo(() => {
    if (!video?._id) return "";
    return `${window.location.origin}/watch/${video._id}`;
  }, [video?._id]);

  const shareText = useMemo(() => {
    const t = video?.title || "Check this video";
    return t.length > 120 ? `${t.slice(0, 117)}...` : t;
  }, [video?.title]);

  const shareLinks = useMemo(() => {
    const u = encodeURIComponent(shareUrl);
    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(
        `${shareText} ${shareUrl}`,
      )}`,
      instagram: `https://www.instagram.com/`,
    };
  }, [shareUrl, shareText]);

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
      toast.error("You need to login", { position: "bottom-right" });
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");
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

  // ✅ fetch video (existing behavior)
  useEffect(() => {
    if (!videoId) return;

    const fetchVideo = async () => {
      try {
        setLoading(true);

        const res = await getVideoById(videoId);
        const payload = res.data as ApiResponse<ApiVideo[]>;

        const first = payload.data?.[0] ?? null;
        setVideo(first);

        setLikesCount(first?.likesCount ?? 0);
        setLiked(Boolean(first?.isLiked ?? false));
        setSubscribed(Boolean(first?.isSubscribed ?? false));

        // ✅ Increment view once
        if (first?._id && viewIncrementedForRef.current !== first._id) {
          viewIncrementedForRef.current = first._id;

          incrementVideoView(first._id)
            .then(() => {
              setVideo((prev) => {
                if (!prev) return prev;
                const n = Number(prev.views || 0);
                if (!Number.isFinite(n)) return prev;
                return { ...prev, views: String(n + 1) };
              });
            })
            .catch(() => {});
        }
      } catch (err: any) {
        showError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId]);

  // ✅ Watch history API (fire-and-forget)
  useEffect(() => {
    const id = video?._id;
    if (!id) return;

    if (watchHistoryAddedForRef.current === id) return;
    watchHistoryAddedForRef.current = id;

    addToWatchHistory(id).catch(() => {});
  }, [video?._id]);

  // ✅ sync watch later state
  useEffect(() => {
    if (!video?._id) return;
    // setWatchLaterOn(isInWatchLater(video._id));
  }, [video?._id]);

  // close share toolbar (existing)
  useEffect(() => {
    if (!shareOpen) return;

    const onDown = (e: MouseEvent) => {
      if (!shareWrapRef.current) return;
      if (!shareWrapRef.current.contains(e.target as Node)) setShareOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShareOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [shareOpen]);

  // ✅ close more menu (but do NOT close if modal open)
  useEffect(() => {
    if (!moreOpen) return;

    const onDown = (e: MouseEvent) => {
      if (createModalOpen) return; // ✅ important
      if (!moreWrapRef.current) return;
      if (!moreWrapRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
        setMoreMode("root");
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (createModalOpen) {
        setCreateModalOpen(false); // ✅ close modal only
        return;
      }
      setMoreOpen(false);
      setMoreMode("root");
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen, createModalOpen]);

  const owner = useMemo(() => video?.owner?.[0], [video]);
  const channelId = owner?._id;

  const handleToggleLike = async () => {
    if (!video?._id) return;
    if (liking) return;

    const prevLiked = liked;
    const prevCount = likesCount;

    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

    setLiked(nextLiked);
    setLikesCount(nextCount);
    setLiking(true);

    try {
      const res = await toggleVideoLike(video._id);
      const msg: string = res?.data?.message || "";
      const lower = msg.toLowerCase();

      const serverLiked = lower.includes("created")
        ? true
        : lower.includes("deleted")
          ? false
          : nextLiked;

      if (serverLiked !== nextLiked) {
        setLiked(serverLiked);
        const reconciled = Math.max(
          0,
          prevCount + (serverLiked ? 1 : 0) - (prevLiked ? 1 : 0),
        );
        setLikesCount(reconciled);
      }
    } catch (err: any) {
      setLiked(prevLiked);
      setLikesCount(prevCount);
      showError(err);
    } finally {
      setLiking(false);
    }
  };

  const handleToggleSubscribe = async () => {
    if (!channelId) return;
    if (subscribing) return;

    const prev = subscribed;
    const next = !prev;

    setSubscribed(next);
    setSubscribing(true);

    try {
      const res = await toggleSubscription(channelId);
      const msg: string = res?.data?.message || "";
      const lower = msg.toLowerCase();

      const serverSubscribed = lower.includes("unsub")
        ? false
        : lower.includes("subscribed")
          ? true
          : next;

      setSubscribed(serverSubscribed);
    } catch (err: any) {
      setSubscribed(prev);
      showError(err);
    } finally {
      setSubscribing(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  const openShareLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  /* -------------------- Playlist UI (backend) -------------------- */

  const fetchPlaylists = async () => {
    if (!userId) return;
    setPlLoading(true);
    try {
      const res = await getUserPlaylists(userId, 1, 50);
      const payload = res.data as ApiResponse<Paginated<ApiPlaylist>>;
      const list = extractPlaylists(payload);

      setPlaylists(list);
    } catch (err: any) {
      showError(err);
      setPlaylists([]);
    } finally {
      setPlLoading(false);
    }
  };

  const openPlaylistPanel = async () => {
    if (!authed || !userId) {
      toast.error("You need to login", { position: "bottom-right" });
      navigate("/login", { replace: true });
      return;
    }
    setMoreMode("playlist");
    await fetchPlaylists();
  };

  const toggleVideoInPlaylist = async (pl: ApiPlaylist) => {
    const vid = video?._id;
    if (!vid) return;

    const ids = getIdsFromPlaylistVideos(pl.videos);
    const already = ids.includes(String(vid));

    // optimistic update
    const prev = playlists;
    setPlaylists((p) =>
      p.map((x) => {
        if (x._id !== pl._id) return x;
        const currentIds = getIdsFromPlaylistVideos(x.videos);
        const nextIds = already
          ? currentIds.filter((id) => id !== String(vid))
          : [String(vid), ...currentIds];

        return { ...x, videos: nextIds };
      }),
    );

    try {
      if (already) {
        await removeVideoFromPlaylist(pl._id, vid);
      } else {
        await addVideoToPlaylist(pl._id, vid);
      }
    } catch (err: any) {
      setPlaylists(prev); // revert
      showError(err);
    }
  };

  /* -------------------- More menu -------------------- */

  const openMoreMenu = () => {
    setMoreOpen((v) => !v);
    setShareOpen(false);
    setMoreMode("root");
  };

  const isVideoInPlaylist = (pl: ApiPlaylist) => {
    const vid = video?._id;
    if (!vid) return false;
    return getIdsFromPlaylistVideos(pl.videos).includes(String(vid));
  };

  return (
    <section className="min-h-screen w-full bg-light-background text-black dark:bg-dark-background dark:text-white">
      <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />

      <div className="mx-auto w-full px-4 py-6 md:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT */}
          <div className="lg:col-span-8">
            {loading ? (
              <Skeleton />
            ) : !video ? (
              <div className="rounded-3xl border border-black/10 bg-black/2 p-8 text-center dark:border-white/10 dark:bg-white/3">
                <div className="text-xl font-semibold">Video not found</div>
                <div className="mt-2 text-sm text-black/55 dark:text-white/55">
                  Please check the link or try again.
                </div>
              </div>
            ) : (
              <>
                {/* Player */}
                <div className="overflow-hidden rounded-2xl ring-1 ring-black/10 dark:ring-white/10">
                  <VideoPlayer src={video.videoFile} title={video.title} />
                </div>

                {/* Title */}
                <h1 className="mt-5 text-xl font-semibold leading-snug tracking-tight text-black/90 dark:text-white/90 md:text-2xl">
                  {video.title}
                </h1>

                {/* Channel + actions */}
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Channel */}
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                      {owner?.avatar ? (
                        <img
                          src={owner.avatar}
                          alt={owner.fullname || owner.username}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-green-700 text-lg font-semibold text-white">
                          {(
                            owner?.fullname?.[0] ||
                            owner?.username?.[0] ||
                            "C"
                          ).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-base font-semibold text-black/90 dark:text-white/90">
                        {owner?.fullname || owner?.username || "Channel"}
                        <CheckCircle2 className="h-4 w-4 text-black/50 dark:text-white/50" />
                      </div>

                      <div className="text-sm text-black/55 dark:text-white/55">
                        {viewsText(video.views)} • {timeAgo(video.createdAt)}
                      </div>
                    </div>

                    {/* Subscribe */}
                    <button
                      type="button"
                      onClick={handleToggleSubscribe}
                      disabled={subscribing || !channelId}
                      className={[
                        "ml-2 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition",
                        subscribed
                          ? "bg-black/10 text-black hover:bg-black/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                          : "bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85",
                        subscribing ? "opacity-70 cursor-not-allowed" : "",
                      ].join(" ")}
                    >
                      <Bell className="h-4 w-4" />
                      {subscribed ? "Subscribed" : "Subscribe"}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <ButtonPill
                      icon={
                        <ThumbsUp
                          className={["h-4 w-4", liked ? "scale-105" : ""].join(
                            " ",
                          )}
                        />
                      }
                      label={`${likesCount}`}
                      onClick={handleToggleLike}
                      active={liked}
                      disabled={liking}
                    />

                    <ButtonPill
                      icon={<MessageCircle className="h-4 w-4" />}
                      label={`${video.commentCounts ?? 0}`}
                    />

                    {/* Share */}
                    <div ref={shareWrapRef} className="relative">
                      <ButtonPill
                        icon={<Share2 className="h-4 w-4" />}
                        label="Share"
                        onClick={() => {
                          setShareOpen((v) => !v);
                          setMoreOpen(false);
                          setMoreMode("root");
                        }}
                        active={shareOpen}
                        disabled={!video?._id}
                      />

                      {shareOpen && (
                        <div className="absolute left-0 top-full z-30 mt-3 w-75 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-[#0f0f10]">
                          <div className="flex items-center justify-between px-4 py-3">
                            <div className="text-sm font-semibold text-black/85 dark:text-white/85">
                              Share
                            </div>
                          </div>

                          <div className="px-3 pb-3">
                            <div className="grid grid-cols-4 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  openShareLink(shareLinks.whatsapp);
                                  setShareOpen(false);
                                }}
                                className="group flex flex-col items-center gap-2 rounded-2xl p-3 transition hover:bg-black/5 dark:hover:bg-white/5"
                                aria-label="Share on WhatsApp"
                              >
                                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/25 transition group-hover:scale-[1.03]">
                                  <Send className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <span className="text-[11px] font-semibold text-black/70 dark:text-white/70">
                                  WhatsApp
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  openShareLink(shareLinks.facebook);
                                  setShareOpen(false);
                                }}
                                className="group flex flex-col items-center gap-2 rounded-2xl p-3 transition hover:bg-black/5 dark:hover:bg-white/5"
                                aria-label="Share on Facebook"
                              >
                                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-500/15 ring-1 ring-sky-500/25 transition group-hover:scale-[1.03]">
                                  <Facebook className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                                </div>
                                <span className="text-[11px] font-semibold text-black/70 dark:text-white/70">
                                  Facebook
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  await copyLink();
                                  openShareLink(shareLinks.instagram);
                                  setShareOpen(false);
                                }}
                                className="group flex flex-col items-center gap-2 rounded-2xl p-3 transition hover:bg-black/5 dark:hover:bg-white/5"
                                aria-label="Share on Instagram"
                              >
                                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-fuchsia-500/15 ring-1 ring-fuchsia-500/25 transition group-hover:scale-[1.03]">
                                  <Instagram className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-400" />
                                </div>
                                <span className="text-[11px] font-semibold text-black/70 dark:text-white/70">
                                  Instagram
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  await copyLink();
                                  setShareOpen(false);
                                }}
                                className="group flex flex-col items-center gap-2 rounded-2xl p-3 transition hover:bg-black/5 dark:hover:bg-white/5"
                                aria-label="Copy link"
                              >
                                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/25 transition group-hover:scale-[1.03]">
                                  <Copy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <span className="text-[11px] font-semibold text-black/70 dark:text-white/70">
                                  Copy
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ✅ More (3 dots) */}
                    <div ref={moreWrapRef} className="relative">
                      <button
                        type="button"
                        aria-label="More"
                        onClick={openMoreMenu}
                        className={[
                          "rounded-full p-2 transition",
                          "bg-black/5 text-black/70 hover:bg-black/10",
                          "dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10",
                          moreOpen
                            ? "ring-2 ring-black/20 dark:ring-white/20"
                            : "",
                        ].join(" ")}
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>

                      {moreOpen && (
                        <div className="absolute right-0 top-full z-40 mt-3 w-85 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-[#0f0f10]">
                          {/* Header */}
                          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
                            {moreMode === "root" ? (
                              <>
                                <div className="text-sm font-semibold text-black/85 dark:text-white/85">
                                  Options
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMoreOpen(false);
                                    setMoreMode("root");
                                  }}
                                  className="grid h-8 w-8 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                                  aria-label="Close"
                                >
                                  <X className="h-4 w-4 text-black/70 dark:text-white/70" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setMoreMode("root")}
                                  className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold text-black/80 hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/5"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                  Back
                                </button>
                                <div className="text-sm font-semibold text-black/85 dark:text-white/85">
                                  Save to playlist
                                </div>
                                <div className="w-8" />
                              </>
                            )}
                          </div>

                          {/* Body */}
                          {moreMode === "root" ? (
                            <div className="p-2">
                              <button
                                type="button"
                                onClick={openPlaylistPanel}
                                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5"
                              >
                                <span className="flex items-center gap-3">
                                  <ListPlus className="h-5 w-5 text-black/70 dark:text-white/70" />
                                  <span className="text-sm font-semibold text-black/85 dark:text-white/85">
                                    Add to playlist
                                  </span>
                                </span>
                                <ChevronRight className="h-4 w-4 text-black/50 dark:text-white/50" />
                              </button>
                            </div>
                          ) : (
                            <div className="p-2">
                              {/* Top row actions */}
                              <div className="mb-2 flex items-center justify-between px-2">
                                <button
                                  type="button"
                                  onClick={() => setCreateModalOpen(true)}
                                  className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
                                >
                                  <Plus className="h-4 w-4" />
                                  Create playlist
                                </button>

                                <button
                                  type="button"
                                  onClick={fetchPlaylists}
                                  disabled={plLoading}
                                  className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-black/80 ring-1 ring-black/10 hover:bg-black/10 disabled:opacity-60 dark:bg-white/5 dark:text-white/80 dark:ring-white/10 dark:hover:bg-white/10"
                                >
                                  <RefreshCcw
                                    className={[
                                      "h-4 w-4",
                                      plLoading ? "animate-spin" : "",
                                    ].join(" ")}
                                  />
                                  Refresh
                                </button>
                              </div>

                              {/* Playlists list */}
                              {plLoading ? (
                                <div className="px-3 py-6 text-sm text-black/60 dark:text-white/60">
                                  Loading playlists...
                                </div>
                              ) : playlists.length === 0 ? (
                                <div className="px-3 py-6 text-sm text-black/70 dark:text-white/70">
                                  No playlists yet. Create one to start saving
                                  videos.
                                </div>
                              ) : (
                                <div className="max-h-75 overflow-y-auto">
                                  {playlists.map((pl) => {
                                    const checked = isVideoInPlaylist(pl);
                                    const count = getIdsFromPlaylistVideos(
                                      pl.videos,
                                    ).length;

                                    return (
                                      <button
                                        key={pl._id}
                                        type="button"
                                        onClick={() =>
                                          toggleVideoInPlaylist(pl)
                                        }
                                        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5"
                                      >
                                        <div className="min-w-0">
                                          <div className="truncate text-sm font-semibold text-black/85 dark:text-white/85">
                                            {pl.name}
                                          </div>
                                          <div className="mt-0.5 text-xs text-black/55 dark:text-white/55">
                                            {count} video
                                            {count === 1 ? "" : "s"}
                                          </div>
                                        </div>

                                        <div
                                          className={[
                                            "grid h-9 w-9 place-items-center rounded-full ring-1",
                                            checked
                                              ? "bg-black text-white ring-black/20 dark:bg-white dark:text-black dark:ring-white/20"
                                              : "bg-black/5 text-black/70 ring-black/10 dark:bg-white/10 dark:text-white/70 dark:ring-white/10",
                                          ].join(" ")}
                                        >
                                          {checked ? (
                                            <Check className="h-4 w-4" />
                                          ) : (
                                            <Plus className="h-4 w-4" />
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              <div className="px-3 pb-3 pt-2 text-xs text-black/50 dark:text-white/50">
                                Select a playlist to save/remove this video.
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="mt-5 rounded-2xl border border-black/10 bg-black/2 p-5 dark:border-white/10 dark:bg-white/3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-black/70 dark:text-white/70">
                    <span className="font-semibold text-black/85 dark:text-white/85">
                      {viewsText(video.views)}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-black/85 dark:text-white/85">
                      {formatDate(video.createdAt)}
                    </span>
                    <span>•</span>
                    <span>Duration: {Math.round(video.duration)}s</span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-black/80 dark:text-white/80">
                    {video.description || "No description."}
                  </p>
                </div>

                <CommentsSection videoId={video._id} />
              </>
            )}
          </div>

          {/* RIGHT */}
          <aside className="lg:col-span-4">
            {!loading && video ? (
              <>
                <SuggestedVideos videoId={video._id} limit={suggestLimit} />

                {/* ✅ sentinel for infinite scroll */}
                <div ref={suggestedSentinelRef} className="h-1 w-full" />

                {/* ✅ tiny hint while we bump limit */}
                {suggestBumping ? (
                  <div className="mt-3 rounded-2xl border border-black/10 bg-black/2 p-3 text-center text-xs text-black/60 dark:border-white/10 dark:bg-white/3 dark:text-white/60">
                    Loading more suggestions…
                  </div>
                ) : null}

                {/* optional end hint */}
                {suggestLimit >= SUGGEST_MAX ? (
                  <div className="mt-3 rounded-2xl border border-black/10 bg-black/2 p-3 text-center text-xs text-black/55 dark:border-white/10 dark:bg-white/3 dark:text-white/55">
                    You’ve reached the maximum suggestions loaded.
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-3xl border border-black/10 bg-black/2 p-5 dark:border-white/10 dark:bg-white/3">
                <div className="text-lg font-semibold">Up next</div>
                <div className="mt-4 space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex gap-3 rounded-2xl p-2">
                      <div className="h-18 w-32 shrink-0 animate-pulse rounded-xl bg-black/10 dark:bg-white/10" />
                      <div className="min-w-0 flex-1">
                        <div className="h-4 w-11/12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                        <div className="mt-2 h-3 w-5/12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                        <div className="mt-2 h-3 w-7/12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* ✅ Create Playlist Modal */}
      <CreatePlaylistModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => {
          // ✅ modal closes, keep user on playlist list so they can select
          fetchPlaylists();
          setMoreOpen(true);
          setMoreMode("playlist");
        }}
      />
    </section>
  );
};
