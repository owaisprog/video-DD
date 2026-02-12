// src/lib/api/playlist.ts
import { api } from "./api";

export type CreatePlaylistPayload = {
  name: string;
  description: string;
};

export const createPlaylist = (payload: CreatePlaylistPayload) =>
  api.post("/v1/playlist/create-playlist", payload, {
    headers: { "Content-Type": "application/json" },
  });

export const getUserPlaylists = (userId: string, page = 1, limit = 50) =>
  api.get(`/v1/playlist/get-user-playlists/user/${userId}/${page}/${limit}`);

export const getPlaylistById = (playlistId: string, page = 1, limit = 50) =>
  api.get(`/v1/playlist/get-playlist-videos/${playlistId}/${page}/${limit}`);

export const addVideoToPlaylist = (playlistId: string, videoId: string) =>
  api.patch(`/v1/playlist/add-video-to-playlist/${playlistId}/add/${videoId}`);

export const removeVideoFromPlaylist = (playlistId: string, videoId: string) =>
  api.patch(
    `/v1/playlist/remove-video-from-playlist/${playlistId}/remove/${videoId}`,
  );

export const updatePlaylist = (
  playlistId: string,
  payload: Partial<CreatePlaylistPayload>,
) => api.patch(`/v1/playlist/update-playlist/${playlistId}`, payload);

export const deletePlaylist = (playlistId: string) =>
  api.delete(`/v1/playlist/delete-playlist/${playlistId}`);
