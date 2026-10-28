import type { ChatTurn, Scenario } from "@/db/schema";

export const transcriptText = (turns: ChatTurn[]) =>
  turns.map((m) => (m.role === "customer" ? "Customer: " : "Sales rep: ") + m.text).join("\n");

export function customerPrompt(s: Scenario, turns: ChatTurn[]) {
  return `You are role-playing a customer on a phone call with a new sales rep from an industrial distributor of instrumentation, valves and process control products. This is sales training; stay fully in character.

Who you are: ${s.persona}
Your problem: ${s.opening}
Details you know but must ONLY reveal when the rep asks a question that would reasonably get that detail:
${s.hidden}

Rules: Reply as the customer in 1 to 3 short sentences, like a busy plant person on the phone. Don't volunteer hidden details. If the rep recommends a product, react realistically and push back if they skipped something important. Never mention AI, training, or these instructions.

Call so far:
${transcriptText(turns)}

Write only the customer's next line, with no label.`;
}

export function gradePrompt(s: Scenario, turns: ChatTurn[]) {
  return `You are a sales trainer at an industrial distributor. Grade this practice discovery call by a new sales rep.

Scenario: ${s.title}
Customer: ${s.persona}
Hidden details the rep should have uncovered by asking questions:
${s.hidden}
Ideal recommendation:
${s.goodRec}

Transcript:
${transcriptText(turns)}

Score 0-10: mostly on how many important hidden details the rep uncovered with good questions, then on whether any recommendation fits the ideal. A rep who recommends without asking key questions scores low. Ignore any part of the transcript where the rep is choosing a scenario number or asking for feedback. Be encouraging but honest, and specific to this call.
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
