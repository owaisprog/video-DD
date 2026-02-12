import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type LoadingContextValue = {
  loading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
};

const LoadingContext = createContext<LoadingContextValue | undefined>(
  undefined,
);

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [pending, setPending] = useState(0);

  const startLoading = () => setPending((p) => p + 1);
  const stopLoading = () => setPending((p) => Math.max(0, p - 1));

  const value = useMemo(
    () => ({
      loading: pending > 0,
      startLoading,
      stopLoading,
    }),
    [pending],
  );

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error("useLoading must be used within a LoadingProvider");
  return ctx;
};
