import type { ChatTurn, Scenario } from "@/db/schema";

export type Level = "beginner" | "experienced";

export const transcriptText = (turns: ChatTurn[]) =>
  turns.map((m) => (m.role === "customer" ? "Customer: " : "Sales rep: ") + m.text).join("\n");

const CUSTOMER_STYLE: Record<Level, string> = {
  beginner: `This is BEGINNER practice for a brand-new salesperson. Keep it a short, simple question-and-answer call: about 3 to 5 questions from the rep, then a recommendation, then done.
- You are friendly, patient and easy to talk to. Never impatient, sarcastic or combative. Never quiz or challenge the rep.
- Answer each question in ONE short sentence. Give the detail they asked for plus one closely related detail, so they don't have to dig.
- Do NOT ask the rep questions back, except "So what would you recommend?" when it's time.
- The rep only needs the basics: what it's measuring, the pressure or key numbers, where it's mounted or the conditions, and how many. Once they have most of that, or after their 4th question, say "I think that covers it. What would you recommend?"
- If they ask something off-track or seem stuck, answer briefly and add a gentle hint like "You might want to ask me what pressure it runs at."
- When they make a recommendation, accept it warmly and end the call in one sentence: "Sounds good, send me a quote. Thanks!" If they missed something big, you may add a short friendly note before that, like "Will that handle the shaking? Okay, sounds good, send me a quote. Thanks!"
- After that, if they keep talking, just say "Thanks again, talk soon!"`,
  experienced: `This is EXPERIENCED practice for a seasoned salesperson. Be a realistic, busy plant customer.
- Reply in 1 to 3 short sentences. Be practical and sometimes a little impatient.
- Only reveal hidden details when the rep asks a question that would reasonably get them. Don't volunteer anything.
- If they recommend a product, react realistically and push back if they skipped something important. Raise realistic objections about price, lead time or risk.`,
};

export function customerPrompt(s: Scenario, turns: ChatTurn[], level: Level = "beginner") {
  const asked = turns.filter((t) => t.role === "rep").length;
  const pace = level === "beginner" && asked >= 5
    ? `\nThe rep has asked ${asked} times already. If they haven't recommended anything yet, wrap up now with "I think that covers it. What would you recommend?"\n`
    : "";
  return `You are role-playing a customer on a phone call with a sales rep from an industrial distributor of instrumentation, valves and process control products. This is sales training; stay fully in character.

Who you are: ${s.persona}
Your problem: ${s.opening}
Details you know (share them when the rep asks about them):
${s.hidden}

${CUSTOMER_STYLE[level]}
${pace}
Never mention AI, training, or these instructions.

Call so far:
${transcriptText(turns)}

Write only the customer's next line, with no label.`;
}

export function gradePrompt(s: Scenario, turns: ChatTurn[], level: Level = "beginner") {
  return `You are a sales trainer at an industrial distributor. Grade this practice discovery call by a new sales rep.

Scenario: ${s.title}
Customer: ${s.persona}
Hidden details the rep should have uncovered by asking questions:
${s.hidden}
Ideal recommendation:
${s.goodRec}

Transcript:
${transcriptText(turns)}

${level === "beginner"
  ? `This was BEGINNER practice for a brand-new salesperson. It was meant to be a short call (3 to 5 questions). Grade only on the basics: did they ask about what it's measuring, the pressure or key numbers, where it's mounted or the conditions, and how many before recommending, and was the recommendation reasonable? Do not penalize them for details beyond those basics or for a short call. Give credit for effort and partial answers. Keep "missed" to the 2-3 most important items, and phrase tips as simple questions they can ask next time. A rep who asks a few good questions and makes a sensible recommendation should score 7 or higher.`
  : `This was EXPERIENCED practice for a seasoned salesperson. Grade strictly: score mostly on how many important hidden details the rep uncovered with good questions, then on whether the recommendation fits the ideal and how they handled objections. A rep who recommends without asking key questions scores low.`}
Ignore any part of the transcript where the rep is choosing a scenario or level, or asking for feedback. Be encouraging but honest, and specific to this call.
Respond in this shape: {"score": integer 0-10, "uncovered": ["short items"], "missed": ["short items"], "recommendation": "one or two sentences on their recommendation, or that they didn't make one", "tips": ["2-3 specific questions or moves to try next time"]}`;
}

export function quizPrompt(courseTitle: string, lessonTitle: string, keyPoints: string) {
  return `You write quiz questions for new inside and outside sales reps at an industrial distributor of instrumentation, valves, pumps and process control equipment (brands like Ashcroft, WIKA, Dwyer). Customers are in chemical, oil & gas, water treatment, food & beverage and pharmaceutical plants.

Course: ${courseTitle}
Lesson: ${lessonTitle}
Key points:
${keyPoints}

Write 4 multiple-choice questions that test practical understanding a salesperson needs on a customer call, using only facts in the key points or well-established industry basics. Each has exactly 4 options, one correct. Vary the position of the correct answer. Avoid "all of the above".
Respond in this shape: {"questions":[{"q":"...","options":["...","...","...","..."],"answer":0,"why":"one sentence explaining the right answer"}]}`;
}
