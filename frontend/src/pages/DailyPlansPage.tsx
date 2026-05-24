import { useSearchParams } from "react-router-dom";
import { DailyPlansList } from "@/components/DailyPlansList";

export default function DailyPlansPage() {
  const [searchParams] = useSearchParams();
  const focusDate = searchParams.get("focus");
  return <DailyPlansList focusDate={focusDate} />;
}
