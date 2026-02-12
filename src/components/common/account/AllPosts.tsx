import React from "react";
import { Heart, MessageCircle, Share2, MoreVertical } from "lucide-react";
import type { PostsResponseData } from "./PostsSection";

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

const StatPill = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-black/70 dark:bg-white/5 dark:text-white/75">
    {children}
  </div>
);

const ActionButton = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    type="button"
    className="inline-flex items-center gap-2 rounded-full bg-black/5 px-4 py-2 text-sm font-semibold text-black/80 transition hover:bg-black/10 dark:bg-white/5 dark:text-white/85 dark:hover:bg-white/10"
  >
    {icon}
    <span>{label}</span>
  </button>
);

const SkeletonCard = () => (
  <div className="rounded-3xl border border-black/10 bg-black/2 p-6 dark:border-white/10 dark:bg-white/3">
    <div className="flex items-center gap-4">
      <div className="h-11 w-11 rounded-full bg-black/10 dark:bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 rounded bg-black/10 dark:bg-white/10" />
        <div className="h-3 w-28 rounded bg-black/10 dark:bg-white/10" />
      </div>
    </div>
    <div className="mt-5 space-y-2">
      <div className="h-4 w-full rounded bg-black/10 dark:bg-white/10" />
      <div className="h-4 w-5/6 rounded bg-black/10 dark:bg-white/10" />
      <div className="h-4 w-2/3 rounded bg-black/10 dark:bg-white/10" />
    </div>
  </div>
);

const AllPosts = ({
  data,
  loading,
  displayName = "Muhammad Owais",
}: {
  data: PostsResponseData | null;
  loading?: boolean;
  displayName?: string;
}) => {
  const posts = data?.docs ?? [];

  return (
    <section className="w-full bg-light-background text-black dark:bg-dark-background dark:text-white">
      <div className="rounded-3xl border border-black/10 bg-black/2 p-6 shadow-[0_0_0_1px_rgba(0,0,0,0.04)] md:p-8 dark:border-white/10 dark:bg-white/3 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Your posts
            </h2>
            <p className="mt-1 text-sm text-black/55 dark:text-white/55">
              {data ? (
                <>
                  {data.totalDocs} total • Page {data.page} of {data.totalPages}
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-7 space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Empty */}
        {!loading && posts.length === 0 && (
          <div className="mt-8 rounded-2xl border border-black/10 bg-black/3 p-8 text-center dark:border-white/10 dark:bg-white/3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-black/5 text-lg font-semibold dark:bg-white/5">
              ✨
            </div>
            <h3 className="mt-4 text-lg font-semibold">No posts yet</h3>
            <p className="mt-1 text-sm text-black/55 dark:text-white/55">
              Write something above and hit{" "}
              <span className="font-semibold">Post</span>.
            </p>
          </div>
        )}

        {/* List */}
        {!loading && posts.length > 0 && (
          <div className="mt-7 space-y-4">
            {posts.map((post) => (
              <article
                key={post._id}
                className="group rounded-3xl border border-black/10 bg-black/2 p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.03)] transition hover:bg-black/3 md:p-6 dark:border-white/10 dark:bg-white/3 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02)] dark:hover:bg-white/5"
              >
                {/* Top */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-green-700 text-lg font-semibold text-white">
                      {initials(displayName)}
                    </div>

                    <div>
                      <div className="text-base font-semibold leading-tight">
                        {displayName}
                      </div>
                      <div className="mt-1 text-xs text-black/55 dark:text-white/55">
                        {formatDate(post.createdAt)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Post options"
                    className="rounded-full p-2 text-black/60 hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white/85"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <p className="mt-4 whitespace-pre-wrap text-[17px] leading-relaxed text-black/90 dark:text-white/90">
                  {post.content}
                </p>

                {/* Stats */}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <StatPill>
                    <Heart className="h-6 w-6" />
                    {post.likesCount ?? 0} likes
                  </StatPill>

                  <StatPill>
                    <MessageCircle className="h-6 w-6" />
                    {post.commentCounts ?? 0} comments
                  </StatPill>

                  <ActionButton
                    icon={<Share2 className="h-4 w-4" />}
                    label="Share"
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default AllPosts;
