import React, { useEffect, useState } from "react";
import {
  Lock,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowDown,
  Video as VideoIcon,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import type { VideoDataType } from "./types";
import { EditVideo } from "./EditVideo";
import { getVideoById, deleteVideoById } from "../../../lib/api/video";

function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const secs = Math.round(totalSeconds);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isProbablyUrl(v?: string) {
  return !!v && (v.startsWith("http://") || v.startsWith("https://"));
}

function Thumb({ src, duration }: { src?: string; duration: string }) {
  const showImage = isProbablyUrl(src);

  return (
    <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center text-white/40">
          <VideoIcon className="h-6 w-6" />
        </div>
      )}

      <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        {duration}
      </span>
    </div>
  );
}

type Props = {
  rows?: VideoDataType[];
  title?: string;

  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;

  limit: number;
  setLimit: React.Dispatch<React.SetStateAction<number>>;

  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;

  sortBy: "asc" | "desc";
  setSortBy: React.Dispatch<React.SetStateAction<"asc" | "desc">>;

  onDeletedRefresh?: () => void;

  // ✅ NEW
  readOnly?: boolean;
};

export function VideosListPanel({
  rows = [],
  title = "Content",
  page,
  setPage,
  limit,
  setLimit,
  query,
  setQuery,
  sortBy,
  setSortBy,
  onDeletedRefresh,
  readOnly = false,
}: Props) {
  const [draftQuery, setDraftQuery] = useState(query);
  const [open, setOpen] = useState(false);
  const [editVideoData, setEditVideoData] = useState<VideoDataType>();

  // ✅ delete modal state
  const [deleteTarget, setDeleteTarget] = useState<VideoDataType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  const canPrev = page > 1;
  const canNext = rows.length === limit;

  const start = rows.length > 0 ? (page - 1) * limit + 1 : 0;
  const end = (page - 1) * limit + rows.length;

  const applySearch = () => {
    setPage(1);
    setQuery(draftQuery.trim());
  };

  const changeLimit = (next: number) => {
    setPage(1);
    setLimit(next);
  };

  const toggleSort = () => {
    setPage(1);
    setSortBy((s) => (s === "asc" ? "desc" : "asc"));
  };

  const normalizeVideo = (payload: any): VideoDataType | undefined => {
    if (!payload) return undefined;
    if (Array.isArray(payload)) return payload[0];
    return payload;
  };

  const gridCols = readOnly
    ? "grid-cols-[44px_minmax(280px,1.6fr)_1fr_1fr_1fr_0.6fr_0.7fr_0.8fr]"
    : "grid-cols-[44px_minmax(280px,1.6fr)_1fr_1fr_1fr_0.6fr_0.7fr_0.8fr_220px]";

  const handleEdit = async (id: string | number) => {
    if (readOnly) return; // ✅ hard block
    setOpen(true);
    setEditVideoData(undefined);

    try {
      const res = await getVideoById(id);
      const video = normalizeVideo(res?.data?.data);

      if (!video) {
        setOpen(false);
        return;
      }

      setEditVideoData(video);
    } catch {
      setOpen(false);
    }
  };

  const openDelete = (video: VideoDataType) => {
    if (readOnly) return; // ✅ hard block
    setActionMsg(null);
    setDeleteTarget(video);
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (readOnly) return; // ✅ hard block
    if (!deleteTarget?._id) return;

    setDeleting(true);
    setActionMsg(null);

    try {
      await deleteVideoById(String(deleteTarget._id));

      setActionMsg("Video deleted successfully.");
      setDeleteTarget(null);

      if (onDeletedRefresh) {
        onDeletedRefresh();
      } else {
        window.location.reload();
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to delete video. Please try again.";
      setActionMsg(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full rounded-2xl bg-[#1b1b1b] text-white ring-1 ring-white/10 relative">
      {/* Top header */}
      <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-semibold text-white/90">{title}</div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <input
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch();
              }}
              placeholder="Search..."
              className="h-9 w-full sm:w-56 rounded-xl bg-white/5 px-3 text-xs text-white/90 ring-1 ring-white/10 placeholder:text-white/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={applySearch}
              className="h-9 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white/90 ring-1 ring-white/10 hover:bg-white/15"
            >
              Search
            </button>
          </div>

          <button
            type="button"
            onClick={toggleSort}
            className="h-9 inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white/90 ring-1 ring-white/10 hover:bg-white/15"
            title="Toggle sort order"
          >
            Sort: {sortBy}
            <ArrowDown
              className={`h-4 w-4 transition-transform ${
                sortBy === "asc" ? "rotate-180" : ""
              }`}
            />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-white/55">Rows</span>
            <select
              value={limit}
              onChange={(e) => changeLimit(Number(e.target.value))}
              className="h-9 rounded-xl bg-white/5 px-3 text-xs text-white/90 ring-1 ring-white/10 focus:outline-none"
              title="Rows per page"
            >
              {[10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Optional action message */}
      {actionMsg ? (
        <div className="px-5 py-3 text-xs text-white/70 border-b border-white/10">
          {actionMsg}
        </div>
      ) : null}

      {/* Table header */}
      <div
        className={`grid ${gridCols} items-center gap-4 px-5 py-3 text-xs font-semibold text-white/60`}
      >
        <div className="flex items-center">
          <input
            type="checkbox"
            disabled
            className="h-4 w-4 rounded border-white/20 bg-transparent accent-white opacity-60"
          />
        </div>

        <div className="flex items-center gap-2">
          <span>Video</span>
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/50">
            Uploads
          </span>
        </div>

        <div>Visibility</div>

        <button
          type="button"
          onClick={toggleSort}
          className="flex items-center gap-2 text-left"
          title="Toggle sort by date"
        >
          <span>Date</span>
          <ArrowDown
            className={`h-4 w-4 transition-transform ${
              sortBy === "asc" ? "rotate-180" : ""
            }`}
          />
        </button>

        <div className="text-right">Views</div>
        <div className="text-right">Comments</div>
        <div className="text-right">Likes</div>

        {!readOnly ? <div className="text-right">Actions</div> : null}
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-sm text-white/60">No videos found.</div>
      ) : (
        <div className="divide-y divide-white/10">
          {rows.map((r) => {
            const visibility = r.isPublished ? "Public" : "Draft";
            const isDraft = visibility === "Draft";
            const dateLabel = formatDateLabel(r.createdAt);
            const dateSubLabel = "Uploaded";

            return (
              <div
                key={r._id}
                className={`grid ${gridCols} items-center gap-4 px-5 py-4 hover:bg-white/5`}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    disabled
                    className="h-4 w-4 rounded border-white/20 bg-transparent accent-white opacity-60"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Thumb
                    src={r.thumbnail}
                    duration={formatDuration(r.duration)}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white/90">
                      {r.title}
                    </div>
                    <div className="truncate text-xs text-white/50">
                      {r.description || "—"}
                    </div>

                    {isProbablyUrl(r.videoFile) ? (
                      <a
                        href={r.videoFile}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-white/60 underline hover:text-white/80"
                      >
                        Open video
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-white/80">
                  {isDraft ? (
                    <>
                      <FileText className="h-4 w-4 text-white/60" />
                      <span>Draft</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 text-white/60" />
                      <span>{visibility}</span>
                    </>
                  )}
                </div>

                <div>
                  <div className="text-sm text-white/80">{dateLabel}</div>
                  <div className="text-xs text-white/45">{dateSubLabel}</div>
                </div>

                <div className="text-right text-sm text-white/70">
                  {r.views}
                </div>
                <div className="text-right text-sm text-white/70">
                  {r.commentCounts}
                </div>
                <div className="text-right text-sm text-white/70">
                  {r.likesCount}
                </div>

                {!readOnly ? (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(r._id)}
                      className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 ring-1 ring-white/10 hover:bg-white/15"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => openDelete(r)}
                      className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 ring-1 ring-white/10 hover:bg-white/15"
                      title="Delete video"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-xs text-white/55">
          <span>
            {start}–{end}
          </span>
          <span className="hidden sm:inline">Page {page}</span>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => setPage(1)}
            disabled={!canPrev}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10 disabled:opacity-40"
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!canPrev}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10 disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/70 ring-1 ring-white/10">
            Page <span className="font-semibold text-white/90">{page}</span>
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={!canNext}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10 disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10 opacity-40"
            aria-label="Last page"
            title="Last page requires total pages from API"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Edit modal (only if not readOnly) */}
      {!readOnly && open && editVideoData ? (
        <EditVideo
          data={editVideoData}
          open={open}
          onClose={() => setOpen(false)}
          onUpdatedRefresh={onDeletedRefresh}
        />
      ) : null}

      {/* Delete confirm modal (only if not readOnly) */}
      {!readOnly && deleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#1b1b1b] ring-1 ring-white/10">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="text-sm font-semibold">Delete video</div>
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleting}
                className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 text-sm text-white/75">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white/90">
                {deleteTarget.title}
              </span>
              ? This action can’t be undone.
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleting}
                className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 ring-1 ring-white/10 hover:bg-white/15 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-100 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
