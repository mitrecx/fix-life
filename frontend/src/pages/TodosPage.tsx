import { TodosList } from "@/components/TodosList";

export default function TodosPage() {
  return (
    <div className="relative -mx-3 -my-3 sm:-mx-4 sm:-my-4 min-h-[calc(100dvh-2rem)]">
      <TodosList />
    </div>
  );
}
