import { useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  FileText,
  Search,
  Heart,
  MessageCircle,
  RefreshCcw,
} from "lucide-react";

import { getPosts } from "../../lib/api/post";
import { extractMessageFromHtml } from "../../utils/extractMessageFromHtml";

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

type Owner = {
  _id: string;
  username?: string;
  fullname?: string;
  email?: string;
  avatar?: string;
};

type PostDoc = {
  _id: string;
  content: string;
  owner?: Owner | null;
  likesCount?: number;
  commentCounts?: number;
  createdAt?: string;
  updatedAt?: string;
};

const isProbablyUrl = (v?: string) =>
  !!v && (v.startsWith("http://") || v.startsWith("https://"));

const initials = (name?: string) => {
  const s = String(name || "").trim();
  if (!s) return "U";
  const parts = s.split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "U";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
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

  if (yr > 0) return `${yr}y`;
  if (mo > 0) return `${mo}mo`;
  if (day > 0) return `${day}d`;
  if (hr > 0) return `${hr}h`;
  if (min > 0) return `${min}m`;
  return "now";
};

export const Threads = () => {
  const limit = 5;

  const [rows, setRows] = useState<PostDoc[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loadingFirst, setLoadingFirst] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // search (client-side)
  const [q, setQ] = useState("");

  // sentinel for IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // prevent duplicate loads
  const loadingRef = useRef(false);

  const hasMore = page < totalPages;

  const showError = (err: any) => {
    const raw = err?.response?.data;
    const msg =
      typeof raw === "string"
        ? extractMessageFromHtml(raw)
        : raw?.message || err?.message || "Failed to load posts.";
    setError(String(msg));
    toast.error(String(msg), { position: "bottom-right" });
  };

  const fetchPage = async (targetPage: number, opts?: { append?: boolean }) => {
    // hard guard to prevent double calling
    if (loadingRef.current) return;
    loadingRef.current = true;

    setError(null);

    const isAppend = !!opts?.append;
    if (!isAppend) setLoadingFirst(true);
    if (isAppend) setLoadingMore(true);

    try {
      const res = await getPosts({
        page: targetPage,
        limit,
        sortBy: "createdAt",
        sortType: "desc",
      });

      const payload = res.data as ApiResponse<Paginated<PostDoc>>;
      const data = payload?.data;
      const docs = Array.isArray(data?.docs) ? (data.docs as PostDoc[]) : [];

      setPage(Number(data?.page ?? targetPage));
      setTotalPages(Number(data?.totalPages ?? 1));

      setRows((prev) => {
        if (!isAppend) return docs;

        // merge unique by _id (safe against duplicates)
        const map = new Map<string, PostDoc>();
        for (const p of prev) map.set(p._id, p);
        for (const p of docs) map.set(p._id, p);
        return Array.from(map.values());
      });
    } catch (err: any) {
      showError(err);
    } finally {
      if (!isAppend) setLoadingFirst(false);
      if (isAppend) setLoadingMore(false);
      loadingRef.current = false;
    }
  };

  // initial load
  useEffect(() => {
    fetchPage(1, { append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refresh (reload page 1)
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchPage(1, { append: false });
    setRefreshing(false);
  };

  // Infinite scroll: observe sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;

        // load next page only if we have more and not already loading
        if (hasMore && !loadingRef.current && !loadingMore && !loadingFirst) {
          fetchPage(page + 1, { append: true });
        }
      },
      {
        // start loading a bit before reaching bottom
        root: null,
        rootMargin: "600px",
        threshold: 0,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [page, hasMore, loadingMore, loadingFirst]); // keep dependencies

  // client-side search filter (optional)
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((p) => {
      const owner = p.owner;
      const hay = [p.content, owner?.fullname, owner?.username, owner?.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [rows, q]);

  return (
    <section className="min-h-screen w-full bg-light-background text-black dark:bg-dark-background dark:text-white">
      <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />

      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-black/5 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
              <FileText className="h-5 w-5 text-black/70 dark:text-white/75" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-black/90 dark:text-white/90 md:text-2xl">
                Threads
              </h1>
              <p className="mt-1 text-sm text-black/55 dark:text-white/55">
                Showing{" "}
                <span className="font-semibold text-black/80 dark:text-white/80">
                  {filtered.length}
                </span>{" "}
                post{filtered.length === 1 ? "" : "s"}
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

        {/* Search */}
        <div className="mt-5">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40 dark:text-white/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search posts, users…"
              className="h-11 w-full rounded-2xl border border-black/10 bg-black/2 pl-11 pr-4 text-sm text-black outline-none placeholder:text-black/45 focus:border-black/20 focus:bg-black/3 dark:border-white/10 dark:bg-white/3 dark:text-white dark:placeholder:text-white/45 dark:focus:border-white/20 dark:focus:bg-white/5"
            />
          </div>
        </div>

        {/* Feed */}
        <div className="mt-6 space-y-3">
          {loadingFirst ? (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-3xl border border-black/10 bg-black/2 p-5 dark:border-white/10 dark:bg-white/3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-black/10 dark:bg-white/10" />
                    <div className="flex-1">
                      <div className="h-3 w-48 rounded bg-black/10 dark:bg-white/10" />
                      <div className="mt-2 h-3 w-28 rounded bg-black/10 dark:bg-white/10" />
                    </div>
                  </div>
                  <div className="mt-4 h-4 w-11/12 rounded bg-black/10 dark:bg-white/10" />
                  <div className="mt-2 h-4 w-8/12 rounded bg-black/10 dark:bg-white/10" />
                </div>
              ))}
            </>
          ) : error ? (
            <div className="rounded-2xl border border-black/10 bg-black/2 p-5 text-sm text-black/70 dark:border-white/10 dark:bg-white/3 dark:text-white/70">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-black/10 bg-black/2 p-10 text-center dark:border-white/10 dark:bg-white/3">
              <div className="text-xl font-semibold text-black/90 dark:text-white/90">
                No posts found
              </div>
              <div className="mt-2 text-sm text-black/55 dark:text-white/55">
                Try clearing your search or refresh.
              </div>
            </div>
          ) : (
            filtered.map((p) => {
              const owner = p.owner;
              const name =
                owner?.fullname?.trim() ||
                owner?.username?.trim() ||
                "Unknown user";
              const handle = owner?.username ? `@${owner.username}` : "—";
              const when = timeAgo(p.createdAt || p.updatedAt);

              return (
                <article
                  key={p._id}
                  className="rounded-3xl border border-black/10 bg-black/2 p-5 transition hover:bg-black/3 dark:border-white/10 dark:bg-white/3 dark:hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-black/10 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10">
                        {isProbablyUrl(owner?.avatar) ? (
                          <img
                            src={owner!.avatar}
                            alt={name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs font-bold text-black/70 dark:text-white/75">
                            {initials(name)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <div className="truncate text-sm font-semibold text-black/90 dark:text-white/90">
                            {name}
                          </div>
                          <div className="text-xs font-semibold text-black/45 dark:text-white/45">
                            {handle}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                          {when} •{" "}
                          <span className="font-mono">#{p._id.slice(-6)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-black/90 dark:text-white/90">
                    {p.content}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-black/75 ring-1 ring-black/10 dark:bg-white/5 dark:text-white/80 dark:ring-white/10">
                      <Heart className="h-4 w-4" />
                      {Number(p.likesCount ?? 0).toLocaleString()} likes
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-black/75 ring-1 ring-black/10 dark:bg-white/5 dark:text-white/80 dark:ring-white/10">
                      <MessageCircle className="h-4 w-4" />
                      {Number(p.commentCounts ?? 0).toLocaleString()} comments
                    </div>
                  </div>
                </article>
              );
            })
          )}

          {/* Sentinel: when this becomes visible => load next page */}
          <div ref={sentinelRef} />

          {/* Loading more indicator */}
          {!loadingFirst && loadingMore ? (
            <div className="rounded-2xl border border-black/10 bg-black/2 p-4 text-center text-sm text-black/60 dark:border-white/10 dark:bg-white/3 dark:text-white/60">
              Loading more…
            </div>
          ) : null}

          {/* End of feed */}
          {!loadingFirst &&
          !loadingMore &&
          !error &&
          !hasMore &&
          rows.length > 0 ? (
            <div className="rounded-2xl border border-black/10 bg-black/2 p-4 text-center text-sm text-black/60 dark:border-white/10 dark:bg-white/3 dark:text-white/60">
              You’ve reached the end.{" "}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};
