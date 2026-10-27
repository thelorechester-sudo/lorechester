import { CmsPage, cmsMetadata } from "@/components/store/cms-page";

export const generateMetadata = () => cmsMetadata("about");

export default function Page() {
  return <CmsPage slug="about" />;
}
