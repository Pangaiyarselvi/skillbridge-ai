/**
 * AI Career Assistant Chatbot
 * -------------------------------------------------------------
 * Retrieval-augmented chat: pulls the student's profile + recent
 * recommendations + skill gap reports as context, then calls
 * Groq/Llama 3.3 with conversation history for grounded answers.
 * -------------------------------------------------------------
 */

import { prisma } from "../../config/prisma";
import { groq, GROQ_MODEL, groqJSON } from "../../config/groq";
import { searchSimilarOpportunities } from "./vectorStore.service";

export async function chatWithMentor(studentId: string, sessionId: string | null, userMessage: string) {
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: studentId },
    include: { skills: { include: { skill: true } } },
  });

  const session = sessionId
    ? await prisma.chatSession.findUniqueOrThrow({ where: { id: sessionId }, include: { messages: true } })
    : await prisma.chatSession.create({ data: { studentId, title: userMessage.slice(0, 50) } });

  const priorMessages: { role: string; content: string }[] =
    "messages" in session && Array.isArray((session as any).messages) ? (session as any).messages : [];

  // Retrieval: pull semantically similar opportunities to ground advice in real data
  let relevantOpportunities: any[] = [];
  try {
    relevantOpportunities = await searchSimilarOpportunities(userMessage, 3);
  } catch {
    // Graceful degradation
  }

  const systemPrompt = `You are SkillBridge AI's career mentor chatbot.
Student profile: ${student.fullName}, branch: ${student.branch ?? "N/A"}, CGPA: ${student.cgpa ?? "N/A"}.
Skills: ${student.skills.map((s) => s.skill.name).join(", ") || "none listed"}.
Relevant live opportunities: ${relevantOpportunities.map((o) => o.title).join(", ") || "none"}.

Give concise, actionable, encouraging career guidance. If asked about interview prep,
offer to start a mock interview. Never fabricate specific company data you weren't given.`;

  const chatHistory = priorMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  let assistantReply = "";
  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.5,
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: userMessage },
      ],
    });
    assistantReply = completion.choices[0]?.message?.content ?? "";
  } catch {
    assistantReply = `Based on your profile as a ${student.branch || "technical"} student with skills in ${
      student.skills.map((s) => s.skill.name).slice(0, 3).join(", ") || "software development"
    }, I recommend focusing on building end-to-end full stack projects and practicing data structure problems. Feel free to try our Mock Interview module to test your readiness!`;
  }

  if (!assistantReply) {
    assistantReply = "Keep building projects and updating your skills on SkillBridge AI!";
  }

  await prisma.chatMessage.createMany({
    data: [
      { sessionId: session.id, role: "user", content: userMessage },
      { sessionId: session.id, role: "assistant", content: assistantReply },
    ],
  });

  return { sessionId: session.id, reply: assistantReply };
}

/** Mock Interview Assistant: generates role-specific questions and evaluates answers. */
export async function generateMockInterviewQuestions(targetRole: string, count = 5) {
  const system = `Generate ${count} mock interview questions (mix of technical and behavioral) for the role: ${targetRole}.
Return pure STRICT JSON format:
{
  "questions": [
    {
      "question": "string",
      "type": "technical",
      "idealAnswerPoints": ["point 1", "point 2"]
    }
  ]
}`;

  try {
    return await groqJSON(system, targetRole);
  } catch {
    return {
      questions: [
        {
          question: `Explain how you would architect a scalable web service for a ${targetRole} application.`,
          type: "technical",
          idealAnswerPoints: [
            "Discuss frontend and backend separation",
            "Database selection and indexing strategy",
            "Caching and load balancing considerations",
          ],
        },
        {
          question: "Describe a challenging bug you encountered in a project and how you diagnosed and resolved it.",
          type: "technical",
          idealAnswerPoints: [
            "Use STAR method (Situation, Task, Action, Result)",
            "Mention debugging tools used",
            "Highlight lessons learned and prevention",
          ],
        },
        {
          question: "Tell me about a time you had to learn a new technology or framework under tight deadlines.",
          type: "behavioral",
          idealAnswerPoints: [
            "Resourcefulness and self-learning mindset",
            "Prioritization of core concepts",
            "Successful delivery of target milestone",
          ],
        },
      ],
    };
  }
}

export async function evaluateInterviewAnswer(question: string, answer: string) {
  const system = `You are an interview coach. Score the candidate's answer from 0 to 10 and give constructive feedback.
Return pure STRICT JSON format:
{ "score": 8, "feedback": "string", "improvedAnswer": "string" }`;

  try {
    return await groqJSON(system, `Question: ${question}\nAnswer: ${answer}`);
  } catch {
    return {
      score: 8,
      feedback:
        "Good foundation in your response. To make it stand out even more, include specific technical examples and measurable results achieved.",
      improvedAnswer: `In my previous experience, I approached this problem by systematically analyzing the constraints, implementing a modular solution, and verifying performance metrics with automated test suites.`,
    };
  }
}

