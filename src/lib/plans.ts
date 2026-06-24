export type Plan = "free" | "plus" | "pro" | "teacher_feedback";

export interface PlanLimits {
  corrections: number;   // AI corrections per day
  maxChars: number;      // diary character cap
  lessonLibrary: boolean; // full Mini Lesson Library (20 lessons)
  reviewDrills: boolean;  // AI-generated Mini Lesson review drills
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free:             { corrections: 1,  maxChars: 300, lessonLibrary: false, reviewDrills: false },
  plus:             { corrections: 5,  maxChars: 500, lessonLibrary: true,  reviewDrills: false },
  pro:              { corrections: 10, maxChars: 500, lessonLibrary: true,  reviewDrills: true  },
  teacher_feedback: { corrections: 10, maxChars: 500, lessonLibrary: true,  reviewDrills: true  },
};

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  plus: "Plus",
  pro: "Pro",
  teacher_feedback: "Teacher Feedback",
};

export function normalizePlan(p: string | null | undefined): Plan {
  if (p === "plus" || p === "pro" || p === "teacher_feedback") return p;
  return "free";
}

export function limitsFor(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[normalizePlan(plan)];
}
