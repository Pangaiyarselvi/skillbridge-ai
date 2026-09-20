import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middlewares/errorHandler";
import { notFound } from "./middlewares/notFound";

import authRoutes from "./modules/auth/auth.routes";
import studentRoutes from "./modules/student/student.routes";
import companyRoutes from "./modules/company/company.routes";
import collegeRoutes from "./modules/college/college.routes";
import adminRoutes from "./modules/admin/admin.routes";
import aiRoutes from "./modules/ai/ai.routes";
import communicationRoutes from "./modules/communication/communication.routes";
import offerRoutes from "./modules/communication/offer.routes";

const app = express();

// Enable trust proxy for reverse proxies on Render / Heroku / AWS
app.set("trust proxy", 1);

app.use(helmet());

// Allowed origins configuration
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, origin || true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  })
);


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Rate limiter with express-rate-limit v7 compatibility
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});
app.use("/api", apiLimiter);

// Root and Health Check Endpoints
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "SkillBridge AI API",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "SkillBridge AI API",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/debug/email", (_req, res) => {
  const user = process.env.SMTP_USER?.trim()?.replace(/^["']|["']$/g, "");
  const pass = process.env.SMTP_PASS?.trim()?.replace(/^["']|["']$/g, "");
  const from = process.env.SMTP_FROM?.trim()?.replace(/^["']|["']$/g, "");

  res.json({
    smtpUserConfigured: Boolean(user),
    smtpPassConfigured: Boolean(pass),
    smtpFromConfigured: Boolean(from),
  });
});

// Feature Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/communications", communicationRoutes);
app.use("/api/offers", offerRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

