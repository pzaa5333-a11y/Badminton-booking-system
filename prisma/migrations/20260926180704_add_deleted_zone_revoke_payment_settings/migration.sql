-- CreateTable
CREATE TABLE "payment_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "qr_image_url" TEXT,
    "updated_by" TEXT,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_bookings" (
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
    "cancelled_at" DATETIME,
    "needs_attention" BOOLEAN NOT NULL DEFAULT false,
    "hold_expires_at" DATETIME,
    "amount_due" INTEGER NOT NULL,
    "slip_image_url" TEXT,
    "slip_verification_result" TEXT,
    "payment_method" TEXT,
    "member_package_id" TEXT,
    "updated_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_member_package_id_fkey" FOREIGN KEY ("member_package_id") REFERENCES "member_packages" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_bookings" ("amount_due", "court", "court_count", "court_numbers", "created_at", "customer_id", "date", "duration_minutes", "gap_policy_flag", "hold_expires_at", "id", "locked", "member_package_id", "payment_method", "slip_image_url", "slip_verification_result", "start_hour", "status", "updated_at", "updated_by") SELECT "amount_due", "court", "court_count", "court_numbers", "created_at", "customer_id", "date", "duration_minutes", "gap_policy_flag", "hold_expires_at", "id", "locked", "member_package_id", "payment_method", "slip_image_url", "slip_verification_result", "start_hour", "status", "updated_at", "updated_by" FROM "bookings";
DROP TABLE "bookings";
ALTER TABLE "new_bookings" RENAME TO "bookings";
CREATE INDEX "bookings_date_court_idx" ON "bookings"("date", "court");
CREATE INDEX "bookings_customer_id_idx" ON "bookings"("customer_id");
CREATE TABLE "new_member_packages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customer_id" TEXT NOT NULL,
    "package_type_id" TEXT NOT NULL,
    "purchased_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL,
    "hours_remaining" INTEGER NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" DATETIME,
    "updated_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "member_packages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "member_packages_package_type_id_fkey" FOREIGN KEY ("package_type_id") REFERENCES "package_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_member_packages" ("created_at", "customer_id", "expires_at", "hours_remaining", "id", "package_type_id", "purchased_at", "updated_by") SELECT "created_at", "customer_id", "expires_at", "hours_remaining", "id", "package_type_id", "purchased_at", "updated_by" FROM "member_packages";
DROP TABLE "member_packages";
ALTER TABLE "new_member_packages" RENAME TO "member_packages";
CREATE INDEX "member_packages_customer_id_idx" ON "member_packages"("customer_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

