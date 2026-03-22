import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { streamText, convertToModelMessages, UIMessage } from "ai";
import { chatModel, fastModel } from "@/lib/ai";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { jobId, messages }: { jobId?: string; messages: UIMessage[] } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages are required" },
        { status: 400 }
      );
    }

    let systemPrompt = "";
    if (jobId && jobId !== "none") {
      // Fetch crawl result to use as context
      const job = await prisma.crawlJob.findUnique({
        where: {
          id: jobId,
          userId: session.user.id,
        },
      });
      if (!job) {
        return NextResponse.json({ error: "Job not found or unauthorized" }, { status: 404 });
      }

      // Build system prompt with crawl data context
      const resultPreview =
        typeof job.resultData === "string"
          ? job.resultData.slice(0, 15000)
          : JSON.stringify(job.resultData).slice(0, 15000);

      systemPrompt = `You are CrawlMind AI — an expert data analyst. The user has crawled the following website(s) and you have access to the extracted content below.

**Crawl details:**
- Query: ${job.query}
- URLs crawled: ${job.resolvedUrls.join(", ")}
- Pages crawled: ${job.pagesCrawled}
- Format: ${job.format}

**Extracted content (may be truncated):**
${resultPreview || "No content extracted yet — the crawl may still be in progress."}

**Instructions:**
- Answer questions based on the crawled data above.
- Cite specific data from the content when answering.
- If the answer is not in the data, say so clearly.
- Be concise and direct.`;
    }

    // Try primary model, fallback to fast model
    let result;
    try {
      result = streamText({
        model: chatModel,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: await convertToModelMessages(messages),
      });
    } catch {
      result = streamText({
        model: fastModel,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: await convertToModelMessages(messages),
      });
    }

    // Use toTextStreamResponse if jobId is undefined (called from AIChatPage which reads raw chunks),
    // otherwise use toUIMessageStreamResponse (called from AiChatPanel useChat hook).
    if (jobId !== undefined) {
      return result.toUIMessageStreamResponse();
    } else {
      return result.toTextStreamResponse();
    }
  } catch (err) {
    console.error("AI chat error:", err);
    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 503 }
    );
  }
}

