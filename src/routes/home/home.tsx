import { useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { getAllVideos } from "../../lib/api/video";
import { extractMessageFromHtml } from "../../utils/extractMessageFromHtml";
import { VideosSection, type VideoCard } from "./component/VideosSection";

type OwnerUser = {
  _id: string;
  username: string;
  email: string;
  fullname: string;
  avatar: string;
  coverimage: string;
  createdAt: string;
  updatedAt: string;
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
  owner: OwnerUser[]; // ✅ matches your response
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentCounts: number;
};

type ApiResponse = {
  statusCode: number;
  data: {
    docs: ApiVideo[];
    totalDocs: number;
    limit: number;
    page: number;
    totalPages: number;
    pagingCounter: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    prevPage: number | null;
    nextPage: number | null;
  };
  message: string;
  success: boolean;
};

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1526948128573-703ee1aeb6fa?auto=format&fit=crop&w=1400&q=60";

const LIMIT = 12;

const secondsToDuration = (sec: number) => {
  const total = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
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

const isHttpUrl = (v?: string) => !!v && /^https?:\/\//i.test(v);

const SkeletonGrid = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl bg-black/5 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10"
      >
        <div className="aspect-video w-full animate-pulse rounded-t-2xl bg-black/10 dark:bg-white/10" />
        <div className="p-4">
          <div className="h-4 w-4/5 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
          <div className="mt-2 h-3 w-2/5 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
          <div className="mt-2 h-3 w-3/5 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

export const Home = () => {
  const [items, setItems] = useState<ApiVideo[]>([]);
  const [page, setPage] = useState(0);
  // const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

  const [loadingFirst, setLoadingFirst] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const lockRef = useRef(false);

  const showError = (err: any) => {
    const html = err?.response?.data;
    toast.error(
      typeof html === "string"
        ? extractMessageFromHtml(html)
        : err?.message || "Something went wrong. Please try again.",
      { position: "bottom-right" },
    );
  };

  const fetchPage = async (targetPage: number, opts?: { append?: boolean }) => {
    if (lockRef.current) return;
    lockRef.current = true;

    const append = !!opts?.append;

    try {
      if (!append) setLoadingFirst(true);
      if (append) setLoadingMore(true);

      const res = await getAllVideos({ page: targetPage, limit: LIMIT });
      const apiRes = res.data as ApiResponse;

      const data = apiRes?.data;
      const docs = Array.isArray(data?.docs) ? data.docs : [];

      setPage(Number(data?.page ?? targetPage));
      // setTotalPages(Number(data?.totalPages ?? 1));
      setHasNextPage(Boolean(data?.hasNextPage));

      setItems((prev) => {
        if (!append) return docs;

        // ✅ merge unique by _id (prevents duplicates)
        const map = new Map<string, ApiVideo>();
        for (const v of prev) map.set(v._id, v);
        for (const v of docs) map.set(v._id, v);
        return Array.from(map.values());
      });
    } catch (err: any) {
      showError(err);
    } finally {
      if (!append) setLoadingFirst(false);
      if (append) setLoadingMore(false);
      lockRef.current = false;
    }
  };

  // ✅ initial load
  useEffect(() => {
    fetchPage(1, { append: false });
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
        if (loadingFirst || loadingMore) return;
        if (lockRef.current) return;

        // load next page
        fetchPage(page + 1, { append: true });
      },
      {
        root: null,
        rootMargin: "900px", // load before reaching bottom
        threshold: 0,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [page, hasNextPage, loadingFirst, loadingMore]);

  const videos: VideoCard[] = useMemo(() => {
    return items
      .filter((v) => v.isPublished) // remove if you want all videos
      .map((v) => {
        const owner0 = v.owner?.[0];

        return {
          id: v._id,
          title: v.title,
          channelName: owner0?.fullname || owner0?.username || "Unknown",
          channelAvatarUrl: isHttpUrl(owner0?.avatar)
            ? owner0.avatar
            : undefined,
          viewsText: viewsText(v.views),
          timeText: timeAgo(v.createdAt),
          duration: secondsToDuration(v.duration),
          thumbnailUrl: isHttpUrl(v.thumbnail) ? v.thumbnail : FALLBACK_THUMB,
          verified: false,
        };
      });
  }, [items]);

  return (
    <section className="w-full bg-light-background text-black dark:bg-dark-background dark:text-white">
      <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />

      {loadingFirst && items.length === 0 ? (
        <SkeletonGrid count={6} />
      ) : (
        <>
          <VideosSection videos={videos} heading="All videos" />

          {/* ✅ Load more skeleton */}
          {loadingMore ? (
            <div className="mt-8">
              <SkeletonGrid count={3} />
            </div>
          ) : null}

          {/* ✅ End message */}
          {!loadingFirst && !loadingMore && !hasNextPage ? (
            <div className="mt-8 rounded-2xl border border-black/10 bg-black/2 p-4 text-center text-sm text-black/60 dark:border-white/10 dark:bg-white/3 dark:text-white/60">
              You’ve reached the end.{" "}
            </div>
          ) : null}

          {/* ✅ sentinel (must be last) */}
          <div ref={sentinelRef} className="h-1 w-full" />
        </>
      )}
    </section>
  );
};
