export type SalesScriptBlock = {
  intro: string;
  movementScreenPitch: string;
  schedulingCTA: string;
};

export type ObjectionResponse = {
  response: string;
  offer: string;
};

export const INITIAL_CONTACT: SalesScriptBlock = {
  intro: "Hi {parentName}, I'm {trainerName} from SwanStudios. Thanks for reaching out about training options.",
  movementScreenPitch: "We offer a complimentary 10-minute movement assessment to understand posture, mobility, and pain points before training.",
  schedulingCTA: "Would you like to schedule a free assessment this week?"
};

export const OBJECTION_HANDLING: Record<string, ObjectionResponse> = {
  too_expensive: {
    response: "I understand budget is important. Our Transformation Pack brings the per-session rate down to $160 while keeping priority scheduling.",
    offer: "transformation-pack"
  },
  no_time: {
    response: "Time is precious. That is why we built Express 30, a high-impact 30-minute session that fits into busy schedules.",
    offer: "express-30"
  },
  not_sure: {
    response: "Totally fair. That is why we offer a free movement screen with no commitment so you can see the value first.",
    offer: "free-assessment"
  }
};

export const MOVEMENT_SCREEN_QUESTIONS: string[] = [
  "Any current injuries or pain?",
  "Previous fitness experience?",
  "Primary fitness goals?",
  "Any movements that feel limited or uncomfortable?",
  "Preferred training frequency?",
  "Any medical clearance requirements?"
];
