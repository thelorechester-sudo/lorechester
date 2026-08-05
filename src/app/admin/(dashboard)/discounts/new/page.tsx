import { PageHeader } from "@/components/admin/ui";
import { DiscountForm, EMPTY_DISCOUNT } from "../discount-form";

export default function NewDiscountPage() {
  return (
    <>
      <PageHeader
        title="New discount code"
        description="Percentage or fixed amount, with optional dates and a redemption cap."
      />
      <DiscountForm initial={EMPTY_DISCOUNT} />
    </>
  );
}
