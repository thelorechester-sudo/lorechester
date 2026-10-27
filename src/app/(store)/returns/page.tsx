import { CmsPage, cmsMetadata } from "@/components/store/cms-page";

export const generateMetadata = () => cmsMetadata("returns");

export default function Page() {
  return <CmsPage slug="returns" />;
}
