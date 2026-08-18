export type CalendarEvent = {
  id: string;
  event_date: string; // YYYY-MM-DD
  title: string;
  note: string | null;
};

export type Todo = {
  id: string;
  title: string;
  done: boolean;
};
