-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "original_court_numbers" JSONB;
ALTER TABLE "bookings" ADD COLUMN "original_date" TEXT;
ALTER TABLE "bookings" ADD COLUMN "original_duration_minutes" INTEGER;
ALTER TABLE "bookings" ADD COLUMN "original_start_hour" INTEGER;
ALTER TABLE "bookings" ADD COLUMN "payment_check_status" TEXT;

