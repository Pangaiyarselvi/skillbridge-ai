import Groq from "groq-sdk";

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "gsk_placeholder_key_skillbridge",
});

export const GROQ_MODEL = "llama-3.3-70b-versatile";

/** Clean JSON string by stripping markdown code blocks if returned by LLM */
function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

/** Thin helper that always asks for structured JSON back from the model. */
export async function groqJSON<T = any>(systemPrompt: string, userPrompt: string): Promise<T> {
  // Ensure "json" is mentioned in prompt (strict requirement of Groq API json_object mode)
  const safeSystemPrompt = systemPrompt.toLowerCase().includes("json")
    ? systemPrompt
    : `${systemPrompt}\nOutput your entire response strictly in valid JSON format.`;

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: safeSystemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const cleaned = cleanJsonString(raw);
    return JSON.parse(cleaned) as T;
  } catch (error: any) {
    console.error("Groq API error in groqJSON:", error?.message || error);
    throw error;
  }
}

