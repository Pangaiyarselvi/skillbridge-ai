/**
 * Vector Search Layer (LangChain + pgvector)
 * -------------------------------------------------------------
 * Embeds Opportunity descriptions & IndustryExpectation text so students
 * can semantically search ("find me remote frontend internships focused
 * on React") and the chatbot can ground its answers in real listings.
 *
 * Requires the `pgvector` extension on the PostgreSQL instance:
 *   CREATE EXTENSION IF NOT EXISTS vector;
 *   ALTER TABLE "Opportunity" ADD COLUMN embedding vector(384);
 *
 * Embedding model: Groq does not currently serve embeddings, so this
 * uses a lightweight local/hosted embedding model via LangChain's
 * HuggingFaceInferenceEmbeddings (e.g. sentence-transformers/all-MiniLM-L6-v2).
 * Swap the embedder here if you provision OpenAI/Cohere embeddings instead.
 * -------------------------------------------------------------
 */

import { PrismaVectorStore } from "@langchain/community/vectorstores/prisma";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { Document } from "@langchain/core/documents";
import { PrismaClient, Prisma, Opportunity } from "@prisma/client";
import { prisma } from "../../config/prisma";

const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: process.env.HF_API_KEY,
  model: "sentence-transformers/all-MiniLM-L6-v2",
});

const vectorStore = PrismaVectorStore.withModel<Opportunity>(prisma as PrismaClient).create(embeddings, {
  prisma: Prisma,
  tableName: "Opportunity",
  vectorColumnName: "embedding",
  columns: {
    id: PrismaVectorStore.IdColumn,
    title: PrismaVectorStore.ContentColumn,
  },
});

/** Call this whenever an Opportunity is created/updated to (re)index it. */
export async function indexOpportunity(opportunity: Opportunity & { description: string }) {
  const doc = new Document<{ id: string }>({
    pageContent: `${opportunity.title}\n${opportunity.description}`,
    metadata: { id: opportunity.id },
  });
  await vectorStore.addDocuments([doc as unknown as Document<Opportunity>]);
}

export async function searchSimilarOpportunities(query: string, k = 5) {
  try {
    const results = await vectorStore.similaritySearch(query, k);
    const ids = results.map((r) => r.metadata.id as string);
    return await prisma.opportunity.findMany({ where: { id: { in: ids }, isActive: true } });
  } catch {
    // pgvector extension / embedding column not provisioned yet, or embedding API unreachable —
    // degrade gracefully so chat/recommendations keep working without semantic search.
    return prisma.opportunity.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" }, take: k });
  }
}
