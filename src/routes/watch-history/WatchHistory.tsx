import  { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  Trash2,
  Search,
  X,
  RefreshCcw,
  Play,
  History,
  Tag,
} from "lucide-react";

import {
  clearWatchHistory,
  getWatchHistory,
  removeFromWatchHistory,
} from "../../lib/api/watchHistory";
import { extractMessageFromHtml } from "../../utils/extractMessageFromHtml";

type OwnerUser = {
  _id: string;
  username?: string;
  fullname?: string;
  avatar?: string;
};

type Video = {
  _id: string;
  videoFile?: string;
  thumbnail?: string;
  title: string;
  description?: string;
  duration?: number;
  views?: string | number;
  tags?: string[];
  owner?: Array<OwnerUser | string>; // your API returns ["userId"]
  createdAt?: string;
  updatedAt?: string;
};

type WatchHistoryRow = {
  _id: string;
  user: string;
  video: Video;
  createdAt: string;
  updatedAt: string;
};

type WatchHistoryPaginated = {
  docs: WatchHistoryRow[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
};

type ApiResponse = {
  statusCode: number;
  data: string; // "Watch history retrieved successfully."
  message: WatchHistoryPaginated; // ✅ THIS is your real shape
  success: boolean;
};

const LIMIT = 10;

const isProbablyUrl = (v?: string) =>
  !!v && (v.startsWith("http://") || v.startsWith("https://"));

const formatDuration = (totalSeconds?: number) => {
  const s = Number(totalSeconds ?? 0);
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const secs = Math.round(s);
  const m = Math.floor(secs / 60);
  const r = secs % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
};

const timeAgo = (iso?: string) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "—";

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

const shortId = (id?: string) => {
  if (!id) return "";
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
};

const getOwnerLabel = (video?: Video) => {
  const first = video?.owner?.[0];
  if (!first) return "Channel";
  if (typeof first === "string") return `Channel • ${shortId(first)}`;
  const name = first.fullname || first.username;
  return name ? name : `Channel • ${shortId(first._id)}`;
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

export const WatchHistory = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<WatchHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<WatchHistoryRow | null>(
    null,
  );
  const [removing, setRemoving] = useState(false);

  // pagination from API (message.*)
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  // prevents double fetch
  const lockRef = useRef(false);

  // infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  const fetchHistoryPage = async (
    targetPage: number,
    opts?: { append?: boolean; silent?: boolean },
  ) => {
    if (lockRef.current) return;
    lockRef.current = true;

    const append = !!opts?.append;

    try {
      setError(null);

      if (!opts?.silent && !append) setLoading(true);
      if (append) setLoadingMore(true);

      // ✅ IMPORTANT: getWatchHistory must support page+limit
      // If your function signature differs, adjust here ONLY.
      const res = await getWatchHistory(targetPage, LIMIT);

      const payload = res.data as ApiResponse;
      const paginated = payload?.message;

      const docs = Array.isArray(paginated?.docs) ? paginated.docs : [];

      // ✅ filter broken rows
      const safeDocs = docs.filter((x) => x?.video && x?.video?._id);

      // ✅ keep order as API provides (already sorted by watch time usually)
      // if you want newest first always:
      safeDocs.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      setPage(Number(paginated?.page ?? targetPage));
      setHasNextPage(Boolean(paginated?.hasNextPage));

      setRows((prev) => {
        if (!append) return safeDocs;

        // ✅ merge unique by historyRow _id (or by videoId if your history duplicates)
        const map = new Map<string, WatchHistoryRow>();
        for (const r of prev) map.set(r._id, r);
        for (const r of safeDocs) map.set(r._id, r);
        return Array.from(map.values());
      });
    } catch (e: any) {
      const data = e?.response?.data;
      const msg =
        typeof data === "string"
          ? extractMessageFromHtml(data)
          : data?.message || e?.message || "Failed to load watch history.";
      setError(String(msg));
      showError(e);
    } finally {
      if (!opts?.silent && !append) setLoading(false);
      if (append) setLoadingMore(false);
      lockRef.current = false;
    }
  };

  // ✅ initial load
  useEffect(() => {
    fetchHistoryPage(1, { append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        if (!hasNextPage) return;
        if (loading || loadingMore || refreshing) return;
        if (lockRef.current) return;

        fetchHistoryPage(page + 1, { append: true, silent: true });
      },
      {
        root: null,
        rootMargin: "900px", // load before bottom
        threshold: 0,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [page, hasNextPage, loading, loadingMore, refreshing]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
      const v = r.video;
      const ownerLabel = getOwnerLabel(v);

      const hay = [v?.title, v?.description, ownerLabel, ...(v?.tags || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [rows, query]);

  const totalCount = rows.length;

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);

    // reset list and fetch page 1
    setRows([]);
    setPage(1);
    setHasNextPage(false);

    await fetchHistoryPage(1, { append: false, silent: true });
    setRefreshing(false);
  };

  const openRemove = (row: WatchHistoryRow) => setRemoveTarget(row);
  const closeRemove = () => {
    if (removing) return;
    setRemoveTarget(null);
  };

  const confirmRemove = async () => {
    if (!removeTarget?.video?._id) return;

    const videoId = removeTarget.video._id;
    setRemoving(true);

    const prev = rows;
    setRows((p) => p.filter((x) => x._id !== removeTarget._id));

    try {
      await removeFromWatchHistory(videoId);
      setRemoveTarget(null);
      // keep pagination as-is; user can scroll to load more
    } catch (e: any) {
      setRows(prev);
      showError(e);
    } finally {
      setRemoving(false);
    }
  };

  const confirmClear = async () => {
    setClearing(true);

    const prev = rows;
    setRows([]);
    setPage(1);
    setHasNextPage(false);

    try {
      await clearWatchHistory();
      setClearOpen(false);
    } catch (e: any) {
      setRows(prev);
      showError(e);
    } finally {
      setClearing(false);
    }
  };

  return (
    <section className="min-h-screen w-full bg-light-background text-black dark:bg-dark-background dark:text-white">
      <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />

      <div className="mx-auto w-full px-4 py-6 md:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-black/5 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
              <History className="h-5 w-5 text-black/70 dark:text-white/75" />
            </div>

            <div>
              <h1 className="text-xl font-semibold tracking-tight text-black/90 dark:text-white/90 md:text-2xl">
                Watch history
              </h1>
              <p className="mt-1 text-sm text-black/55 dark:text-white/55">
                Videos you watched recently
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-black/5 px-4 py-2 text-sm font-semibold text-black/80 ring-1 ring-black/10 hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/5 dark:text-white/80 dark:ring-white/10 dark:hover:bg-white/10"
            >
              <RefreshCcw
                className={["h-4 w-4", refreshing ? "animate-spin" : ""].join(
                  " ",
                )}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              onClick={() => setClearOpen(true)}
              disabled={clearing || totalCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/85"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40 dark:text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search history (title, tags, description)..."
              className="h-11 w-full rounded-2xl border border-black/10 bg-black/2 pl-11 pr-10 text-sm text-black outline-none placeholder:text-black/45 focus:border-black/20 focus:bg-black/3 dark:border-white/10 dark:bg-white/3 dark:text-white dark:placeholder:text-white/45 dark:focus:border-white/20 dark:focus:bg-white/5"
            />
            {query.trim() ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-black/55 dark:text-white/55" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Body */}
        <div className="mt-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-black/10 bg-black/2 p-5 text-sm text-black/70 dark:border-white/10 dark:bg-white/3 dark:text-white/70">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-black/10 bg-black/2 p-10 text-center dark:border-white/10 dark:bg-white/3">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-black/5 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
                <History className="h-6 w-6 text-black/60 dark:text-white/70" />
              </div>

              <div className="mt-4 text-xl font-semibold text-black/90 dark:text-white/90">
                No watch history
              </div>
              <div className="mt-2 text-sm text-black/55 dark:text-white/55">
                Start watching videos and they’ll appear here.
              </div>

              <button
                type="button"
                onClick={() => navigate("/", { replace: false })}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
              >
                <Play className="h-4 w-4" />
                Explore videos
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {filtered.map((row) => {
                  const v = row.video;
                  const thumb = v?.thumbnail;
                  const duration = formatDuration(v?.duration);
                  const watched = timeAgo(row.updatedAt);

                  return (
                    <div
                      key={row._id}
                      className="group flex flex-col gap-4 rounded-2xl border border-black/10 bg-black/2 p-4 transition hover:bg-black/3 dark:border-white/10 dark:bg-white/3 dark:hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      {/* Left */}
                      <div className="flex min-w-0 gap-4">
                        {/* Thumbnail */}
                        <button
                          type="button"
                          onClick={() => navigate(`/watch/${v._id}`)}
                          className="relative h-20 w-36 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/10 dark:ring-white/10"
                          title="Watch"
                        >
                          {isProbablyUrl(thumb) ? (
                            <img
                              src={thumb}
                              alt={v.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-black/10 text-black/40 dark:bg-white/10 dark:text-white/40">
                              <Play className="h-6 w-6" />
                            </div>
                          )}

                          <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                            {duration}
                          </span>
                        </button>

                        {/* Meta */}
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => navigate(`/watch/${v._id}`)}
                            className="text-left"
                          >
                            <div className="truncate text-sm font-semibold text-black/90 group-hover:underline dark:text-white/90">
                              {v.title}
                            </div>
                          </button>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-black/60 dark:text-white/60">
                            <span className="font-semibold text-black/75 dark:text-white/75">
                              {getOwnerLabel(v)}
                            </span>
                            <span>•</span>
                            <span>{viewsText(v.views)}</span>
                            <span>•</span>
                            <span>Watched {watched}</span>
                          </div>

                          {Array.isArray(v?.tags) && v.tags.length ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-black/70 dark:border-white/10 dark:bg-black/30 dark:text-white/70">
                                <Tag className="h-3.5 w-3.5" />
                                Tags
                              </span>
                              {v.tags.slice(0, 6).map((t) => (
                                <span
                                  key={t}
                                  className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-[11px] font-semibold text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {v.description ? (
                            <div className="mt-2 line-clamp-2 text-xs text-black/55 dark:text-white/55">
                              {v.description}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Right actions */}
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
                          onClick={() => openRemove(row)}
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

              {/* ✅ infinite loading indicator */}
              {loadingMore ? (
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonRow key={`more-${i}`} />
                  ))}
                </div>
              ) : null}

              {/* ✅ end indicator */}
              {!loading && !loadingMore && !error && !hasNextPage ? (
                <div className="mt-6 rounded-2xl border border-black/10 bg-black/2 p-4 text-center text-sm text-black/60 dark:border-white/10 dark:bg-white/3 dark:text-white/60">
                  You’ve reached the end.{" "}
                </div>
              ) : null}

              {/* ✅ sentinel (must be after list) */}
              <div ref={sentinelRef} className="h-1 w-full" />
            </>
          )}
        </div>
      </div>

      {/* Remove confirm modal */}
      {removeTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-light-background text-black ring-1 ring-black/10 dark:bg-dark-background dark:text-white dark:ring-white/10">
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 dark:border-white/10">
              <div className="text-sm font-semibold">Remove from history</div>
              <button
                type="button"
                onClick={closeRemove}
                disabled={removing}
                className="grid h-9 w-9 place-items-center rounded-xl bg-black/5 ring-1 ring-black/10 hover:bg-black/10 disabled:opacity-50 dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 text-sm text-black/75 dark:text-white/75">
              Remove{" "}
              <span className="font-semibold text-black/90 dark:text-white/90">
                {removeTarget.video?.title}
              </span>{" "}
              from your watch history?
            </div>

            <div className="flex justify-end gap-2 border-t border-black/10 px-5 py-4 dark:border-white/10">
              <button
                type="button"
                onClick={closeRemove}
                disabled={removing}
                className="rounded-full bg-black/5 px-4 py-2 text-xs font-semibold text-black/80 ring-1 ring-black/10 hover:bg-black/10 disabled:opacity-50 dark:bg-white/5 dark:text-white/80 dark:ring-white/10 dark:hover:bg-white/10"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmRemove}
                disabled={removing}
                className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-black/85 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/85"
              >
                {removing ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Clear confirm modal */}
      {clearOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-light-background text-black ring-1 ring-black/10 dark:bg-dark-background dark:text-white dark:ring-white/10">
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 dark:border-white/10">
              <div className="text-sm font-semibold">Clear watch history</div>
              <button
                type="button"
                onClick={() => (clearing ? null : setClearOpen(false))}
                disabled={clearing}
                className="grid h-9 w-9 place-items-center rounded-xl bg-black/5 ring-1 ring-black/10 hover:bg-black/10 disabled:opacity-50 dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 text-sm text-black/75 dark:text-white/75">
              This will permanently remove all items from your watch history.
              This action can’t be undone.
            </div>

            <div className="flex justify-end gap-2 border-t border-black/10 px-5 py-4 dark:border-white/10">
              <button
                type="button"
                onClick={() => setClearOpen(false)}
                disabled={clearing}
                className="rounded-full bg-black/5 px-4 py-2 text-xs font-semibold text-black/80 ring-1 ring-black/10 hover:bg-black/10 disabled:opacity-50 dark:bg-white/5 dark:text-white/80 dark:ring-white/10 dark:hover:bg-white/10"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmClear}
                disabled={clearing}
                className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-black/85 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/85"
              >
                {clearing ? "Clearing..." : "Clear all"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
