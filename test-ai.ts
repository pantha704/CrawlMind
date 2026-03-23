import { convertToModelMessages } from "ai";
async function run() {
  try {
    const msgs = [
      { role: "user", content: "Summarize my latest crawl" }
    ];
    // @ts-ignore
    const converted = convertToModelMessages(msgs);
    console.log("Success:", converted);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
