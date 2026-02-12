// src/pages/playlists/PlaylistDetails.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { ArrowLeft, Play, RefreshCcw, Trash2 } from "lucide-react";

import {
  getPlaylistById,
  removeVideoFromPlaylist,
} from "../../lib/api/playlist";
import { extractMessageFromHtml } from "../../utils/extractMessageFromHtml";
import { useAuth } from "../../context/auth-context";

type ApiResponse<T> = {
  statusCode: number;
  data: T;
  message: any;
  success: boolean;
};

type OwnerUser = {
  _id: string;
  username?: string;
  fullname?: string;
  avatar?: string;
};

type Video = {
  _id: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  views?: number | string;
  duration?: number;
  owner?: OwnerUser[];
  createdAt?: string;
  updatedAt?: string;
};

type PlaylistDoc = {
  _id: string;
  name: string;
  description?: string;
  Videos?: Video[];
  videos?: any[];
  createdAt?: string;
  updatedAt?: string;
};

const isProbablyUrl = (v?: string) =>
  !!v && (v.startsWith("http://") || v.startsWith("https://"));

const timeAgo = (iso?: string) => {
  if (!iso) return "—";
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

const viewsText = (views?: string | number) => {
  const n = Number(views ?? 0);
  if (!Number.isFinite(n)) return "0 views";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B views`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`;
  return `${n} view${n === 1 ? "" : "s"}`;
};

const SkeletonRow = () => (
  <div className="flex gap-4 rounded-2xl border border-black/10 bg-black/2 p-4 animate-pulse dark:border-white/10 dark:bg-white/3">
    <div className="h-20 w-36 rounded-xl bg-black/10 dark:bg-white/10" />
    <div className="flex-1">
      <div className="h-4 w-3/4 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-3 h-3 w-1/2 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-3 h-3 w-2/3 rounded bg-black/10 dark:bg-white/10" />
    </div>
    <div className="hidden sm:block h-10 w-24 rounded-full bg-black/10 dark:bg-white/10" />
  </div>
);

/**
 * Normalize your backend response into:
 * - playlist doc (name/desc/etc)
 * - videos array
 * - pagination info
 */
function normalizePlaylistResponse(payload: any): {
  playlist: PlaylistDoc | null;
  videos: Video[];
  page: number;
  totalPages: number;
} {
  const d = payload?.data;

  // Common paginated shape: data.docs = [playlistDoc], data.page, data.totalPages
  if (d && Array.isArray(d?.docs)) {
    const doc = d.docs[0] ?? null;
    const vids = Array.isArray(doc?.Videos) ? doc.Videos : [];
    return {
      playlist: doc,
      videos: vids,
      page: Number(d.page ?? 1),
      totalPages: Number(d.totalPages ?? 1),
    };
  }

  // Sometimes data is directly an array of docs
  if (Array.isArray(d)) {
    const doc = d[0] ?? null;
    const vids = Array.isArray(doc?.Videos) ? doc.Videos : [];
    return { playlist: doc, videos: vids, page: 1, totalPages: 1 };
  }

  // Sometimes videos might be on data.Videos or data.videos
  if (d && typeof d === "object") {
    const doc = d as PlaylistDoc;
    const vids =
      (Array.isArray((d as any).Videos) && (d as any).Videos) ||
      (Array.isArray((d as any).videos) && (d as any).videos) ||
      [];
    return { playlist: doc, videos: vids, page: 1, totalPages: 1 };
  }

  // Fallback: maybe payload.message is array
  if (Array.isArray(payload?.message)) {
    const doc = payload.message[0] ?? null;
    const vids = Array.isArray(doc?.Videos) ? doc.Videos : [];
    return { playlist: doc, videos: vids, page: 1, totalPages: 1 };
  }

  return { playlist: null, videos: [], page: 1, totalPages: 1 };
}

function PlaylistDetails() {
  const navigate = useNavigate();
  const { playlistId } = useParams<{ playlistId: string }>();
  const { state } = useAuth();

  const authed = state.status === "authed";

  const [playlist, setPlaylist] = useState<PlaylistDoc | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  const hasMore = page < totalPages;

  const showAuthError = (err: any) => {
    const status = err?.response?.status;
    const raw = err?.response?.data;

    const serverMessage =
      typeof raw === "string"
        ? extractMessageFromHtml(raw)
        : raw?.message || raw?.error || "";

    const msg = String(serverMessage || err?.message || "").toLowerCase();

    if (status === 401 || msg.includes("jwt expired")) {
      toast.error("You need to login", { position: "bottom-right" });
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");
      navigate("/login", { replace: true });
      return true;
    }
    return false;
  };

  const fetchPage = async (
    targetPage: number,
    opts?: { silent?: boolean; append?: boolean },
  ) => {
    if (!playlistId) {
      setError("Missing playlist id.");
      setLoading(false);
      return;
    }

    if (!opts?.silent) setLoading(true);
    setError(null);

    try {
      const res = await getPlaylistById(playlistId, targetPage, limit);
      const payload = res.data as ApiResponse<any>;

      const normalized = normalizePlaylistResponse(payload);

      if (!normalized.playlist) {
        setPlaylist(null);
        setVideos([]);
        setError("Playlist not found.");
        return;
      }

      setPlaylist(normalized.playlist);
      setPage(normalized.page);
      setTotalPages(normalized.totalPages);

      setVideos((prev) => {
        const next = normalized.videos ?? [];
        if (!opts?.append) return next;

        // merge unique by _id
        const map = new Map<string, Video>();
        for (const v of prev) map.set(v._id, v);
        for (const v of next) map.set(v._id, v);
        return Array.from(map.values());
      });
    } catch (err: any) {
      const handled = showAuthError(err);
      if (!handled) {
        const raw = err?.response?.data;
        const msg =
          typeof raw === "string"
            ? extractMessageFromHtml(raw)
            : raw?.message || err?.message || "Failed to load playlist.";
        setError(String(msg));
        toast.error(String(msg), { position: "bottom-right" });
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  // initial + playlistId changes
  useEffect(() => {
    if (!authed) return;
    setVideos([]);
    setPlaylist(null);
    setPage(1);
    setTotalPages(1);
    fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistId, authed]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchPage(1, { silent: true, append: false });
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (!hasMore) return;
    const nextPage = page + 1;
    await fetchPage(nextPage, { silent: true, append: true });
  };

  const handleRemoveVideo = async (videoId: string) => {
    if (!playlistId) return;

    const prev = videos;
    setVideos((p) => p.filter((v) => v._id !== videoId));

    try {
      await removeVideoFromPlaylist(playlistId, videoId);
    } catch (err: any) {
      setVideos(prev);
      showAuthError(err) ||
        toast.error("Failed to remove video", { position: "bottom-right" });
    }
  };

  const count = videos.length;

  if (!authed) {
    return (
      <section className="min-h-screen w-full bg-light-background text-black dark:bg-dark-background dark:text-white">
        <div className="mx-auto w-full px-4 py-10 md:px-6">
          <div className="rounded-3xl border border-black/10 bg-black/2 p-10 text-center dark:border-white/10 dark:bg-white/3">
            <div className="text-xl font-semibold">Login required</div>
            <div className="mt-2 text-sm text-black/55 dark:text-white/55">
              You need to login to view playlists.
            </div>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-6 rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
            >
              Go to login
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen w-full bg-light-background text-black dark:bg-dark-background dark:text-white">
      <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />

      <div className="mx-auto w-full px-4 py-6 md:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate("/playlists")}
              className="grid h-11 w-11 place-items-center rounded-2xl bg-black/5 ring-1 ring-black/10 hover:bg-black/10 dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div>
              <h1 className="text-xl font-semibold tracking-tight text-black/90 dark:text-white/90 md:text-2xl">
                {playlist?.name || "Playlist"}
              </h1>
              <p className="mt-1 text-sm text-black/55 dark:text-white/55">
                {playlist?.description || "No description."} •{" "}
                <span className="font-semibold text-black/80 dark:text-white/80">
                  {count}
                </span>{" "}
                video{count === 1 ? "" : "s"} • Updated{" "}
                {timeAgo(playlist?.updatedAt || playlist?.createdAt)}
              </p>
              <p className="mt-1 text-xs text-black/45 dark:text-white/45">
                Page {page} / {totalPages}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black/5 px-4 py-2 text-sm font-semibold text-black/80 ring-1 ring-black/10 hover:bg-black/10 disabled:opacity-60 dark:bg-white/5 dark:text-white/80 dark:ring-white/10 dark:hover:bg-white/10"
          >
            <RefreshCcw
              className={["h-4 w-4", refreshing ? "animate-spin" : ""].join(
                " ",
              )}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Body */}
        <div className="mt-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-black/10 bg-black/2 p-5 text-sm text-black/70 dark:border-white/10 dark:bg-white/3 dark:text-white/70">
              {error}
            </div>
          ) : videos.length === 0 ? (
            <div className="rounded-3xl border border-black/10 bg-black/2 p-10 text-center dark:border-white/10 dark:bg-white/3">
              <div className="text-xl font-semibold text-black/90 dark:text-white/90">
                No videos in this playlist
              </div>
              <div className="mt-2 text-sm text-black/55 dark:text-white/55">
                Add videos from the watch page using the menu.
              </div>

              <button
                type="button"
                onClick={() => navigate("/", { replace: false })}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
              >
                <Play className="h-4 w-4" />
                Explore videos
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {videos.map((v) => {
                  const owner = v?.owner?.[0];
                  return (
                    <div
                      key={v._id}
                      className="group flex flex-col gap-4 rounded-2xl border border-black/10 bg-black/2 p-4 transition hover:bg-black/3 dark:border-white/10 dark:bg-white/3 dark:hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      {/* Left */}
                      <div className="flex min-w-0 gap-4">
                        <button
                          type="button"
                          onClick={() => navigate(`/watch/${v._id}`)}
                          className="relative h-20 w-36 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/10 dark:ring-white/10"
                          title="Watch"
                        >
                          {isProbablyUrl(v.thumbnail) ? (
                            <img
                              src={v.thumbnail}
                              alt={v.title || "Video"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-black/10 text-black/40 dark:bg-white/10 dark:text-white/40">
                              <Play className="h-6 w-6" />
                            </div>
                          )}
                        </button>

                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => navigate(`/watch/${v._id}`)}
                            className="text-left"
                          >
                            <div className="truncate text-sm font-semibold text-black/90 group-hover:underline dark:text-white/90">
                              {v.title || "Untitled video"}
                            </div>
                          </button>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-black/60 dark:text-white/60">
                            <span className="font-semibold text-black/75 dark:text-white/75">
                              {owner?.fullname || owner?.username || "Channel"}
                            </span>
                            <span>•</span>
                            <span>{viewsText(v.views)}</span>
                            <span>•</span>
                            <span>
                              Updated {timeAgo(v.updatedAt || v.createdAt)}
                            </span>
                          </div>

                          {v.description ? (
                            <div className="mt-2 line-clamp-2 text-xs text-black/55 dark:text-white/55">
                              {v.description}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <button
                          type="button"
                          onClick={() => navigate(`/watch/${v._id}`)}
                          className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
                        >
                          <Play className="h-4 w-4" />
                          Watch
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveVideo(v._id)}
                          className="inline-flex items-center gap-2 rounded-full bg-black/5 px-4 py-2 text-xs font-semibold text-black/80 ring-1 ring-black/10 hover:bg-black/10 dark:bg-white/5 dark:text-white/80 dark:ring-white/10 dark:hover:bg-white/10"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMore ? (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    className="rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
                  >
                    Load more
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Helpful backend note */}
        {!loading &&
        playlist &&
        (!playlist.Videos || !Array.isArray(playlist.Videos)) ? (
          <div className="mt-6 rounded-2xl border border-black/10 bg-black/2 p-4 text-xs text-black/60 dark:border-white/10 dark:bg-white/3 dark:text-white/60">
            Backend did not return populated <b>Videos</b>. Make sure your
            aggregation uses <b>as: "Videos"</b> and your <b>$lookup.from</b> is
            the real collection name (usually <b>"videos"</b>).
          </div>
        ) : null}
      </div>
    </section>
  );
}

export { PlaylistDetails as Component };
