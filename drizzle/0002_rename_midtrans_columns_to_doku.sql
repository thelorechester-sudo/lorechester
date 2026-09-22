-- Renamed by hand rather than via `drizzle-kit generate` (which would have
-- diffed this as drop-old/add-new, since the interactive rename prompt
-- needs a TTY): a rename preserves the data in existing orders, a drop does
-- not.
ALTER TABLE "orders" RENAME COLUMN "midtrans_order_id" TO "doku_invoice_number";
--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "midtrans_transaction_id" TO "doku_transaction_id";
--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "snap_token" TO "doku_payment_url";
--> statement-breakpoint
ALTER INDEX "orders_midtrans_order_id_idx" RENAME TO "orders_doku_invoice_number_idx";
