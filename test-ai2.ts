import { streamText, generateText } from "ai";
import { createMockProvider } from "@ai-sdk/provider-utils/test";

async function run() {
  try {
    const msgs = [
      { role: "user", content: "Summarize my latest crawl" }
    ];
    console.log("Messages valid for CoreMessage?", msgs);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
