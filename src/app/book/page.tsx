import BookingPage from "./[tenantId]/page";

export default async function RootBookingPage() {
  return <BookingPage params={{ tenantId: undefined }} />;
}
