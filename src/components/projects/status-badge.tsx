import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/types";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  quoted: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  active: "bg-green-100 text-green-700 hover:bg-green-100",
  completed: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  cancelled: "bg-red-100 text-red-700 hover:bg-red-100",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={statusColors[status] ?? ""}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
