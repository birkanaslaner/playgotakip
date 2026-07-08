-- AlterTable
ALTER TABLE "TableTab" ADD COLUMN "paidAmount" REAL NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TabItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tabId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL,
    "vatRate" INTEGER NOT NULL DEFAULT 10,
    "lineTotal" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TabItem_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "TableTab" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TabItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TabItem_tabId_productId_key" ON "TabItem"("tabId", "productId");
