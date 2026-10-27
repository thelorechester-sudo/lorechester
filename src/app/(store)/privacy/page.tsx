import { CmsPage, cmsMetadata } from "@/components/store/cms-page";

export const generateMetadata = () => cmsMetadata("privacy");

export default function Page() {
  return <CmsPage slug="privacy" />;
}
