import { useEffect, useMemo, useState } from "react";
import { X, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { createPlaylist } from "../../../lib/api/playlist";
import { extractMessageFromHtml } from "../../../utils/extractMessageFromHtml";

type ApiResponse<T> = {
  statusCode: number;
  data: T;
  message: any;
  success: boolean;
};

type ApiPlaylist = {
  _id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function CreatePlaylistModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (playlist: ApiPlaylist) => void;
}) {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const canSubmit = useMemo(() => {
    // Your backend currently validates BOTH name + description
    return name.trim().length > 0 && description.trim().length > 0 && !creating;
  }, [name, description, creating]);

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setCreating(false);
  }, [open]);

  const showAuthError = (err: any) => {
    const status = err?.response?.status;
    const raw = err?.response?.data;

    const serverMessage =
      typeof raw === "string"
        ? extractMessageFromHtml(raw)
        : raw?.message || raw?.error || "";

    const msg = String(serverMessage || err?.message || "").toLowerCase();

    if (status === 401 || msg.includes("jwt expired")) {
      toast.error("You need to login", { position: "bottom-right" });
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");
      navigate("/login", { replace: true });
      return true;
    }
    return false;
  };

  const handleCreate = async () => {
    if (!canSubmit) {
      toast.error("Name and description are required", {
        position: "bottom-right",
      });
      return;
    }

    setCreating(true);
    try {
      const res = await createPlaylist({
        name: name.trim(),
        description: description.trim(),
      });

      const payload = res.data as ApiResponse<any>;
      const created = payload?.data as ApiPlaylist;

      if (!created?._id) {
        toast.error("Playlist created but response is invalid.", {
          position: "bottom-right",
        });
        return;
      }

      toast.success("Playlist created", { position: "bottom-right" });
      onCreated(created);
      onClose();
    } catch (err: any) {
      const handled = showAuthError(err);
      if (!handled) {
        const raw = err?.response?.data;
        const serverMessage =
          typeof raw === "string"
            ? extractMessageFromHtml(raw)
            : raw?.message || raw?.error || "";
        toast.error(
          serverMessage || err?.message || "Failed to create playlist",
          {
            position: "bottom-right",
          },
        );
      }
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !creating) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-light-background text-black ring-1 ring-black/10 dark:bg-dark-background dark:text-white dark:ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 dark:border-white/10">
          <div className="text-sm font-semibold">Create playlist</div>
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="grid h-9 w-9 place-items-center rounded-xl bg-black/5 ring-1 ring-black/10 hover:bg-black/10 disabled:opacity-50 dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <label className="text-xs font-semibold text-black/60 dark:text-white/60">
            Playlist name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My favorite songs"
            className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-black/2 px-3 text-sm text-black outline-none focus:border-black/20 focus:bg-black/3 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white/20"
          />

          <label className="mt-4 block text-xs font-semibold text-black/60 dark:text-white/60">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description..."
            className="mt-2 min-h-[90px] w-full resize-none rounded-xl border border-black/10 bg-black/2 px-3 py-2 text-sm text-black outline-none focus:border-black/20 focus:bg-black/3 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white/20"
          />
          <div className="mt-2 text-xs text-black/50 dark:text-white/50">
            Note: Your backend currently requires description.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-black/10 px-5 py-4 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="rounded-full bg-black/5 px-4 py-2 text-xs font-semibold text-black/80 ring-1 ring-black/10 hover:bg-black/10 disabled:opacity-50 dark:bg-white/5 dark:text-white/80 dark:ring-white/10 dark:hover:bg-white/10"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCreate}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-black/85 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/85"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
