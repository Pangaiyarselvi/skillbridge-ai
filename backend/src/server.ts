import "dotenv/config";
import dns from "dns";
import app from "./app";
import { prisma } from "./config/prisma";
import { runStartupDiagnostics } from "./utils/mailer";

// Ensure IPv4 is preferred across all Node networking
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 SkillBridge AI API running on port ${PORT}`);
  // Asynchronously run startup diagnostics without blocking server boot
  runStartupDiagnostics().catch((err) => {
    console.error("[Startup Diagnostics] Error running diagnostics:", err);
  });
});

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("Database connections closed.");
      process.exit(0);
    } catch (err) {
      console.error("Error during database disconnection:", err);
      process.exit(1);
    }
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default server;

