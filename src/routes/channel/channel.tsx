import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AccountHeader } from "../../components/common/account/AccountHeader";
import { AccountTabs } from "../../components/common/account/AccountTabs";
import { useParams } from "react-router-dom";

import { getAllVideos } from "../../lib/api/video"; // ✅ use get-all-videos
import { getUserChannel } from "../../lib/api/channel";

import type {
  VideoDataType,
  GetAllUserVideosResponse,
} from "../../components/common/account/types";
import { useLoading } from "../../context/loading-context";
import { getUser } from "../../context/auth-context";
import { CreateSection } from "../../components/common/account/CreateSection";
import { PlaylistsSection } from "../../components/common/account/PlaylistsSection";
import { PostsSection } from "../../components/common/account/PostsSection";

const tabs = ["Create", "Posts", "Playlists"];
const LOADING_DELAY_MS = 150;

export const Channel = () => {
  const [activeTab, setActiveTab] = useState<string>("Create");
  const [userData, setUserData] = useState<any>({});

  const { startLoading, stopLoading } = useLoading();
  const { state } = getUser();
  const { channelId } = useParams();

  const authedUserId =
    state.status === "authed" ? (state.user as any)?._id : undefined;
  const isOwner =
    !!channelId && !!authedUserId && String(channelId) === String(authedUserId);

  // ✅ viewing someone else => readOnly (no create/edit/delete)
  const readOnly = !!channelId && !isOwner;

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

  // ✅ request guard for channel profile fetch
  const channelProfileRequestIdRef = useRef(0);

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
            readOnly={readOnly} // ✅ NEW
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
    readOnly,
  ]);

  // ✅ keep existing behavior: show my own user instantly if I'm owner
  useEffect(() => {
    if (state.status !== "authed") return;
    if (isOwner) setUserData(state.user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, isOwner]);

  // ✅ fetch channel profile by channelId
  useEffect(() => {
    if (!channelId) return;

    const myRequestId = ++channelProfileRequestIdRef.current;

    const fetchChannelProfile = async () => {
      beginGlobalLoading();
      try {
        const res = await getUserChannel(channelId);

        const payload: any = res.data;
        const profile = payload?.data?.username
          ? payload.data
          : payload?.data?.data?.username
            ? payload.data.data
            : (payload?.data ?? payload);

        if (channelProfileRequestIdRef.current === myRequestId) {
          setUserData(profile);
        }
      } catch {
        // keep previous userData (don’t break UI)
      } finally {
        endGlobalLoading();
      }
    };

    fetchChannelProfile();

    return () => {
      channelProfileRequestIdRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // ✅ when channel changes, reset videos to avoid flashing previous channel content
  useEffect(() => {
    setVideosData([]);
    setPage(1);
    // keep query/sort as-is to avoid “disturbing” UX
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // ✅ Fetch videos for THIS channel
  useEffect(() => {
    if (activeTab !== "Create") return;

    const myRequestId = ++requestIdRef.current;
    let loadingTimer: ReturnType<typeof setTimeout> | null = null;

    const hasDataAlready = videosData.length > 0;

    const fetchVideos = async () => {
      beginGlobalLoading();
      setVideosError(null);

      if (!hasDataAlready) {
        setVideosLoading(true);
      } else {
        loadingTimer = setTimeout(() => {
          // intentionally no skeleton flip
        }, LOADING_DELAY_MS);
      }

      try {
        // ✅ channel videos filter:
        // If channelId exists -> fetch that channel videos
        // Else fallback to authed user's videos (if any)
        const userIdToFetch = channelId ?? authedUserId;

        const res = await getAllVideos({
          page,
          limit,
          query,
          sortBy, // order
          sortType: "createdAt", // ✅ required by your backend sort object
          userId: userIdToFetch,
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
          if (!hasDataAlready) setVideosLoading(false);
        }

        endGlobalLoading();
      }
    };

    fetchVideos();

    return () => {
      requestIdRef.current += 1;
      if (loadingTimer) clearTimeout(loadingTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    page,
    limit,
    query,
    sortBy,
    refreshTick,
    videosData.length,
    channelId,
    authedUserId,
  ]);

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
