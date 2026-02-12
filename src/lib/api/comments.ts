import { api } from "./api";

export type CommentUser = {
  _id: string;
  username: string;
  fullname?: string;
  avatar?: string;
};

export type CommentItem = {
  _id: string;
  text: string;
  video: string;
  user: CommentUser;
  createdAt: string;
  updatedAt: string;
};

export type Paginated<T> = {
  docs: T[];
  totalDocs: number;
  limit: number;
  page?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  nextPage?: number | null;
  hasPrevPage?: boolean;
  prevPage?: number | null;
};

export type ApiEnvelope<T> = {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
};

export const getVideoCommentsApi = (videoId: string, page = 1, limit = 10) =>
  api.get<ApiEnvelope<Paginated<CommentItem>>>(`/v1/comment/video/${videoId}`, {
    params: { page, limit },
  });

export const addCommentApi = (videoId: string, text: string) =>
  api.post<ApiEnvelope<CommentItem>>(
    `/v1/comment/video/${videoId}`,
    { text },
    { headers: { "Content-Type": "application/json" } },
  );

export const updateCommentApi = (commentId: string, text: string) =>
  api.patch<ApiEnvelope<CommentItem>>(
    `/v1/comment/${commentId}`,
    { text },
    { headers: { "Content-Type": "application/json" } },
  );

export const deleteCommentApi = (commentId: string) =>
  api.delete<ApiEnvelope<{}>>(`/v1/comment/${commentId}`);
