-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Visit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER NOT NULL,
    "guardianId" INTEGER NOT NULL,
    "pricingPlanId" INTEGER NOT NULL,
    "wristbandNo" TEXT NOT NULL,
    "checkInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutAt" DATETIME,
    "durationMin" INTEGER,
    "discount" REAL NOT NULL DEFAULT 0,
    "extraMinutes" INTEGER NOT NULL DEFAULT 0,
    "pausedAt" DATETIME,
    "pausedMs" INTEGER NOT NULL DEFAULT 0,
    "membershipMonths" INTEGER,
    "membershipEndAt" DATETIME,
    "amount" REAL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'BEKLIYOR',
    "paymentMethod" TEXT,
    "staffId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Visit_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Visit_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Visit_pricingPlanId_fkey" FOREIGN KEY ("pricingPlanId") REFERENCES "PricingPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Visit_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Visit" ("amount", "checkInAt", "checkOutAt", "childId", "createdAt", "discount", "durationMin", "guardianId", "id", "membershipEndAt", "membershipMonths", "paymentMethod", "paymentStatus", "pricingPlanId", "staffId", "wristbandNo") SELECT "amount", "checkInAt", "checkOutAt", "childId", "createdAt", "discount", "durationMin", "guardianId", "id", "membershipEndAt", "membershipMonths", "paymentMethod", "paymentStatus", "pricingPlanId", "staffId", "wristbandNo" FROM "Visit";
DROP TABLE "Visit";
ALTER TABLE "new_Visit" RENAME TO "Visit";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
