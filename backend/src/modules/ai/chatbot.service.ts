/**
 * AI Career Assistant Chatbot
 * -------------------------------------------------------------
 * Retrieval-augmented chat: pulls the student's profile + recent
 * recommendations + skill gap reports as context, then calls
 * Groq/Llama 3.3 with conversation history for grounded answers.
 *
 * For true vector search (semantic search over job descriptions /
 * industry expectations), see vectorStore.service.ts which embeds
 * Opportunity + IndustryExpectation text via a LangChain pipeline
 * and stores embeddings in pgvector (Postgres extension).
 * -------------------------------------------------------------
 */

import { prisma } from "../../config/prisma";
import { groq, GROQ_MODEL } from "../../config/groq";
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
  const relevantOpportunities = await searchSimilarOpportunities(userMessage, 3);

  const systemPrompt = `You are SkillBridge AI's career mentor chatbot.
Student profile: ${student.fullName}, branch: ${student.branch ?? "N/A"}, CGPA: ${student.cgpa ?? "N/A"}.
Skills: ${student.skills.map((s) => s.skill.name).join(", ") || "none listed"}.
Relevant live opportunities: ${relevantOpportunities.map((o) => o.title).join(", ") || "none"}.

Give concise, actionable, encouraging career guidance. If asked about interview prep,
offer to start a mock interview. Never fabricate specific company data you weren't given.`;

  const chatHistory = priorMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.5,
    messages: [
      { role: "system", content: systemPrompt },
      ...chatHistory,
      { role: "user", content: userMessage },
    ],
  });

  const assistantReply = completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";

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
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.6,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Generate ${count} mock interview questions (mix of technical + behavioral) for the role: ${targetRole}.
Return STRICT JSON: { "questions": [{ "question": string, "type": "technical"|"behavioral", "idealAnswerPoints": string[] }] }`,
      },
      { role: "user", content: targetRole },
    ],
  });
  return JSON.parse(completion.choices[0]?.message?.content ?? "{}");
}

export async function evaluateInterviewAnswer(question: string, answer: string) {
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an interview coach. Score the candidate's answer 0-10 and give 2-3 lines of feedback.
Return STRICT JSON: { "score": number, "feedback": string, "improvedAnswer": string }`,
      },
      { role: "user", content: `Question: ${question}\nAnswer: ${answer}` },
    ],
  });
  return JSON.parse(completion.choices[0]?.message?.content ?? "{}");
}
