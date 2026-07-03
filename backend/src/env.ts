import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "degistir-bu-gizli-anahtari",
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
};
