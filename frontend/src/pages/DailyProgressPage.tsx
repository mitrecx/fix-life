import { useSearchParams } from "react-router-dom";
import { DailyProgressList } from "@/components/DailyProgressList";

export default function DailyProgressPage() {
  const [searchParams] = useSearchParams();
  const focusDate = searchParams.get("focus");
  return <DailyProgressList focusDate={focusDate} />;
}
