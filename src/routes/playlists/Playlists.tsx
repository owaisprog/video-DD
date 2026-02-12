import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { Folder, Plus, RefreshCcw, Search, X } from "lucide-react";

import { getUserPlaylists } from "../../lib/api/playlist";
import { extractMessageFromHtml } from "../../utils/extractMessageFromHtml";
import { useAuth } from "../../context/auth-context";
import { CreatePlaylistModal } from "./components/CreatePlaylistModal";

type ApiResponse<T> = {
  statusCode: number;
  data: T;
  message: any;
  success: boolean;
};

type Paginated<T> = {
  docs?: T[];
  totalDocs?: number;
  limit?: number;
  page?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  nextPage?: number | null;
};

type VideoLite = {
  _id: string;
  thumbnail?: string;
  title?: string;
};

type ApiPlaylist = {
  _id: string;
  name: string;
  description?: string;
  videos?: any[];
  Videos?: VideoLite[];
  createdAt?: string;
  updatedAt?: string;
};

const pickDocs = <T,>(payload: any): T[] => {
  const d = payload?.data;
  if (Array.isArray(d?.docs)) return d.docs as T[];
  if (Array.isArray(d)) return d as T[];
  if (Array.isArray(payload?.message)) return payload.message as T[];
  return [];
};

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

const SkeletonCard = () => (
  <div className="animate-pulse overflow-hidden rounded-2xl border border-black/10 bg-black/2 dark:border-white/10 dark:bg-white/3">
    <div className="h-36 w-full bg-black/10 dark:bg-white/10" />
    <div className="p-4">
      <div className="h-4 w-2/3 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-3 h-3 w-5/6 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-3 h-3 w-1/2 rounded bg-black/10 dark:bg-white/10" />
    </div>
  </div>
);

