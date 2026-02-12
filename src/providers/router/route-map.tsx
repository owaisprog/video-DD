import type { RouteObject } from "react-router-dom";
import MainLayout from "../../components/layout/main-layout";
import { RequireAuth } from "../../components/guards/RequireAuth";

export const RouteMap: RouteObject[] = [
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, lazy: () => import("../../routes/home") },
      {
        element: <RequireAuth />,
        children: [
          { path: "history", lazy: () => import("../../routes/history") },
          { path: "account", lazy: () => import("../../routes/account") },
          {
            path: "watch-history",
            lazy: () => import("../../routes/watch-history"),
          },

          {
            path: "playlists",
            lazy: () => import("../../routes/playlists"), // must export Component (PlaylistsLayout)
            children: [
              {
                index: true, // ✅ THIS is what makes /playlists show something
                lazy: () => import("../../routes/playlists/Playlists"), // must export Component
              },
              {
                path: ":playlistId", // /playlists/:playlistId
                lazy: () => import("../../routes/playlists/PlaylistDetails"), // must export Component
              },
            ],
          },

          {
            path: "watch-later",
            lazy: () => import("../../routes/watch-later"),
          },
          {
            path: "threads",
            lazy: () => import("../../routes/threads"), // must export Component (Threads)
          },
          {
            path: "channel/:channelId",
            lazy: () => import("../../routes/channel"),
          },
        ],
      },
    ],
  },
  { path: "/login", lazy: () => import("../../routes/login") },
  { path: "/signup", lazy: () => import("../../routes/signup") },
  {
    path: "/watch/:videoId",
    element: <MainLayout />,
    children: [{ index: true, lazy: () => import("../../routes/watch") }],
  },
];
