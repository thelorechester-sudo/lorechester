import { CmsPage, cmsMetadata } from "@/components/store/cms-page";

export const generateMetadata = () => cmsMetadata("size-guide");

export default function Page() {
  return <CmsPage slug="size-guide" />;
}
