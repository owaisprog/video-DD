import { useEffect, useRef } from "react";
import LoadingBar, { type LoadingBarRef } from "react-top-loading-bar";
import { useNavigation } from "react-router-dom";
import { useLoading } from "../../../context/loading-context";

export default function TopRouteLoader() {
  const ref = useRef<LoadingBarRef>(null);
  const navigation = useNavigation();
  const { loading } = useLoading();

  const busy =
    loading ||
    navigation.state === "loading" ||
    navigation.state === "submitting";

  useEffect(() => {
    if (busy) ref.current?.continuousStart();
    else ref.current?.complete();
  }, [busy]);

  return <LoadingBar ref={ref} height={3} shadow={false} />;
}
