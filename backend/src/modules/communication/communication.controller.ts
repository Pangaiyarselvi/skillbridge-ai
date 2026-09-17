import { Response, NextFunction } from "express";
import { AuthedRequest } from "../../middlewares/auth";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { groqJSON } from "../../config/groq";
import { sendEmail } from "../../utils/mailer";

// ------------------------------------------------------------------
// Communication Inbox & Management
// ------------------------------------------------------------------

export async function listInbox(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { category, isArchived, unreadOnly, search } = req.query as Record<string, string>;

    const archivedFilter = isArchived === "true";
    const whereClause: any = {
      recipientId: userId,
      isArchived: archivedFilter,
    };

    if (category && category !== "ALL") {
      if (category === "PLACEMENT_ANNOUNCEMENT" || category === "ANNOUNCEMENTS") {
        whereClause.category = {
          in: ["PLACEMENT_ANNOUNCEMENT", "PLACEMENT_DRIVE", "WORKSHOP", "INTERNSHIP", "TRAINING"],
        };
      } else {
        whereClause.category = category;
      }
    }

    if (unreadOnly === "true") {
      whereClause.isRead = false;
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { subject: { contains: q, mode: "insensitive" } },
        { body: { contains: q, mode: "insensitive" } },
      ];
    }

    const [messages, totalUnread, unreadByCategory] = await Promise.all([
      prisma.communication.findMany({
        where: whereClause,
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              role: true,
              company: { select: { id: true, name: true, logoUrl: true, verificationStatus: true } },
              college: { select: { id: true, name: true, logoUrl: true, verificationStatus: true } },
              admin: { select: { id: true, fullName: true } },
            },
          },
          offerLetter: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.communication.count({
        where: { recipientId: userId, isRead: false, isArchived: false },
      }),
      prisma.communication.groupBy({
        by: ["category"],
        where: { recipientId: userId, isRead: false, isArchived: false },
        _count: true,
      }),
    ]);

    const unreadMap = unreadByCategory.reduce((acc: Record<string, number>, item) => {
      acc[item.category] = item._count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        messages,
        totalUnread,
        unreadByCategory: unreadMap,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getCommunication(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const comm = await prisma.communication.findUniqueOrThrow({
      where: { id },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            role: true,
            company: true,
            college: true,
            admin: true,
          },
        },
        recipient: {
          select: {
            id: true,
            email: true,
            role: true,
            student: true,
          },
        },
        offerLetter: {
          include: {
            opportunity: true,
            company: true,
          },
        },
      },
    });

    if (comm.recipientId !== userId && comm.senderId !== userId && req.user!.role !== "ADMIN") {
      throw new AppError("You are not authorized to view this communication", 403);
    }

    // Auto mark as read if recipient
    if (comm.recipientId === userId && !comm.isRead) {
      await prisma.communication.update({
        where: { id },
        data: { isRead: true },
      });
      comm.isRead = true;
    }

    res.json({ success: true, data: comm });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { isRead = true } = req.body;

    await prisma.communication.updateMany({
      where: { id, recipientId: userId },
      data: { isRead: Boolean(isRead) },
    });

    res.json({ success: true, message: `Marked message as ${isRead ? "read" : "unread"}` });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    await prisma.communication.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true, message: "All communications marked as read" });
  } catch (err) {
    next(err);
  }
}

