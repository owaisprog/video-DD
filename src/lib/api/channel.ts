import { api } from "./api";

export const getUserChannel = (channelId: string) =>
  api.get(`/v1/users/user-channel-profile/${channelId}`);
