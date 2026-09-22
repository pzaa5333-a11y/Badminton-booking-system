-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "line_user_id" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customer_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "start_hour" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "court" TEXT NOT NULL,
    "court_count" INTEGER NOT NULL DEFAULT 1,
    "court_numbers" JSONB NOT NULL DEFAULT [],
    "status" TEXT NOT NULL DEFAULT 'held',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "gap_policy_flag" BOOLEAN NOT NULL DEFAULT false,
    "hold_expires_at" DATETIME,
    "amount_due" INTEGER NOT NULL,
    "slip_image_url" TEXT,
    "slip_verification_result" TEXT,
    "updated_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_line_user_id_key" ON "customers"("line_user_id");

-- CreateIndex
CREATE INDEX "bookings_date_court_idx" ON "bookings"("date", "court");

-- CreateIndex
CREATE INDEX "bookings_customer_id_idx" ON "bookings"("customer_id");
