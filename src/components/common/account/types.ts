export type VideoDataType = {
  _id: string;
  videoFile: string;
  thumbnail: string;
  title: string;
  description: string;
  duration: number; // seconds
  views: string; // API gives "0" as string
  isPublished: boolean;
  owner: string[];
  likesCount: number;
  commentCounts: number;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  __v: number;
};

export type PaginatedResponse<T> = {
  docs: T[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
};

export type GetAllUserVideosResponse = {
  statusCode: number;
  data: PaginatedResponse<VideoDataType>;
  message: string;
  success: boolean;
};
