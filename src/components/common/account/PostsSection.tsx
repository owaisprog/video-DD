import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast, { Toaster } from "react-hot-toast";

import { getPosts, publishPost } from "../../../lib/api/post";
import { extractMessageFromHtml } from "../../../utils/extractMessageFromHtml";
import AllPosts from "./AllPosts";
import { useAuth } from "../../../context/auth-context";

type FormType = {
  content: string;
};

type Owner = {
  _id: string;
  username?: string;
  email?: string;
  fullname?: string;
  avatar?: string;
};

export type Post = {
  _id: string;
  content: string;
  owner?: Owner | null; // ✅ owner is object now
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentCounts: number;
  __v?: number;
};

export type PostsResponseData = {
  docs: Post[];
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

type ApiResponse<T> = {
  statusCode: number;
  data: T;
  message: any;
  success: boolean;
};

const isProbablyUrl = (v?: string) =>
  !!v && (v.startsWith("http://") || v.startsWith("https://"));

const initials = (name?: string) => {
  const s = String(name || "").trim();
  if (!s) return "U";
  const parts = s.split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "U";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
};

export const PostsSection = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<FormType>({
    mode: "onChange",
    defaultValues: { content: "" },
  });

  const { state } = useAuth();

  const [postData, setPostData] = useState<PostsResponseData | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const authed = state.status === "authed";
  const userId = authed ? String((state as any).user?._id) : null;
  const displayName = authed
    ? String(
        (state as any).user?.fullname ||
          (state as any).user?.username ||
          "User",
      )
    : "User";
  const avatar = authed ? String((state as any).user?.avatar || "") : "";

  const showError = (err: any) => {
    const raw = err?.response?.data;
    const msg =
      typeof raw === "string"
        ? extractMessageFromHtml(raw)
        : raw?.message ||
          err?.message ||
          "Something went wrong. Please try again.";
    toast.error(String(msg), { position: "bottom-right" });
  };

  const fetchPosts = async (uid: string, page = 1, limit = 10) => {
    try {
      setLoadingPosts(true);

      // ✅ FIX: getPosts supports options object OR string; using options is clearer
      const response = await getPosts({
        userId: uid,
        page,
        limit,
        sortBy: "createdAt",
        sortType: "desc",
      });

      // API shape: { statusCode, data: { docs... }, message, success }
      const payload = response.data as ApiResponse<PostsResponseData>;
      setPostData(payload.data);
    } catch (err: any) {
      showError(err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const onSubmit = async (data: FormType) => {
    try {
      const text = data.content.trim();
      if (!text) return;

      const response = await publishPost(text);

      if (response.status === 201) {
        toast.success("Post Published Successfully", {
          position: "bottom-right",
        });
        reset({ content: "" });

        if (userId) {
          await fetchPosts(userId, 1, 10);
        }
      }
    } catch (err: any) {
      showError(err);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchPosts(userId, 1, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!authed) {
    return (
      <section className="w-full bg-light-background text-black dark:bg-dark-background dark:text-white">
        <div className="rounded-3xl border border-black/10 bg-black/2 p-6 text-center dark:border-white/10 dark:bg-white/3">
          Login to view and create posts.
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-light-background text-black dark:bg-dark-background dark:text-white">
      <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />

      {/* Create Post Card */}
      <div className="rounded-3xl border border-black/10 bg-black/2 p-6 shadow-[0_0_0_1px_rgba(0,0,0,0.04)] md:p-8 dark:border-white/10 dark:bg-white/3 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 overflow-hidden rounded-full bg-black/10 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10">
            {isProbablyUrl(avatar) ? (
              <img
                src={avatar}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-sm font-bold text-black/70 dark:text-white/75">
                {initials(displayName)}
              </div>
            )}
          </div>

          <div>
            <div className="text-2xl font-semibold tracking-tight text-black dark:text-white">
              {displayName}
            </div>
            <div className="text-sm text-black/55 dark:text-white/50">
              Share something new
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <textarea
            {...register("content", { required: true })}
            className="mt-6 w-full resize-none rounded-2xl bg-black/3 px-5 py-6 text-lg text-black ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-black dark:bg-black dark:text-white dark:ring-white/5 dark:focus:ring-white"
            placeholder="Post an update…"
            rows={4}
          />

          <div className="mt-7 flex items-center justify-end gap-3">
            <button
              type="submit"
              className={`rounded-full px-6 py-3 text-lg font-semibold ${
                isValid
                  ? "bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
                  : "cursor-not-allowed bg-black/5 text-black/30 dark:bg-white/5 dark:text-white/30"
              }`}
              disabled={!isValid}
            >
              Post
            </button>
          </div>
        </form>
      </div>

      {/* Posts List */}
      <div className="mt-6">
        <AllPosts
          data={postData}
          loading={loadingPosts}
          displayName={displayName}
        />
      </div>
    </section>
  );
};
