import LoadingSpinner from "@/components/LoadingSpinner";

/** Lightweight full-viewport loader for React.Suspense (route lazy chunks). */
export default function PageLoader() {
  return (
    <LoadingSpinner size="large" label="加载中…" block className="min-h-[50vh] text-gray-500" />
  );
}
