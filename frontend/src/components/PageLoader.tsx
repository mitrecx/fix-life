/** Lightweight full-viewport loader for React.Suspense (route lazy chunks). */
export default function PageLoader() {
  return (
    <div
      className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-gray-500"
      role="status"
      aria-live="polite"
      aria-label="加载中"
    >
      <div className="h-8 w-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
      <span className="text-sm">加载中…</span>
    </div>
  );
}
