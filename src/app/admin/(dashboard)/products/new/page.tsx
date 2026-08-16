import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { EMPTY_PRODUCT, ProductForm } from "../product-form";

export default async function NewProductPage() {
  await requireAdmin();

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