export async function toggleArchive(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const comm = await prisma.communication.findFirst({
      where: { id, recipientId: userId },
    });

    if (!comm) throw new AppError("Message not found", 404);

    const updated = await prisma.communication.update({
      where: { id },
      data: { isArchived: !comm.isArchived },
    });

    res.json({
      success: true,
      data: updated,
      message: updated.isArchived ? "Message archived" : "Message restored to inbox",
    });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// Outbound Dispatch & Broadcasts (Company & College)
// ------------------------------------------------------------------

export async function sendMessage(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const senderId = req.user!.userId;
    const {
      recipientUserIds,
      recipientUserId,
      category = "GENERAL",
      priority = "NORMAL",
      subject,
      body,
      attachments = [],
      metadata = {},
      offerLetterId,
    } = req.body;

    if (!subject || !body) {
      throw new AppError("Subject and body are required", 400);
    }

    const recipients: string[] = Array.isArray(recipientUserIds) && recipientUserIds.length > 0
      ? recipientUserIds
      : recipientUserId
      ? [recipientUserId]
      : [];

    if (recipients.length === 0) {
      throw new AppError("At least one recipient is required", 400);
    }

    // Sender branding
    const senderUser = await prisma.user.findUnique({
      where: { id: senderId },
      include: { company: true, college: true, admin: true },
    });

    const senderName =
      senderUser?.company?.name ||
      senderUser?.college?.name ||
      senderUser?.admin?.fullName ||
      "SkillBridge Partner";

    // Create communications in bulk
    const createdMessages = await Promise.all(
      recipients.map(async (recId) => {
        const comm = await prisma.communication.create({
          data: {
            senderId,
            recipientId: recId,
            category: category as any,
            priority: priority as any,
            subject,
            body,
            attachments: attachments || [],
            metadata: metadata || {},
            offerLetterId: offerLetterId || null,
          },
        });

        // Trigger corresponding notification
        await prisma.notification.create({
          data: {
            userId: recId,
            type: category === "OFFER_LETTER" ? "APPLICATION_UPDATE" : "MESSAGE",
            title: `${category.replace(/_/g, " ")}: ${subject}`,
            body: `${senderName}: ${body.slice(0, 120)}...`,
            link: category === "OFFER_LETTER" ? "/student/offers" : `/student/inbox?id=${comm.id}`,
          },
        });

        // Also send real email if recipient has a registered email
        const recipientUser = await prisma.user.findUnique({
          where: { id: recId },
          select: { email: true },
        });

        if (recipientUser?.email) {
          const appUrl = (process.env.APP_URL || "https://skillbridge-ai.vercel.app").replace(/\/+$/, "");
          const linkUrl = category === "OFFER_LETTER" ? `${appUrl}/student/offers` : `${appUrl}/student/inbox?id=${comm.id}`;
          sendEmail({
            to: recipientUser.email,
            subject: `[SkillBridge AI] ${subject}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px;">
                  <h2 style="color: #0f172a; margin: 0; font-size: 20px;">SkillBridge <span style="color: #4f46e5;">AI</span></h2>
                  <p style="color: #64748b; margin: 4px 0 0 0; font-size: 12px;">New Notification from <strong>${senderName}</strong></p>
                </div>
                <h3 style="color: #0f172a; font-size: 16px; margin: 0 0 12px 0;">${subject}</h3>
                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #edf2f7; color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap; margin-bottom: 24px;">${body}</div>
                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="${linkUrl}" style="background: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">Open in SkillBridge AI &rarr;</a>
                </div>
                <p style="font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; margin: 0;">Verified message sent via SkillBridge AI Platform</p>
              </div>
            `,
          }).catch((err) => console.error(`[Mailer] Error sending message email to ${recipientUser.email}:`, err));
        }

        return comm;
      })
    );

    res.status(201).json({
      success: true,
      message: `Successfully dispatched to ${recipients.length} student(s)`,
      data: { count: createdMessages.length },
    });
  } catch (err) {
    next(err);
  }
}

export async function listSent(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const senderId = req.user!.userId;
    const sent = await prisma.communication.findMany({
      where: { senderId },
      include: {
        recipient: {
          select: {
            id: true,
            email: true,
            student: { select: { id: true, fullName: true, department: true, branch: true, cgpa: true } },
          },
        },
        offerLetter: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: sent });
  } catch (err) {
    next(err);
  }
}