export function Playlists() {
  const navigate = useNavigate();
  const { state } = useAuth();

  const authed = state.status === "authed";
  const userId = authed ? String((state as any).user?._id) : null;

  const [rows, setRows] = useState<ApiPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // ✅ pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 12;
  const hasMore = page < totalPages;

  // ✅ infinite scroll sentinel + lock
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const lockRef = useRef(false);

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

  const fetchPlaylistsPage = async (
    targetPage: number,
    opts?: { append?: boolean; silent?: boolean },
  ) => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    if (lockRef.current) return;
    lockRef.current = true;

    const append = !!opts?.append;

    if (!opts?.silent && !append) setLoading(true);
    if (append) setLoadingMore(true);

    setError(null);

    try {
      const res = await getUserPlaylists(userId, targetPage, limit);
      const payload = res.data as ApiResponse<Paginated<ApiPlaylist>>;

      const list = pickDocs<ApiPlaylist>(payload);

      // keep newest updated first
      list.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime(),
      );

      const p = payload?.data?.page ?? targetPage;
      const tp = payload?.data?.totalPages ?? 1;

      setPage(Number(p));
      setTotalPages(Number(tp));

      setRows((prev) => {
        if (!append) return list;

        // ✅ merge unique by _id
        const map = new Map<string, ApiPlaylist>();
        for (const x of prev) map.set(x._id, x);
        for (const x of list) map.set(x._id, x);
        return Array.from(map.values());
      });
    } catch (err: any) {
      const handled = showAuthError(err);
      if (!handled) {
        const raw = err?.response?.data;
        const msg =
          typeof raw === "string"
            ? extractMessageFromHtml(raw)
            : raw?.message || err?.message || "Failed to load playlists.";
        setError(String(msg));
        toast.error(String(msg), { position: "bottom-right" });
      }
    } finally {
      if (!opts?.silent && !append) setLoading(false);
      if (append) setLoadingMore(false);
      lockRef.current = false;
    }
  };

  // ✅ initial fetch + when user changes
  useEffect(() => {
    setRows([]);
    setPage(1);
    setTotalPages(1);
    fetchPlaylistsPage(1, { append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ✅ infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        if (!hasMore) return;
        if (loading || loadingMore || refreshing) return;
        if (lockRef.current) return;
        if (query.trim()) return; // ✅ optional: don’t auto-load while searching

        fetchPlaylistsPage(page + 1, { append: true, silent: true });
      },
      { root: null, rootMargin: "900px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [page, hasMore, loading, loadingMore, refreshing, query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((p) => {
      const hay = [p.name, p.description]
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

    setRows([]);
    setPage(1);
    setTotalPages(1);

    await fetchPlaylistsPage(1, { append: false, silent: true });
    setRefreshing(false);
  };

  const getCover = (p: ApiPlaylist) => {
    const thumb = p?.Videos?.[0]?.thumbnail;
    if (thumb && (thumb.startsWith("http://") || thumb.startsWith("https://")))
      return thumb;
    return null;
  };

  const getCount = (p: ApiPlaylist) => {
    if (Array.isArray(p?.Videos)) return p.Videos.length;
    if (Array.isArray(p?.videos)) return p.videos.length;
    return 0;
  };

  if (!authed) {
    return (
      <section className="min-h-screen w-full bg-light-background text-black dark:bg-dark-background dark:text-white">
        <div className="mx-auto w-full px-4 py-10 md:px-6">
          <div className="rounded-3xl border border-black/10 bg-black/2 p-10 text-center dark:border-white/10 dark:bg-white/3">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-black/5 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
              <Folder className="h-6 w-6 text-black/60 dark:text-white/70" />
            </div>
            <div className="mt-4 text-xl font-semibold text-black/90 dark:text-white/90">
              Login to view your playlists
            </div>
            <div className="mt-2 text-sm text-black/55 dark:text-white/55">
              Your playlists are saved in your account.
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
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-black/5 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
              <Folder className="h-5 w-5 text-black/70 dark:text-white/75" />
            </div>

            <div>
              <h1 className="text-xl font-semibold tracking-tight text-black/90 dark:text-white/90 md:text-2xl">
                Playlists
              </h1>
              <p className="mt-1 text-sm text-black/55 dark:text-white/55">
                All your playlists •{" "}
                <span className="font-semibold text-black/80 dark:text-white/80">
                  {totalCount}
                </span>{" "}
                item{totalCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
            >
              <Plus className="h-4 w-4" />
              Create playlist
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
              placeholder="Search playlists..."
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

        {/* Grid */}
        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-black/10 bg-black/2 p-5 text-sm text-black/70 dark:border-white/10 dark:bg-white/3 dark:text-white/70">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-black/10 bg-black/2 p-10 text-center dark:border-white/10 dark:bg-white/3">
              <div className="text-xl font-semibold text-black/90 dark:text-white/90">
                No playlists found
              </div>
              <div className="mt-2 text-sm text-black/55 dark:text-white/55">
                Create a playlist to start organizing your videos.
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
              >
                <Plus className="h-4 w-4" />
                Create playlist
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => {
                  const cover = getCover(p);
                  const count = getCount(p);

                  return (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => navigate(`/playlists/${p._id}`)}
                      className="group overflow-hidden rounded-2xl border border-black/10 bg-black/2 text-left transition hover:bg-black/3 dark:border-white/10 dark:bg-white/3 dark:hover:bg-white/5"
                    >
                      <div className="relative h-36 w-full overflow-hidden bg-black/10 dark:bg-white/10">
                        {cover ? (
                          <img
                            src={cover}
                            alt={p.name}
                            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-black/45 dark:text-white/45">
                            <Folder className="h-8 w-8" />
                          </div>
                        )}

                        <div className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
                          {count} video{count === 1 ? "" : "s"}
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="truncate text-[15px] font-semibold text-black/90 group-hover:underline dark:text-white/90">
                          {p.name}
                        </div>

                        <div className="mt-1 line-clamp-2 text-sm text-black/60 dark:text-white/60">
                          {p.description || "No description."}
                        </div>

                        <div className="mt-3 text-xs text-black/50 dark:text-white/50">
                          Updated {timeAgo(p.updatedAt || p.createdAt)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ✅ Loading more skeletons */}
              {loadingMore ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={`more-${i}`} />
                  ))}
                </div>
              ) : null}

              {/* ✅ End message */}
              {!loading &&
              !loadingMore &&
              !error &&
              !hasMore &&
              !query.trim() ? (
                <div className="mt-6 rounded-2xl border border-black/10 bg-black/2 p-4 text-center text-sm text-black/60 dark:border-white/10 dark:bg-white/3 dark:text-white/60">
                  You’ve reached the end.
                </div>
              ) : null}

              {/* ✅ Sentinel */}
              <div ref={sentinelRef} className="h-1 w-full" />
            </>
          )}
        </div>
      </div>

      <CreatePlaylistModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => fetchPlaylistsPage(1, { append: false, silent: true })}
      />
    </section>
  );
}

export { Playlists as Component };
