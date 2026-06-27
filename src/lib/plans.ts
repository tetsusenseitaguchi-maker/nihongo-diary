export type Plan = "free" | "plus" | "pro" | "teacher_feedback";

export interface PlanLimits {
  corrections: number;    // AI corrections per day
  maxChars: number;       // diary character cap
  lessonLibrary: boolean; // full Mini Lesson Library (20 lessons)
  reviewDrills: boolean;  // AI-generated Mini Lesson review drills
  translation: boolean;   // diary translation feature (set false to make it Pro-only)
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free:             { corrections: 2,  maxChars: 300, lessonLibrary: false, reviewDrills: false, translation: true },
  plus:             { corrections: 10, maxChars: 500, lessonLibrary: true,  reviewDrills: false, translation: true },
  pro:              { corrections: 25, maxChars: 500, lessonLibrary: true,  reviewDrills: true,  translation: true },
  teacher_feedback: { corrections: 25, maxChars: 500, lessonLibrary: true,  reviewDrills: true,  translation: true },
};

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  plus: "Plus",
  pro: "Pro",
  teacher_feedback: "Teacher Feedback",
};

export function normalizePlan(p: string | null | undefined): Plan {
  const v = (p ?? "").toLowerCase().trim();
  if (v === "plus" || v === "pro" || v === "teacher_feedback") return v as Plan;
  return "free";
}

export function limitsFor(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[normalizePlan(plan)];
}
