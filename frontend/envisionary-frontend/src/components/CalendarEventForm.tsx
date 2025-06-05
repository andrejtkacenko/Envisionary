import React, { useState, useEffect } from "react";

interface Event {
  id?: string;
  title: string;
  start: string;
  end: string;
  description?: string;
}

interface CalendarEventFormProps {
  event?: Event;
  onSave: (event: Event) => Promise<void>;
  onClose: () => void;
}

const CalendarEventForm: React.FC<CalendarEventFormProps> = ({
  event,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState(event?.title || "");
  const [start, setStart] = useState(event?.start || "");
  const [end, setEnd] = useState(event?.end || "");
  const [description, setDescription] = useState(event?.description || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setStart(event.start);
      setEnd(event.end);
      setDescription(event.description || "");
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !start || !end) {
      setError("Title, start, and end dates are required.");
      return;
    }

    try {
      await onSave({ id: event?.id, title, start, end, description });
      onClose();
    } catch (err) {
      setError("Failed to save event.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {event ? "Edit Event" : "Create Event"}
        </h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border p-2 w-full rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start</label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="border p-2 w-full rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End</label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="border p-2 w-full rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border p-2 w-full rounded h-24"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CalendarEventForm;