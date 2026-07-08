import express from "express";
import cors from "cors";
import { env } from "./env";
import { authRouter } from "./routes/auth";
import { guardiansRouter } from "./routes/guardians";
import { childrenRouter } from "./routes/children";
import { pricingPlansRouter } from "./routes/pricingPlans";
import { visitsRouter } from "./routes/visits";
import { reportsRouter } from "./routes/reports";
import { categoriesRouter } from "./routes/categories";
import { productsRouter } from "./routes/products";
import { settingsRouter } from "./routes/settings";
import { playAreasRouter } from "./routes/playAreas";
import { tablesRouter } from "./routes/tables";
import { errorHandler, notFound } from "./middleware/error";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "playgotakip-backend", time: new Date().toISOString() });
});

app.use("/auth", authRouter);
app.use("/guardians", guardiansRouter);
app.use("/children", childrenRouter);
app.use("/pricing-plans", pricingPlansRouter);
app.use("/categories", categoriesRouter);
app.use("/products", productsRouter);
app.use("/settings", settingsRouter);
app.use("/play-areas", playAreasRouter);
app.use("/tables", tablesRouter);
app.use("/visits", visitsRouter);
app.use("/reports", reportsRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`API calisiyor: http://localhost:${env.port}`);
});
