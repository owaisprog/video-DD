// src/lib/api/post.ts
import { api } from "./api";

export type CreatePostPayload = { content: string };

export const publishPost = (content: string) =>
  api.post("/v1/post/create-post", { content } satisfies CreatePostPayload, {
    headers: { "Content-Type": "application/json" },
  });

// Allow BOTH usages:
//   getPosts("userId")
//   getPosts({ userId, page, limit, sortBy, sortType })
export type GetPostsOptions =
  | string
  | {
      userId?: string;
      page?: number;
      limit?: number;
      sortBy?: "createdAt" | "updatedAt" | "_id";
      sortType?: "asc" | "desc";
    };

export const getPosts = (opts?: GetPostsOptions) => {
  const params = new URLSearchParams();

  // backward compatible: getPosts(userId)
  if (typeof opts === "string") {
    params.set("userId", opts);
    params.set("page", "1");
    params.set("limit", "10");
    params.set("sortBy", "createdAt");
    params.set("sortType", "desc");
    return api.get(`/v1/post/get-user-posts?${params.toString()}`);
  }

  // modern: getPosts({ ... })
  if (opts?.userId) params.set("userId", opts.userId);
  params.set("page", String(opts?.page ?? 1));
  params.set("limit", String(opts?.limit ?? 10));
  params.set("sortBy", String(opts?.sortBy ?? "createdAt"));
  params.set("sortType", String(opts?.sortType ?? "desc"));

  return api.get(`/v1/post/get-user-posts?${params.toString()}`);
};
