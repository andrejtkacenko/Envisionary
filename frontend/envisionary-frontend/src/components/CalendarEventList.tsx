import React from "react";

interface Event {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
}

interface CalendarEventListProps {
  events: Event[];
  onSelectEvent: (event: Event) => void;
  isLoading: boolean;
  error: string | null;
}

const CalendarEventList: React.FC<CalendarEventListProps> = ({
  events,
  onSelectEvent,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return <div className="text-center">Loading events...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  if (events.length === 0) {
    return <div className="text-gray-600 text-center">No events found.</div>;
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div
          key={event.id}
          className="border p-4 rounded shadow cursor-pointer hover:bg-gray-100"
          onClick={() => onSelectEvent(event)}
        >
          <h3 className="font-bold text-lg">{event.title}</h3>
          <p className="text-gray-600">
            {new Date(event.start).toLocaleString()} -{" "}
            {new Date(event.end).toLocaleString()}
          </p>
          <p className="text-gray-600">{event.description || "No description"}</p>
        </div>
      ))}
    </div>
  );
};

export default CalendarEventList;