import { ListVideo, SlidersHorizontal, MoreVertical } from "lucide-react";

type Playlist = {
  id: string;
  title: string;
  privacy: "Private" | "Public" | "Unlisted";
  videosCount: number;
  thumbnailUrl: string;
  badgeAccent?: "green" | "blue";
};

const playlists: Playlist[] = [
  {
    id: "1",
    title: "plus project",
    privacy: "Private",
    videosCount: 3,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1400&q=60",
  },
  {
    id: "2",
    title: "hacking",
    privacy: "Private",
    videosCount: 1,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1400&q=60",
  },
  {
    id: "3",
    title: "portfolio",
    privacy: "Private",
    videosCount: 4,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1400&q=60",
    badgeAccent: "blue",
  },
  {
    id: "4",
    title: "node.js projects",
    privacy: "Private",
    videosCount: 17,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1618477247222-acbdb0e159b3?auto=format&fit=crop&w=1400&q=60",
    badgeAccent: "green",
  },
];

const accentRing = (accent?: Playlist["badgeAccent"]) => {
  if (accent === "green") return "ring-2 ring-green-500/80";
  if (accent === "blue") return "ring-2 ring-sky-500/80";
  return "ring-1 ring-black/10 dark:ring-white/10";
};

export const PlaylistsSection = () => {
  return (
    <section className="w-full bg-light-background text-black dark:bg-dark-background dark:text-white">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-medium text-black/90 dark:text-white/90">
          Created playlists
        </h2>

        <button
          type="button"
          className="inline-flex items-center gap-3 rounded-full px-3 py-2 text-black/70 hover:bg-black/5 hover:text-black dark:text-white/80 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <SlidersHorizontal className="h-6 w-6" />
          <span className="text-lg font-medium">Sort by</span>
        </button>
      </div>

      {/* Grid */}
      <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {playlists.map((pl) => (
          <div key={pl.id} className="group">
            {/* Thumbnail */}
            <div className="relative">
              <div className="h-1.5 w-full rounded-t-2xl bg-black/10 dark:bg-white/10" />

              <div className="relative overflow-hidden rounded-2xl bg-black/4 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
                <div className="aspect-video w-full">
                  <img
                    src={pl.thumbnailUrl}
                    alt={pl.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>

                {/* videos badge */}
                <div className="absolute bottom-3 right-3">
                  <div
                    className={[
                      "inline-flex items-center gap-2 rounded-lg bg-black/70 px-3 py-2 text-sm font-semibold text-white backdrop-blur",
                      accentRing(pl.badgeAccent),
                    ].join(" ")}
                  >
                    <ListVideo className="h-4 w-4 text-white/90" />
                    <span>
                      {pl.videosCount}{" "}
                      {pl.videosCount === 1 ? "video" : "videos"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-semibold tracking-tight text-black dark:text-white">
                  {pl.title}
                </div>

                <div className="mt-1 text-base text-black/60 dark:text-white/60">
                  {pl.privacy}
                </div>

                <button
                  type="button"
                  className="mt-2 text-base font-medium text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white/85"
                >
                  View full playlist
                </button>
              </div>

              <button
                type="button"
                aria-label="Playlist options"
                className="mt-1 rounded-full p-2 text-black/60 hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white/85"
              >
                <MoreVertical className="h-6 w-6" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
