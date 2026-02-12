import React from "react";
import { MoreVertical } from "lucide-react";
import { Link } from "react-router-dom";

export type VideoCard = {
  id: string;
  title: string;
  channelName: string;
  channelAvatarUrl?: string;
  viewsText: string;
  timeText: string;
  duration: string;
  thumbnailUrl: string;
  verified?: boolean;
};

const Avatar = ({
  channelName,
  channelAvatarUrl,
}: {
  channelName: string;
  channelAvatarUrl?: string;
}) => (
  <div className="mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
    {channelAvatarUrl ? (
      <img
        src={channelAvatarUrl}
        alt={channelName}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    ) : (
      <div className="grid h-full w-full place-items-center text-sm font-semibold text-black/60 dark:text-white/60">
        {channelName?.[0]?.toUpperCase() ?? "U"}
      </div>
    )}
  </div>
);

export const VideosSection = ({
  videos,
  heading = "Videos",
}: {
  videos: VideoCard[];
  heading?: string;
}) => {
  return (
    <section className="w-full bg-light-background text-black dark:bg-dark-background dark:text-white">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight text-black/90 dark:text-white/90">
          {heading}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v, index) => (
          <Link key={index} to={`/watch/${v.id}`}>
            <article className="group">
              <div className="relative overflow-hidden rounded-2xl bg-black/5 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
                <div className="aspect-video w-full">
                  <img
                    src={v.thumbnailUrl}
                    alt={v.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </div>

                <div className="absolute bottom-2 right-2 rounded-lg bg-black/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                  {v.duration}
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3">
                <Avatar
                  channelName={v.channelName}
                  channelAvatarUrl={v.channelAvatarUrl}
                />

                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-base font-semibold leading-snug text-black/90 dark:text-white/90">
                    {v.title}
                  </h3>

                  <div className="mt-1 flex items-center gap-1 text-sm text-black/60 dark:text-white/60">
                    <span className="truncate">{v.channelName}</span>
                    {v.verified && (
                      <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/10 text-[10px] font-bold text-black/70 dark:bg-white/10 dark:text-white/70">
                        ✓
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-sm text-black/55 dark:text-white/55">
                    {v.viewsText} • {v.timeText}
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Video options"
                  className="rounded-full p-2 text-black/60 hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white/85"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
};
