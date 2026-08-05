import { PageHeader } from "@/components/admin/ui";
import { EMPTY_PRODUCT, ProductForm } from "../product-form";

export default function NewProductPage() {
  return (
    <>
      <PageHeader
        title="New product"
        description="Saved as a draft until you switch the status to Active."
      />
      <ProductForm initial={EMPTY_PRODUCT} />
    </>
  );
}