// College Broadcast with Department & Year Targeting
export async function collegeBroadcast(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const college = await prisma.college.findUniqueOrThrow({ where: { userId } });

    const {
      departments, // string[] (e.g. ["Computer Science", "Information Technology"])
      graduationYears, // number[] (e.g. [2025, 2026])
      category = "PLACEMENT_DRIVE",
      priority = "HIGH",
      subject,
      body,
      attachments = [],
      metadata = {},
    } = req.body;

    if (!subject || !body) {
      throw new AppError("Subject and announcement body are required", 400);
    }

    const studentWhere: any = { collegeId: college.id };
    if (Array.isArray(departments) && departments.length > 0) {
      studentWhere.department = { in: departments };
    }
    if (Array.isArray(graduationYears) && graduationYears.length > 0) {
      studentWhere.graduationYear = { in: graduationYears.map(Number) };
    }

    const targetStudents = await prisma.student.findMany({
      where: studentWhere,
      select: { id: true, userId: true, fullName: true },
    });

    if (targetStudents.length === 0) {
      throw new AppError("No students match the targeted department and year criteria", 400);
    }

    const recipientUserIds = targetStudents.map((s) => s.userId);

    await Promise.all(
      recipientUserIds.map(async (recId) => {
        const comm = await prisma.communication.create({
          data: {
            senderId: userId,
            recipientId: recId,
            category: category as any,
            priority: priority as any,
            subject,
            body,
            attachments: attachments || [],
            metadata: {
              ...metadata,
              broadcastTargeting: { departments, graduationYears },
            },
          },
        });

        await prisma.notification.create({
          data: {
            userId: recId,
            type: "SYSTEM",
            title: `College Notice: ${subject}`,
            body: `${college.name} issued an announcement for your department.`,
            link: `/student/inbox?id=${comm.id}`,
          },
        });
      })
    );

    res.status(201).json({
      success: true,
      message: `Broadcast successfully published to ${recipientUserIds.length} student(s) across selected departments.`,
      data: {
        totalTargeted: recipientUserIds.length,
        college: college.name,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// Special SIH Innovation: AI Smart Communication Assistant
// ------------------------------------------------------------------

export async function aiSuggestTemplate(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { templateType, tone = "PROFESSIONAL", context = {} } = req.body;

    const studentName = context.studentName || "Candidate";
    const companyName = context.companyName || "Our Organization";
    const jobRole = context.jobRole || "Software Engineer";
    const salary = context.salary || "Competitive Compensation";
    const date = context.date || "Upcoming week";
    const meetingLink = context.meetingLink || "https://meet.google.com/xyz-skillbridge";
    const department = context.department || "Engineering";

    const systemPrompt = `You are the SkillBridge AI Smart Communication Assistant, an enterprise-grade AI specialized in drafting corporate recruitment and college placement communications.
Always output strictly valid JSON with no markdown backticks, conforming to:
{
  "subject": "Clear, professional email subject line",
  "body": "Formatted email body with paragraphs and professional layout",
  "suggestedSubjectLines": ["Alt Subject 1", "Alt Subject 2"],
  "keyActionItems": ["Item 1", "Item 2"],
  "tone": "${tone}"
}`;

    const userPrompt = `Generate a ${tone.toLowerCase()} communication for template type "${templateType}".
Context parameters:
- Student Name: ${studentName}
- Company/College Name: ${companyName}
- Job Role: ${jobRole}
- Salary / Package: ${salary}
- Proposed Date/Timeline: ${date}
- Virtual Link: ${meetingLink}
- Department: ${department}
- Additional Notes: ${context.notes || "Standard professional procedure"}

Make the copy clear, encouraging, structured with greeting, key details, next steps, and professional closing.`;

    try {
      const response = await groqJSON<{
        subject: string;
        body: string;
        suggestedSubjectLines: string[];
        keyActionItems: string[];
        tone: string;
      }>(systemPrompt, userPrompt);

      return res.json({ success: true, data: response });
    } catch {
      // Fallback deterministic high-fidelity templates if LLM is offline
      const templates: Record<string, any> = {
        INTERVIEW_INVITATION: {
          subject: `Interview Invitation: ${jobRole} Role at ${companyName}`,
          body: `Dear ${studentName},\n\nWe were impressed by your profile and academic achievements on SkillBridge AI. On behalf of ${companyName}, we are pleased to invite you for a Technical Interview for the position of ${jobRole}.\n\nInterview Details:\n• Date & Time: ${date}\n• Format: Virtual Video Round\n• Meeting Link: ${meetingLink}\n\nPlease ensure you have a stable internet connection and your development environment ready. If you require rescheduling, kindly notify us at least 24 hours prior.\n\nWe look forward to speaking with you.\n\nWarm regards,\nTalent Acquisition Team\n${companyName}`,
          suggestedSubjectLines: [
            `Invitation to Technical Round — ${jobRole} at ${companyName}`,
            `SkillBridge AI: Next Steps for ${jobRole} with ${companyName}`,
          ],
          keyActionItems: ["Confirm interview availability", "Prepare technical environment", "Review job description"],
          tone,
        },
        OFFER_LETTER: {
          subject: `Congratulations! Official Job Offer: ${jobRole} at ${companyName}`,
          body: `Dear ${studentName},\n\nFollowing your outstanding performance throughout our evaluation rounds on SkillBridge AI, we are thrilled to offer you the position of ${jobRole} at ${companyName}!\n\nOffer Highlights:\n• Position: ${jobRole}\n• Total Compensation Package: ${salary}\n• Anticipated Joining Date: ${date}\n\nPlease review your formal Offer Letter document attached in your SkillBridge Offer Center. To accept, kindly sign or confirm before the offer validity deadline.\n\nWelcome to the team!\n\nSincerely,\nCampus Recruitment Division\n${companyName}`,
          suggestedSubjectLines: [
            `Official Offer of Employment: ${jobRole} at ${companyName}`,
            `Welcome to ${companyName}! Job Offer Letter for ${studentName}`,
          ],
          keyActionItems: ["Review complete terms & compensation", "Respond before expiration deadline", "Upload verification documents"],
          tone,
        },
        INTERNSHIP_ANNOUNCEMENT: {
          subject: `Campus Internship Opportunity: ${jobRole} with ${companyName}`,
          body: `Dear Students,\n\nWe are excited to announce a new campus internship drive with ${companyName} for the ${jobRole} role.\n\nProgram Overview:\n• Role: ${jobRole}\n• Stipend: ${salary}\n• Eligible Cohort: ${department} students graduating soon\n• Timeline: Starting ${date}\n\nInterested candidates should ensure their SkillBridge AI profile, skill assessments, and project portfolios are up to date. Applications close within 5 days.\n\nBest of luck,\nPlacement & Corporate Relations Cell`,
          suggestedSubjectLines: [
            `New Internship Alert: ${jobRole} (${salary}) — Apply on SkillBridge`,
            `Campus Drive Opening: ${companyName} seeking ${department} Interns`,
          ],
          keyActionItems: ["Update resume & skills on SkillBridge", "Submit application via Opportunities tab"],
          tone,
        },
        REJECTION_EMAIL: {
          subject: `Update regarding your application for ${jobRole} at ${companyName}`,
          body: `Dear ${studentName},\n\nThank you for taking the time to interview for the ${jobRole} position at ${companyName}. We truly appreciated learning more about your background and technical skills.\n\nWhile our team was impressed with your capabilities, we have decided to move forward with another candidate whose current experience aligns more closely with our immediate requirements.\n\nWe encourage you to keep developing your strengths on SkillBridge AI. We will maintain your profile in our talent pool for upcoming opportunities.\n\nWe wish you great success in your career journey.\n\nWarm regards,\nRecruitment Team\n${companyName}`,
          suggestedSubjectLines: [
            `Application Status for ${jobRole} — ${companyName}`,
            `Thank you for interviewing with ${companyName}`,
          ],
          keyActionItems: ["Keep SkillBridge profile updated for future openings", "Review AI skill gap feedback"],
          tone,
        },
        FOLLOW_UP: {
          subject: `Follow-Up: Next Steps for your ${jobRole} Candidacy at ${companyName}`,
          body: `Dear ${studentName},\n\nWe hope this email finds you well. We are following up regarding your recent application and next steps for the ${jobRole} position at ${companyName}.\n\nKindly review your SkillBridge AI communication center to confirm your availability or complete any pending submissions before ${date}.\n\nIf you have any questions or require clarification, please feel free to reach out directly.\n\nBest regards,\nRecruitment Coordinator\n${companyName}`,
          suggestedSubjectLines: [
            `Action Required: Follow-up on ${jobRole} application`,
            `Checking in: Next steps with ${companyName}`,
          ],
          keyActionItems: ["Confirm pending details", "Review communication center"],
          tone,
        },
      };

      const selected = templates[templateType] || templates.INTERVIEW_INVITATION;
      res.json({ success: true, data: selected });
    }
  } catch (err) {
    next(err);
  }
}
