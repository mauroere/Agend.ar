import { AppointmentModal } from "@/components/calendar/AppointmentModal";
import { WeeklyCalendar } from "@/components/calendar/WeeklyCalendar";
import { Shell } from "@/components/layout/Shell";
import { mockAppointments } from "@/lib/mock";

export default function CalendarPage() {
  return (
    <Shell>
      <WeeklyCalendar appointments={mockAppointments} />
      <div className="fixed bottom-8 right-8">
        <AppointmentModal onSubmit={async () => Promise.resolve()} />
      </div>
    </Shell>
  );
}
