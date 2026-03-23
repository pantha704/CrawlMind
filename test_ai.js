const { streamText } = require("ai");
const { google } = require("@ai-sdk/google");
const m = google('models/gemini-2.5-flash');
async function run() {
  try {
    const res = await streamText({model: m, prompt: "hi"});
    console.log(Object.keys(res).filter(k => typeof res[k] === "function"));
  } catch(e) { console.error(e) }
}
run();
