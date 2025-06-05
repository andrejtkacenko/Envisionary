import React, { useEffect, useState } from "react";
import { 
  getGoogleAuthUrl, 
  createCalendarEvent, 
  getCalendarEvents, 
  updateCalendarEvent, 
  deleteCalendarEvent 
} from "../services/api";
import type { CalendarEvent } from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import EventModal from "../components/EventModal"; // Предполагаем создание этого компонента

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string | null;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
  attendees?: { email?: string }[];
}

const Dashboard: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    isAuthenticated, 
    isLoading, 
    isGoogleConnected, 
    setIsGoogleConnected 
  } = useAuth();

  // Обработка Google OAuth callback
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const params = new URLSearchParams(location.search);
      if (params.get("google_connected") === "true") {
        setIsGoogleConnected(true);
        fetchEvents();
        // Очищаем параметр из URL
        navigate(location.pathname, { replace: true });
      }
    }
  }, [location.search, isLoading, isAuthenticated]);

  // Загрузка событий при подключенном Google
  useEffect(() => {
    if (isGoogleConnected && !isLoading) {
      fetchEvents();
    }
  }, [isGoogleConnected, isLoading]);

  const handleGoogleAuth = async () => {
    try {
      const authUrl = await getGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Failed to get Google auth URL:", error);
      alert("Failed to initiate Google authentication.");
    }
  };

  const handleCreateTestEvent = async () => {
    try {
      const event: Omit<CalendarEvent, "id"> = {
        summary: "Test Event",
        description: "Created from Envisionary",
        start: { 
          dateTime: new Date(Date.now() + 3600000).toISOString(), 
          timeZone: "UTC" 
        },
        end: { 
          dateTime: new Date(Date.now() + 7200000).toISOString(), 
          timeZone: "UTC" 
        },
        attendees: [{ email: "test@example.com" }],
      };
      await createCalendarEvent(event);
      fetchEvents();
    } catch (error) {
      console.error("Failed to create event:", error);
      alert("Failed to create event. Please reconnect Google Calendar.");
      setIsGoogleConnected(false);
    }
  };

  const handleSaveEvent = async (eventData: Omit<CalendarEvent, "id">, eventId?: string) => {
    try {
      if (eventId) {
        await updateCalendarEvent({ ...eventData, id: eventId });
        alert("Event updated!");
      } else {
        await createCalendarEvent(eventData);
        alert("Event created!");
      }
      fetchEvents();
    } catch (error) {
      console.error("Failed to save event:", error);
      alert(`Failed to ${eventId ? "update" : "create"} event.`);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      try {
        await deleteCalendarEvent(eventId);
        fetchEvents();
      } catch (error) {
        console.error("Failed to delete event:", error);
        alert("Failed to delete event.");
      }
    }
  };

  const fetchEvents = async () => {
    try {
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const fetchedEvents = await getCalendarEvents(timeMin, timeMax);
      
      setEvents(
        fetchedEvents.map((event: GoogleCalendarEvent) => ({
          id: event.id,
          summary: event.summary || "No title",
          description: event.description ?? null,
          start: { 
            dateTime: event.start?.dateTime || new Date().toISOString(), 
            timeZone: "UTC" 
          },
          end: { 
            dateTime: event.end?.dateTime || new Date().toISOString(), 
            timeZone: "UTC" 
          },
          attendees: event.attendees?.map((a) => ({ email: a.email || "" })) || [],
        }))
      );
    } catch (error) {
      console.error("Failed to fetch events:", error);
      setIsGoogleConnected(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      
      {!isGoogleConnected ? (
        <button
          onClick={handleGoogleAuth}
          className="bg-blue-500 text-white rounded p-2 mb-4 hover:bg-blue-600"
        >
          Connect Google Calendar
        </button>
      ) : (
        <div className="mb-4">
          <button
            onClick={handleCreateTestEvent}
            className="bg-green-500 text-white rounded p-2 mr-2 hover:bg-green-600"
          >
            Create Test Event
          </button>
          <button
            onClick={() => {
              setEditingEvent(null);
              setIsModalOpen(true);
            }}
            className="bg-purple-500 text-white rounded p-2 hover:bg-purple-600"
          >
            Create Custom Event
          </button>
        </div>
      )}

      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        event={editingEvent}
      />

      <h2 className="text-xl font-semibold mb-2">Upcoming Events</h2>
      {events.length === 0 ? (
        <p className="text-gray-600">No upcoming events</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {events.map((event) => (
            <li key={event.id} className="py-4 flex justify-between items-center">
              <div>
                <h3 className="font-medium">{event.summary}</h3>
                <p className="text-gray-600">
                  {event.start.dateTime ? 
                    new Date(event.start.dateTime).toLocaleString() : 
                    "No date"}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEditingEvent(event);
                    setIsModalOpen(true);
                  }}
                  className="bg-yellow-500 text-white rounded px-3 py-1 hover:bg-yellow-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  className="bg-red-500 text-white rounded px-3 py-1 hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;