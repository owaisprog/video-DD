import React, { useState } from "react";
import { Plus, Video as VideoIcon } from "lucide-react";

import { VideosListPanel } from "./VideosListPanel";
import type { VideoDataType } from "./types";
import { CreateVideo } from "./CreateVideo";

type CreateSectionProps = {
  videosData: VideoDataType[];
  loading: boolean;
  error: string | null;

  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;

  limit: number;
  setLimit: React.Dispatch<React.SetStateAction<number>>;

  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;

  sortBy: "asc" | "desc";
  setSortBy: React.Dispatch<React.SetStateAction<"asc" | "desc">>;

  onDeletedRefresh?: () => void;

  readOnly?: boolean;
};

const SkeletonTableRow = ({ gridCols }: { gridCols: string }) => (
  <div className={`grid ${gridCols} items-center gap-4 px-5 py-4`}>
    <div className="h-4 w-4 rounded bg-black/10 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10" />

    <div className="flex min-w-0 items-center gap-4">
      <div className="h-16 w-28 shrink-0 rounded-xl bg-black/10 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10" />
      <div className="min-w-0 flex-1">
        <div className="h-4 w-3/4 rounded bg-black/10 dark:bg-white/10" />
        <div className="mt-2 h-3 w-5/6 rounded bg-black/10 dark:bg-white/10" />
        <div className="mt-2 h-3 w-2/5 rounded bg-black/10 dark:bg-white/10" />
      </div>
    </div>

    <div className="h-4 w-20 rounded bg-black/10 dark:bg-white/10" />
    <div>
      <div className="h-4 w-24 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-2 h-3 w-16 rounded bg-black/10 dark:bg-white/10" />
    </div>

    <div className="h-4 w-16 justify-self-end rounded bg-black/10 dark:bg-white/10" />
    <div className="h-4 w-16 justify-self-end rounded bg-black/10 dark:bg-white/10" />
    <div className="h-4 w-16 justify-self-end rounded bg-black/10 dark:bg-white/10" />

    {gridCols.includes("220px") ? (
      <div className="flex justify-end gap-2">
        <div className="h-9 w-24 rounded-full bg-black/10 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10" />
        <div className="h-9 w-24 rounded-full bg-black/10 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10" />
      </div>
    ) : null}
  </div>
);

const VideosListSkeleton = ({ readOnly }: { readOnly?: boolean }) => {
  const gridCols = readOnly
    ? "grid-cols-[44px_minmax(280px,1.6fr)_1fr_1fr_1fr_0.6fr_0.7fr_0.8fr]"
    : "grid-cols-[44px_minmax(280px,1.6fr)_1fr_1fr_1fr_0.6fr_0.7fr_0.8fr_220px]";

  const headerColsCount = readOnly ? 8 : 9;

  return (
    <div className="w-full overflow-hidden rounded-2xl bg-light-background text-black ring-1 ring-black/10 dark:bg-dark-background dark:text-white dark:ring-white/10">
      <div className="flex flex-col gap-3 border-b border-black/10 px-5 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-4 w-40 rounded bg-black/10 dark:bg-white/10" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="h-9 w-full rounded-xl bg-black/10 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10 sm:w-56" />
          <div className="h-9 w-20 rounded-xl bg-black/10 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10" />
          <div className="h-9 w-24 rounded-xl bg-black/10 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10" />
        </div>
      </div>

      <div className={`grid ${gridCols} items-center gap-4 px-5 py-3`}>
        {Array.from({ length: headerColsCount }).map((_, i) => (
          <div key={i} className="h-3 rounded bg-black/10 dark:bg-white/10" />
        ))}
      </div>

      <div className="animate-pulse divide-y divide-black/10 dark:divide-white/10">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonTableRow key={i} gridCols={gridCols} />
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-black/10 px-5 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-4 w-28 rounded bg-black/10 dark:bg-white/10" />
        <div className="flex items-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-9 rounded-xl bg-black/10 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10"
            />
          ))}
          <div className="h-9 w-28 rounded-xl bg-black/10 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10" />
        </div>
      </div>
    </div>
  );
};

export const CreateSection: React.FC<CreateSectionProps> = ({
  videosData,
  loading,
  error,
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
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const [uploadingIds, setUploadingIds] = useState<string[]>([]);

  const addUploading = (id: string) =>
    setUploadingIds((prev) => (prev.includes(id) ? prev : [id, ...prev]));

  const removeUploading = (id: string) =>
    setUploadingIds((prev) => prev.filter((x) => x !== id));

  return (
    <>
      <section className="mb-5 flex w-full flex-col gap-3 overflow-hidden rounded-2xl bg-light-background px-5 py-4 text-black ring-1 ring-black/10 dark:bg-dark-background dark:text-white dark:ring-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-black/5 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
            <VideoIcon className="h-5 w-5 text-black/80 dark:text-white/80" />
          </div>

          <div>
            <div className="text-sm font-semibold">
              {readOnly ? "Uploads" : "Your uploads"}
            </div>
            <div className="text-xs text-black/60 dark:text-white/50">
              {readOnly
                ? "Browse videos uploaded on this channel."
                : "Upload a video to start building your library."}
            </div>
          </div>
        </div>

        {!readOnly ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-black/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:bg-white dark:text-black dark:hover:bg-neutral-100 dark:focus-visible:ring-white/40"
            >
              <Plus className="h-4 w-4" />
              Upload video
            </button>
          </div>
        ) : null}
      </section>

      {loading ? (
        <VideosListSkeleton readOnly={readOnly} />
      ) : error ? (
        <div className="w-full rounded-2xl bg-light-background px-5 py-4 text-sm text-black ring-1 ring-black/10 dark:bg-dark-background dark:text-white dark:ring-white/10">
          {error}
        </div>
      ) : (
        <VideosListPanel
          rows={videosData}
          page={page}
          setPage={setPage}
          limit={limit}
          setLimit={setLimit}
          query={query}
          setQuery={setQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onDeletedRefresh={onDeletedRefresh}
          readOnly={readOnly}
          title={readOnly ? "Videos" : "Content"}
          uploadingIds={uploadingIds}
          onUploadComplete={(videoId) => {
            removeUploading(videoId);
            onDeletedRefresh?.();
          }}
        />
      )}

      {!readOnly ? (
        <CreateVideo
          open={open}
          onClose={() => setOpen(false)}
          onSuccess={(videoId) => {
            addUploading(videoId);
            onDeletedRefresh?.();
          }}
        />
      ) : null}
    </>
  );
};
