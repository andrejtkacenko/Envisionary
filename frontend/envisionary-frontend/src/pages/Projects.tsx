import React, { useEffect, useState } from "react";
import { getProjects, createProject } from "../services/api";
import { AxiosError } from "axios";

interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await getProjects();
      setProjects(response.data);
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
      const projectData = { name, description };
      await createProject(projectData);
      alert("Project created!");
      setName("");
      setDescription("");
      await loadProjects();
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        console.error("Failed to create project:", error.response?.data || error.message);
      } else {
        console.error("Failed to create project:", error);
      }
      alert("Failed to create project.");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Projects</h1>
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project Name"
            className="border p-2 mb-2 w-full rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Project Description"
            className="border p-2 mb-2 w-full rounded h-24"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white rounded p-2 hover:bg-blue-600"
        >
          Create Project
        </button>
      </form>
      <div className="space-y-4">
        {projects.length > 0 ? (
          projects.map((project) => (
            <div key={project.id} className="border p-4 rounded shadow">
              <h3 className="font-bold text-lg">{project.name}</h3>
              <p className="text-gray-600">{project.description || "No description"}</p>
              <p className="text-sm text-gray-600">
                Created: {new Date(project.created_at).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <p className="text-gray-600">No projects found.</p>
        )}
      </div>
    </div>
  );
};

export default Projects;