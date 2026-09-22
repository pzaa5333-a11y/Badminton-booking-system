import { PaymentPage } from "@/components/payment/PaymentPage";

export default async function Booking({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaymentPage bookingId={id} />;
}
