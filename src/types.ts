
export type GoalStatus = "todo" | "inprogress" | "done";

export type GoalPriority = "low" | "medium" | "high";

export type Goal = {
  id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  priority: GoalPriority;
  project: string;
  dueDate?: Date;
  subGoals?: Goal[];
};

export const KANBAN_COLUMNS: { id: GoalStatus; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "done", title: "Done" },
];
