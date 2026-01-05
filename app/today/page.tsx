import { Shell } from "@/components/layout/Shell";
import { TodayInbox } from "@/components/today/TodayInbox";
import { mockToday } from "@/lib/mock";

export default function TodayPage() {
  return (
    <Shell>
      <TodayInbox items={mockToday} />
    </Shell>
  );
}
