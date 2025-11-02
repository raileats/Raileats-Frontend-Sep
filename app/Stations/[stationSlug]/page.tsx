import { extractStationCode } from "@/app/lib/stationSlug";
import StationPageByCode from "../[code]/page"; // reuse your existing page

type Props = { params: { stationSlug: string } };

export default function StationSlugPage({ params }: Props) {
  const code = extractStationCode(params.stationSlug); // e.g. "BPL"
  // Reuse the existing implementation that expects `params.code`
  return <StationPageByCode params={{ code }} />;
}
