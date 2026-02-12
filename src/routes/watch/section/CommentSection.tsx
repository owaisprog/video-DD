import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  addCommentApi,
  deleteCommentApi,
  getVideoCommentsApi,
  updateCommentApi,
  type CommentItem,
} from "../../../lib/api/comments";

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const mo = Math.floor(day / 30);
  const yr = Math.floor(day / 365);

  if (yr > 0) return `${yr} year${yr > 1 ? "s" : ""} ago`;
  if (mo > 0) return `${mo} month${mo > 1 ? "s" : ""} ago`;
  if (day > 0) return `${day} day${day > 1 ? "s" : ""} ago`;
  if (hr > 0) return `${hr} hour${hr > 1 ? "s" : ""} ago`;
  if (min > 0) return `${min} minute${min > 1 ? "s" : ""} ago`;
  return "just now";
};

// Adjust to your auth storage (context/redux/etc.)
const getCurrentUserId = (): string | null => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u?._id ?? null;
  } catch {
    return null;
  }
};

export const CommentsSection = ({
  videoId,
  pageSize = 10,
}: {
  videoId: string;
  pageSize?: number;
}) => {
  const myUserId = useMemo(() => getCurrentUserId(), []);
  const [items, setItems] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalDocs, setTotalDocs] = useState(0);

  const [text, setText] = useState("");

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const fetchPage = async (p: number, mode: "replace" | "append") => {
    try {
      setLoading(true);
      const res = await getVideoCommentsApi(videoId, p, pageSize);
      const data = res.data.data;

      setTotalDocs(data.totalDocs ?? 0);
      setHasNextPage(Boolean(data.hasNextPage));

      if (mode === "replace") setItems(data.docs ?? []);
      else setItems((prev) => [...prev, ...(data.docs ?? [])]);

      setPage(p);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load comments",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!videoId) return;
    setItems([]);
    setPage(1);
    setHasNextPage(false);
    setTotalDocs(0);
    fetchPage(1, "replace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;

    try {
      setPosting(true);
      const res = await addCommentApi(videoId, t);
      const created = res.data.data;

      setItems((prev) => [created, ...prev]);
      setTotalDocs((n) => n + 1);
      setText("");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to add comment",
      );
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (c: CommentItem) => {
    setEditingId(c._id);
    setEditText(c.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async (commentId: string) => {
    const t = editText.trim();
    if (!t) return;

    try {
      const res = await updateCommentApi(commentId, t);
      const updated = res.data.data;

      setItems((prev) => prev.map((c) => (c._id === commentId ? updated : c)));
      toast.success("Comment updated");
      cancelEdit();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update comment",
      );
    }
  };

  const remove = async (commentId: string) => {
    const ok = window.confirm("Delete this comment?");
    if (!ok) return;

    try {
      await deleteCommentApi(commentId);
      setItems((prev) => prev.filter((c) => c._id !== commentId));
      setTotalDocs((n) => Math.max(0, n - 1));
      toast.success("Comment deleted");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete comment",
      );
    }
  };

  return (
    <div className="mt-7 rounded-2xl border border-black/10 bg-black/2 p-5 dark:border-white/10 dark:bg-white/3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Comments ({totalDocs})</div>
      </div>

      {/* Add comment */}
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[84px] w-full rounded-xl border border-black/10 bg-white p-3 text-sm text-black outline-none focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-black/20 dark:text-white"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setText("")}
            className="rounded-full bg-black/5 px-4 py-2 text-sm font-semibold text-black/70 hover:bg-black/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
          >
            Clear
          </button>
          <button
            disabled={posting}
            className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-black/85 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/85"
          >
            {posting ? "Posting..." : "Comment"}
          </button>
        </div>
      </form>

      {/* List */}
      <div className="mt-5 space-y-4">
        {loading && items.length === 0 ? (
          <div className="text-sm text-black/55 dark:text-white/55">
            Loading comments...
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-black/55 dark:text-white/55">
            No comments yet.
          </div>
        ) : (
          items.map((c) => {
            const isMine = myUserId && String(c.user?._id) === String(myUserId);

            return (
              <div key={c._id} className="flex gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                  {c.user?.avatar ? (
                    <img
                      src={c.user.avatar}
                      alt={c.user.fullname || c.user.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-green-700 text-sm font-semibold text-white">
                      {(
                        c.user?.fullname?.[0] ||
                        c.user?.username?.[0] ||
                        "U"
                      ).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <div className="text-sm font-semibold text-black/85 dark:text-white/85">
                      {c.user?.fullname || c.user?.username || "User"}
                    </div>
                    <div className="text-xs text-black/50 dark:text-white/50">
                      {timeAgo(c.createdAt)}
                    </div>

                    {isMine && (
                      <div className="ml-auto flex items-center gap-2">
                        {editingId === c._id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEdit(c._id)}
                              className="text-xs font-semibold text-black/70 hover:underline dark:text-white/70"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="text-xs font-semibold text-black/50 hover:underline dark:text-white/50"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(c)}
                              className="text-xs font-semibold text-black/70 hover:underline dark:text-white/70"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(c._id)}
                              className="text-xs font-semibold text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {editingId === c._id ? (
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-black/10 bg-white p-2 text-sm text-black outline-none focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-black/20 dark:text-white"
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-black/80 dark:text-white/80">
                      {c.text}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load more */}
      {!loading && hasNextPage && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => fetchPage(page + 1, "append")}
            className="rounded-full bg-black/5 px-5 py-2 text-sm font-semibold text-black/70 hover:bg-black/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
};
