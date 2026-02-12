import { MediaPlayer, MediaProvider } from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import "@vidstack/react/player/styles/default/layouts/audio.css";

type Props = {
  src: string | Blob | File;
  title?: string;
};

export function VideoPlayer({ src, title = "Video" }: Props) {
  const playerSrc =
    typeof src === "string" ? src : ({ src, type: "video/object" } as const); // ✅ literal type, not string

  return (
    <MediaPlayer
      title={title}
      src={playerSrc}
      playsInline
      preload="metadata"
      className="h-full w-full aspect-video overflow-hidden rounded-xl"
    >
      <MediaProvider />
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}
