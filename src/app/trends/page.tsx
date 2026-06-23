import { TrendsView } from "@/components/TrendsView";
import { getOwnerId } from "@/lib/owner";
import { getOwnerRecoverySeries } from "@/lib/whoop/sync";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  let recovery: Array<{ date: string; score: number }> = [];
  try {
    recovery = await getOwnerRecoverySeries(getOwnerId());
  } catch {
    recovery = [];
  }
  return <TrendsView recovery={recovery} />;
}
