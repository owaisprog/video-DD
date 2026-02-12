// src/lib/api/subscription.ts
import { api } from "./api";

export const toggleSubscription = (channelId: string) =>
  api.patch(`/v1/subscription/subscribe-toggle/${channelId}`);

export const getSubscribedChannels = (subscriberId: string) =>
  api.get(`/v1/subscription/all-subscribed-channel/${subscriberId}`);

export const getUserChannelSubscribers = (channelId: string) =>
  api.get(`/v1/subscription/user-subcribed-channel/${channelId}`);
