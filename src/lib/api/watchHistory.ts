import { api } from "./api";

export const addToWatchHistory = (videoId: string) =>
  api.post(`/v1/watch-history/add-to-watch-history/${videoId}`, { videoId });

export const getWatchHistory = (page = 1, limit = 10) =>
  api.get(`/v1/watch-history/get-watch-history?page=${page}&limit=${limit}`);

export const removeFromWatchHistory = (videoId: string) =>
  api.delete(`/v1/watch-history/remove-from-watch-history/${videoId}`);

export const clearWatchHistory = () =>
  api.delete(`/v1/watch-history/clear-watch-history`);
