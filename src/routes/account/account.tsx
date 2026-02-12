import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AccountHeader } from "../../components/common/account/AccountHeader";
import { AccountTabs } from "../../components/common/account/AccountTabs";

import { getAllUserVideos } from "../../lib/api/video";
import type {
  VideoDataType,
  GetAllUserVideosResponse,
} from "../../components/common/account/types";
import { useLoading } from "../../context/loading-context";
import { getUser } from "../../context/auth-context";
import { PlaylistsSection } from "../../components/common/account/PlaylistsSection";
import { PostsSection } from "../../components/common/account/PostsSection";
import { CreateSection } from "../../components/common/account/CreateSection";

const tabs = ["Create", "Posts", "Playlists"];
const LOADING_DELAY_MS = 150;

export const Account = () => {
  const [activeTab, setActiveTab] = useState<string>("Create");
  const [userData, setUserData] = useState({});
  const { startLoading, stopLoading } = useLoading();
  const { state } = getUser();

  const [videosData, setVideosData] = useState<VideoDataType[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"asc" | "desc">("asc");

  // ✅ refresh trigger (used after create/update/delete)
  const [refreshTick, setRefreshTick] = useState(0);
  const refreshVideos = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  const startLoadingRef = useRef(startLoading);
  const stopLoadingRef = useRef(stopLoading);
  useEffect(() => {
    startLoadingRef.current = startLoading;
    stopLoadingRef.current = stopLoading;
  }, [startLoading, stopLoading]);

  const globalLoadingCountRef = useRef(0);
  const beginGlobalLoading = () => {
    if (globalLoadingCountRef.current === 0) startLoadingRef.current();
    globalLoadingCountRef.current += 1;
  };
  const endGlobalLoading = () => {
    globalLoadingCountRef.current = Math.max(
      0,
      globalLoadingCountRef.current - 1,
    );
    if (globalLoadingCountRef.current === 0) stopLoadingRef.current();
  };

  const requestIdRef = useRef(0);

  const section = useMemo(() => {
    switch (activeTab) {
      case "Create":
        return (
          <CreateSection
            videosData={videosData}
            loading={videosLoading}
            error={videosError}
            page={page}
            setPage={setPage}
            limit={limit}
            setLimit={setLimit}
            query={query}
            setQuery={setQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onDeletedRefresh={refreshVideos}
          />
        );
      case "Playlists":
        return <PlaylistsSection />;
      case "Posts":
        return <PostsSection />;
      default:
        return null;
    }
  }, [
    activeTab,
    videosData,
    videosLoading,
    videosError,
    page,
    limit,
    query,
    sortBy,
    refreshVideos,
  ]);

  useEffect(() => {
    if (state.status === "authed") {
      setUserData(state.user);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab !== "Create") return;

    const myRequestId = ++requestIdRef.current;
    let loadingTimer: ReturnType<typeof setTimeout> | null = null;

    // ✅ KEY FIX:
    // If we already have data, DON’T flip to skeleton (prevents jerk).
    // If we have no data yet, show skeleton immediately.
    const hasDataAlready = videosData.length > 0;

    const fetchMyAllVideos = async () => {
      beginGlobalLoading();
      setVideosError(null);

      if (!hasDataAlready) {
        // first load => show skeleton immediately
        setVideosLoading(true);
      } else {
        // refetch with existing rows => optional delayed loading (but we will NOT use it for skeleton)
        // keep for compatibility; still no skeleton flip
        loadingTimer = setTimeout(() => {
          // We intentionally do nothing here to avoid the jerk
          // If you want: you could set a "softLoading" state to show a small spinner instead.
        }, LOADING_DELAY_MS);
      }

      try {
        const res = await getAllUserVideos({
          page,
          limit,
          query,
          sortBy,
        });

        const docs = (res.data as GetAllUserVideosResponse)?.data?.docs ?? [];

        if (requestIdRef.current === myRequestId) {
          setVideosData(docs);
        }
      } catch (e: any) {
        if (requestIdRef.current === myRequestId) {
          setVideosError(e?.message ?? "Failed to fetch videos");
        }
      } finally {
        if (loadingTimer) clearTimeout(loadingTimer);

        if (requestIdRef.current === myRequestId) {
          // ✅ stop skeleton only if we were showing it
          if (!hasDataAlready) setVideosLoading(false);
        }

        endGlobalLoading();
      }
    };

    fetchMyAllVideos();

    return () => {
      requestIdRef.current += 1;
      if (loadingTimer) clearTimeout(loadingTimer);
    };
    // ✅ IMPORTANT: include videosData.length so the "hasDataAlready" is accurate for first fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page, limit, query, sortBy, refreshTick, videosData.length]);

  return (
    <div>
      <section className="min-w-full text-white">
        <div className="w-full px-6 py-10 md:px-10 md:py-12">
          <AccountHeader data={userData} />

          <AccountTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {section}
        </div>
      </section>
    </div>
  );
};
