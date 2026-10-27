import { CmsPage, cmsMetadata } from "@/components/store/cms-page";

export const generateMetadata = () => cmsMetadata("shipping-returns");

export default function Page() {
  return <CmsPage slug="shipping-returns" />;
}
