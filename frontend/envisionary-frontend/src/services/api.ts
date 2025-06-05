import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
// import dotenv from 'dotenv'; 
// dotenv.config();   

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

interface CsrfTokenResponse {
  csrfToken: string;
}

interface GoogleAuthResponse {
  auth_url: string;
}

export interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string | null;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: { email: string }[];
}

interface DeleteEventResponse {
  message: string;
}

// Extend Axios config to include custom _retry property
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// CSRF Token Cache
let csrfToken: string | null = null;

export const getCsrfToken = async (): Promise<string> => {
  try {
    const response = await axios.get("http://localhost:8000/api/get-csrf-token/", {
      withCredentials: true,
    });
    return response.data.csrfToken;
  } catch (error) {
    console.error("Failed to fetch CSRF token:", error);
    throw error;
  }
};

const fetchCsrfToken = async (): Promise<string | null> => {
  try {
    console.log("Fetching CSRF token from /get-csrf-token/");
    const response = await axios.get<CsrfTokenResponse>("http://localhost:8000/api/get-csrf-token/", {
      withCredentials: true,
    });
    console.log("CSRF Token fetched:", response.data.csrfToken);
    return response.data.csrfToken;
  } catch (error: unknown) {
    console.error("Failed to fetch CSRF token:", error);
    return null;
  }
};

// Initialize CSRF token on module load
fetchCsrfToken().then((token) => {
  csrfToken = token;
});

// Request Interceptor to add CSRF token
api.interceptors.request.use(async (config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
    try {
      const csrfToken = await getCsrfToken();
      config.headers['X-CSRFToken'] = csrfToken;
    } catch (error) {
      console.error("Failed to set CSRF token:", error);
    }
  }
  return config;
});

// Response Interceptor to refresh CSRF token on 403
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as CustomAxiosRequestConfig | undefined;
    if (error.response?.status === 403 && config && !config._retry) {
      console.log("403 detected, refreshing CSRF token...");
      csrfToken = await fetchCsrfToken();
      if (csrfToken) {
        config._retry = true;
        config.headers = config.headers || {};
        config.headers["X-CSRFToken"] = csrfToken;
        return api(config as AxiosRequestConfig);
      }
    }
    return Promise.reject(error);
  }
);

// API Functions
export const register = async (email: string, password: string, username: string) => {
  console.log("Register request:", { email, password, username });
  try {
    const response = await api.post("/register/", { email, password, username });
    console.log("Register response:", response.data);
    return response;
  } catch (error: unknown) {
    console.error("Register error:", error);
    throw error;
  }
};

export const login = async (email: string, password: string): Promise<void> => {
  console.log("Login request:", { email, password });
  try {
    const response = await api.post("/login/", { email, password });
    console.log("Login response:", response.data);
  } catch (error: unknown) {
    console.error("Login error:", error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  console.log("Logout request");
  try {
    const response = await api.post("/logout/", {});
    console.log("Logout response:", response.data);
  } catch (error: unknown) {
    console.error("Logout error:", error);
    throw error;
  }
};

export const getProjects = async () => {
  return api.get("/projects/");
};

export const createProject = async (data: { name: string; description: string }) => {
  return api.post("/projects/", data);
};

export const getNotes = async () => {
  return api.get("/notes/");
};

export const createNote = async (
  title: string,
  data: { content: string; tags: string[]; project?: number }
) => {
  return api.post("/notes/", { title, content: data.content, tags: data.tags, project: data.project });
};

export const getGoogleAuthUrl = async (): Promise<string> => {
  console.log("Initiating getGoogleAuthUrl request");
  try {
    const response = await api.get<GoogleAuthResponse>("/google/auth/");
    console.log("Google auth URL fetched:", response.data.auth_url);
    return response.data.auth_url;
  } catch (error: unknown) {
    console.error("Error fetching Google auth URL:", error);
    throw error;
  }
};

export const createCalendarEvent = async (event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> => {
  try {
    const response = await api.post<CalendarEvent>("/google/events/", event);
    console.log("Event created:", response.data);
    return response.data;
  } catch (error: unknown) {
    console.error("Error creating event:", error);
    throw error;
  }
};

export const updateCalendarEvent = async (event: CalendarEvent): Promise<CalendarEvent> => {
  try {
    const response = await api.patch<CalendarEvent>("/google/events/", event);
    console.log("Event updated:", response.data);
    return response.data;
  } catch (error: unknown) {
    console.error("Error updating calendar event:", error);
    throw error;
  }
};

export const deleteCalendarEvent = async (eventId: string): Promise<DeleteEventResponse> => {
  try {
    const response = await api.delete<DeleteEventResponse>("/google/events/", {
      data: { id: eventId },
    });
    console.log("Event deleted:", response.data);
    return response.data;
  } catch (error: unknown) {
    console.error("Error deleting calendar event:", error);
    throw error;
  }
};

export const getCalendarEvents = async (timeMin: string, timeMax: string): Promise<CalendarEvent[]> => {
  try {
    const response = await api.get<CalendarEvent[]>("/google/events/", {
      params: { timeMin, timeMax },
    });
    console.log("Events fetched:", response.data);
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching calendar events:", error);
    throw error;
  }
};

export default api;