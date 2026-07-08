-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PricingPlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SAATLIK',
    "price" REAL NOT NULL,
    "unitMinutes" INTEGER NOT NULL DEFAULT 60,
    "playArea" TEXT,
    "label" TEXT,
    "weekdayPrice" REAL,
    "weekendPrice" REAL,
    "carryOver" BOOLEAN NOT NULL DEFAULT false,
    "loyalty" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_PricingPlan" ("active", "createdAt", "id", "name", "price", "type", "unitMinutes") SELECT "active", "createdAt", "id", "name", "price", "type", "unitMinutes" FROM "PricingPlan";
DROP TABLE "PricingPlan";
ALTER TABLE "new_PricingPlan" RENAME TO "PricingPlan";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
