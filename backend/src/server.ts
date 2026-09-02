import "dotenv/config";
import app from "./app";
import { prisma } from "./config/prisma";

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 SkillBridge AI API running on port ${PORT}`);
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

