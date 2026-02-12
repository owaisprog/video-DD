// src/lib/api/video.ts
import { api } from "./api";

// publish video
export const publishVideo = (payload: any) =>
  api.post("/v1/video/publish-video", payload);

// get all user videos
export const getAllUserVideos = ({
  page,
  limit,
  query,
  sortBy,
}: {
  page: number;
  limit: number;
  query: string;
  sortBy: string;
}) =>
  api.get(
    `/v1/video/get-my-all-videos?page=${page}&limit=${limit}&query=${encodeURIComponent(
      query,
    )}&sortBy=${sortBy}`,
  );

// get all videos

export type GetAllVideosParams = {
  page?: number;
  limit?: number;
  query?: string;
  sortBy?: "asc" | "desc"; // order
  sortType?: string; // field name, e.g. "createdAt"
  userId?: string; // channel/user id to filter
};

export const getAllVideos = (params?: GetAllVideosParams) =>
  api.get("/v1/video/get-all-videos", { params });

// get video by id
export const getVideoById = (id: string | number) =>
  api.get(`/v1/video/get-video-by-Id/${id}`);

// update video data
export const updateVideoData = ({
  videoId,
  data,
}: {
  videoId: string;
  data: { title: string; description: string; isPublished: boolean };
}) => api.patch(`/v1/video/edit-video-data/${videoId}`, data);

// update video file
export const updateVideo = ({
  videoId,
  video,
}: {
  videoId: string;
  video: FormData;
}) =>
  api.put(`/v1/video/update-video/${videoId}`, video, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

// update video thumbnail
export const updateThumbnail = ({
  videoId,
  data,
}: {
  videoId: string;
  data: FormData;
}) =>
  api.put(`/v1/video/edit-video-thumbnail/${videoId}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// get suggested videos
export const getSuggestedVideos = ({
  videoId,
  page = 1,
  limit = 20,
}: {
  videoId: string;
  page?: number;
  limit?: number;
}) =>
  api.get(`/v1/video/get-suggested-videos/${videoId}`, {
    params: { page, limit },
  });

//toggle video like
export const toggleVideoLike = (videoId: string) =>
  api.patch(`/v1/like/by-video/${videoId}`);

//increment video view count
export const incrementVideoView = (videoId: string) =>
  api.get(`/v1/video/increment-video-view/${videoId}`);

//delete video by id
export const deleteVideoById = (videoId: string) =>
  api.delete(`/v1/video/delete-video/${videoId}`);
