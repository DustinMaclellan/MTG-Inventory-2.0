import { redirect } from "next/navigation";

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/collection?lot=${id}`);
}
