// src/pages/watch/section/SuggestedVideos.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { MoreHorizontal } from "lucide-react";

import { getSuggestedVideos } from "../../../lib/api/video";
import { extractMessageFromHtml } from "../../../utils/extractMessageFromHtml";

type OwnerUser = {
  _id: string;
  username: string;
  fullname: string;
  avatar?: string;
};

export type SuggestedVideo = {
  _id: string;
  title: string;
  thumbnail: string;
  tags: string[];
  owner: OwnerUser[];
  createdAt: string;
  views: string;
  matchCount?: number; // present for matched items
};

type Paginated<T> = {
  docs: T[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  nextPage: number | null;
  hasPrevPage: boolean;
  prevPage: number | null;
};

type ApiResponse<T> = {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
};

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

const SuggestedRowSkeleton = () => (
  <div className="flex gap-3 rounded-2xl p-2">
    <div className="h-[72px] w-[128px] shrink-0 animate-pulse rounded-xl bg-black/10 dark:bg-white/10" />
    <div className="min-w-0 flex-1">
      <div className="h-4 w-11/12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-2 h-3 w-5/12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-2 h-3 w-7/12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
    </div>
    <div className="h-8 w-8 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
  </div>
);

const SuggestedVideoRow = ({ v }: { v: SuggestedVideo }) => {
  const owner = v.owner?.[0];
  const channelName = owner?.fullname || owner?.username || "Channel";

  return (
    <div className="group flex gap-3 rounded-2xl p-2 hover:bg-black/5 dark:hover:bg-white/5">
      <Link
        to={`/watch/${v._id}`}
        className="relative h-[72px] w-[128px] shrink-0 overflow-hidden rounded-xl bg-black/10 dark:bg-white/10"
      >
        {v.thumbnail ? (
          <img
            src={v.thumbnail}
            alt={v.title}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full" />
        )}

        {typeof v.matchCount === "number" && v.matchCount > 0 ? (
          <div className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
            Match {v.matchCount}
          </div>
        ) : null}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          to={`/watch/${v._id}`}
          className="line-clamp-2 text-sm font-semibold text-black/85 dark:text-white/85"
          title={v.title}
        >
          {v.title}
        </Link>

        <div className="mt-1 text-xs text-black/55 dark:text-white/55">
          {channelName}
        </div>

        <div className="mt-1 text-xs text-black/55 dark:text-white/55">
          {viewsText(v.views)} • {timeAgo(v.createdAt)}
        </div>
      </div>

      <button
        type="button"
        aria-label="More"
        className="mt-1 rounded-full p-1.5 text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
};

export const SuggestedVideos = ({
  videoId,
  limit = 12,
}: {
  videoId: string;
  limit?: number;
}) => {
  const [items, setItems] = useState<SuggestedVideo[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const hasMore = page < totalPages;

  const showError = (err: any) => {
    const html = err?.response?.data;
    toast.error(
      typeof html === "string"
        ? extractMessageFromHtml(html)
        : err?.message || "Failed to load suggestions",
      { position: "bottom-right" },
    );
  };

  // Reset when videoId changes
  useEffect(() => {
    setItems([]);
    setPage(1);
    setTotalPages(1);
  }, [videoId]);

  const fetchPage = async (p: number) => {
    if (!videoId) return;

    try {
      if (p === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await getSuggestedVideos({ videoId, page: p, limit });
      const payload = res.data as ApiResponse<Paginated<SuggestedVideo>>;

      const docs = payload.data?.docs ?? [];
      const tp = payload.data?.totalPages ?? 1;

      setTotalPages(tp);

      setItems((prev) => {
        const map = new Map<string, SuggestedVideo>();
        // keep existing order, but de-dupe by _id
        for (const x of prev) map.set(x._id, x);
        for (const x of docs) map.set(x._id, x);
        return Array.from(map.values());
      });
    } catch (err: any) {
      showError(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // initial fetch
  useEffect(() => {
    fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, limit]);

  const onLoadMore = async () => {
    if (loadingMore || loading || !hasMore) return;
    const next = page + 1;
    setPage(next);
    await fetchPage(next);
  };

  const headerText = useMemo(() => {
    if (loading && items.length === 0) return "Loading…";
    return "Recommended";
  }, [loading, items.length]);

  return (
    <div className="rounded-3xl border border-black/10 bg-black/2 p-5 dark:border-white/10 dark:bg-white/3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Up next</div>
        <div className="text-sm text-black/55 dark:text-white/55">
          {headerText}
        </div>
      </div>

      <div className="mt-4 space-y-1">
        {loading && items.length === 0 ? (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <SuggestedRowSkeleton key={i} />
            ))}
          </>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-black/2 p-4 text-sm text-black/70 dark:border-white/10 dark:bg-white/3 dark:text-white/70">
            No suggestions yet.
          </div>
        ) : (
          items.map((v) => <SuggestedVideoRow key={v._id} v={v} />)
        )}
      </div>

      {/* Load more */}
      {items.length > 0 ? (
        <div className="mt-4">
          <button
            type="button"
            disabled={!hasMore || loadingMore}
            onClick={onLoadMore}
            className="w-full rounded-2xl bg-black/5 px-4 py-2 text-sm font-semibold text-black/80 transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/5 dark:text-white/85 dark:hover:bg-white/10"
          >
            {loadingMore
              ? "Loading…"
              : hasMore
                ? "Load more"
                : "No more videos"}
          </button>
        </div>
      ) : null}
    </div>
  );
};
