import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { extractMessageFromHtml } from "../../utils/extractMessageFromHtml";
import { searchVideos } from "../../lib/api/video";
import { VideosSection, type VideoCard } from "../home/component/VideosSection";

type OwnerDetails = {
  _id: string;
  fullname: string;
  username: string;
  avatar: string;
  email: string;
};

type SearchVideo = {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoFile: string;
  duration: number;
  tags?: string[];
  views: number;
  isPublished: boolean;
  owner: string[];
  ownerDetails?: OwnerDetails | OwnerDetails[];
  createdAt: string;
  updatedAt: string;
  score?: number;
};

type SearchResponse = {
  success: boolean;
  message: string;
  data: {
    docs: SearchVideo[];
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
};

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1526948128573-703ee1aeb6fa?auto=format&fit=crop&w=1400&q=60";

const LIMIT = 12;

const isHttpUrl = (v?: string) => !!v && /^https?:\/\//i.test(v);

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

const viewsText = (views: number) => {
  const n = Number(views || 0);

  if (!Number.isFinite(n)) return "0 views";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B views`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`;
  return `${n} view${n === 1 ? "" : "s"}`;
};

const SkeletonGrid = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl bg-black/5 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10"
      >
        <div className="aspect-video w-full animate-pulse rounded-t-2xl bg-black/10 dark:bg-white/10" />
        <div className="p-4">
          <div className="h-4 w-4/5 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-2 h-3 w-3/5 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        </div>
      </div>
    ))}
  </div>
);

export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const page = Math.max(Number(searchParams.get("page") ?? 1), 1);

  const [items, setItems] = useState<SearchVideo[]>([]);
  const [meta, setMeta] = useState<SearchResponse["data"] | null>(null);
  const [loading, setLoading] = useState(false);

  const showError = (err: any) => {
    const html = err?.response?.data;
    toast.error(
      typeof html === "string"
        ? extractMessageFromHtml(html)
        : err?.response?.data?.message ||
            err?.message ||
            "Something went wrong. Please try again.",
      { position: "bottom-right" },
    );
  };

  useEffect(() => {
    if (!q) {
      setItems([]);
      setMeta(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const res = await searchVideos({ query: q, page, limit: LIMIT });
        if (cancelled) return;

        const apiRes = res.data as SearchResponse;
        setItems(apiRes?.data?.docs ?? []);
        setMeta(apiRes?.data ?? null);
      } catch (err: any) {
        if (!cancelled) showError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [q, page]);

  const videos: VideoCard[] = useMemo(() => {
    return items.map((v) => {
      const owner0 = Array.isArray(v.ownerDetails)
        ? v.ownerDetails[0]
        : v.ownerDetails;

      const avatar = owner0?.avatar;

      return {
        id: v._id,
        title: v.title,
        channelName: owner0?.fullname || owner0?.username || "Unknown",
        channelAvatarUrl: isHttpUrl(avatar) ? avatar : undefined,
        viewsText: viewsText(v.views),
        timeText: timeAgo(v.createdAt),
        duration: secondsToDuration(v.duration),
        thumbnailUrl: isHttpUrl(v.thumbnail) ? v.thumbnail : FALLBACK_THUMB,
        verified: false,
        ownerId: owner0?._id || v.owner?.[0],
      };
    });
  }, [items]);

  const updatePage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("q", q);
    params.set("page", String(nextPage));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="w-full bg-light-background    text-black dark:bg-dark-background dark:text-white">
      <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />

      {!q ? (
        <div className="rounded-2xl border border-black/10 bg-black/5 p-6 text-center text-sm text-black/65 dark:border-white/10 dark:bg-white/5 dark:text-white/65">
          Enter something in the search bar to find videos.
        </div>
      ) : loading ? (
        <SkeletonGrid count={6} />
      ) : (
        <>
          {videos.length > 0 ? (
            <VideosSection videos={videos} heading="Search results" />
          ) : (
            <div className="rounded-2xl border border-black/10 bg-black/5 p-6 text-center text-sm text-black/65 dark:border-white/10 dark:bg-white/5 dark:text-white/65">
              No videos found for "{q}".
            </div>
          )}

          {meta && meta.totalPages > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={!meta.hasPrevPage}
                onClick={() => updatePage(page - 1)}
                className="rounded-full bg-black/5 px-4 py-2 text-sm font-medium text-black ring-1 ring-black/10 hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-white dark:ring-white/10 dark:hover:bg-white/15"
              >
                Previous
              </button>

              <div className="rounded-full bg-black/5 px-4 py-2 text-sm font-medium text-black ring-1 ring-black/10 dark:bg-white/10 dark:text-white dark:ring-white/10">
                Page {meta.page} of {meta.totalPages}
              </div>

              <button
                type="button"
                disabled={!meta.hasNextPage}
                onClick={() => updatePage(page + 1)}
                className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90"
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
