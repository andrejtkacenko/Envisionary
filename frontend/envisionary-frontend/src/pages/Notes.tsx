import React, { useEffect, useState } from "react";
import { getNotes, createNote, getProjects } from "../services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AxiosError } from "axios";

interface Note {
  id: number;
  title: string;
  content: string;
  tags: string[];
  project: number | null;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMap, setProjectMap] = useState<Record<number, string>>({});

  useEffect(() => {
    Promise.all([loadNotes(), loadProjects()]);
  }, []);

  const loadNotes = async () => {
    try {
      const response = await getNotes();
      setNotes(response.data);
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        console.error("Failed to load notes:", error.response?.data || error.message);
      } else {
        console.error("Failed to load notes:", error);
      }
    }
  };

  const loadProjects = async () => {
    try {
      const response = await getProjects();
      const projectsData = response.data;
      setProjects(projectsData);
      // Create a map of project ID to name
      const map = projectsData.reduce((acc: Record<number, string>, project: Project) => {
        acc[project.id] = project.name;
        return acc;
      }, {});
      setProjectMap(map);
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        console.error("Failed to load projects:", error.response?.data || error.message);
      } else {
        console.error("Failed to load projects:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const noteData: { content: string; tags: string[]; project?: number } = {
        content,
        tags: tags.split(",").map((tag) => tag.trim()).filter((tag) => tag),
      };
      if (projectId && !isNaN(parseInt(projectId))) {
        noteData.project = parseInt(projectId);
      }
      await createNote(title, noteData);
      alert("Note created!");
      setTitle("");
      setContent("");
      setTags("");
      setProjectId("");
      await loadNotes();
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        console.error("Failed to create note:", error.response?.data || error.message);
      } else {
        console.error("Failed to create note:", error);
      }
      alert("Failed to create note.");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Notes</h1>
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="border p-2 mb-2 w-full rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Content (Markdown supported)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Content"
            className="border p-2 mb-2 w-full rounded h-32"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (e.g., tag1, tag2)"
            className="border p-2 mb-2 w-full rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Project (optional)</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="border p-2 mb-2 w-full rounded"
          >
            <option value="">No Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white rounded p-2 hover:bg-blue-600"
        >
          Create Note
        </button>
      </form>
      <div className="space-y-4">
        {notes.length > 0 ? (
          notes.map((note) => (
            <div key={note.id} className="border p-4 rounded shadow">
              <h3 className="font-bold text-lg">{note.title}</h3>
              <div className="prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.content}
                </ReactMarkdown>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Tags: {note.tags.join(", ") || "None"}
              </p>
              <p className="text-sm text-gray-600">
                Project: {note.project ? projectMap[note.project] || "Unknown" : "None"}
              </p>
            </div>
          ))
        ) : (
          <p className="text-gray-600">No notes found.</p>
        )}
      </div>
    </div>
  );
};

export default Notes;