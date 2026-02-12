import axios from "axios";
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // with cookies
});

const extractMessageFromHtml = (html: string) => {
  const match = html.match(/Error:\s*([^<\n\r]+?)(?:<br|<\/pre|$)/i);
  if (match?.[1]) return match[1].trim();

  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const match2 = text.match(/Error:\s*(.+?)(?:\s+at\s+|$)/i);
  if (match2?.[1]) return match2[1].trim();

  return "";
};
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const data = error?.response?.data;

    // backend sends HTML -> convert to a normal Error message
    if (typeof data === "string") {
      const msg = extractMessageFromHtml(data) || "Something went wrong.";
      return Promise.reject(new Error(msg));
    }

    // fallback
    return Promise.reject(new Error(error?.message || "Something went wrong."));
  },
);
