import React, { useState } from "react";
import { register } from "../services/api";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";

interface ErrorResponse {
  detail?: string;
  non_field_errors?: string[];
  username?: string[];
  email?: string[];
  password?: string[];
}

const Register: React.FC = () => {
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(email, password, username);
      console.log("Registration successful, navigating to /login");
      navigate("/login", { replace: true }); // Use replace to avoid history stack issues
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      console.error("Registration failed:", axiosError);
      let errorMessage = "Unknown error";
      if (axiosError.response?.data) {
        const data = axiosError.response.data;
        if (data.detail) errorMessage = data.detail;
        else if (data.non_field_errors) errorMessage = data.non_field_errors.join(", ");
        else if (data.username || data.email || data.password) {
          errorMessage = [
            ...(data.username || []),
            ...(data.email || []),
            ...(data.password || []),
          ].join(", ");
        }
      } else {
        errorMessage = axiosError.message;
      }
      alert(`Registration error: ${errorMessage}`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-center">Регистрация</h1>
      <form onSubmit={handleSubmit} className="mt-4 max-w-md mx-auto">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Имя пользователя"
          className="border p-2 mb-2 w-full rounded"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="border p-2 mb-2 w-full rounded"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          className="border p-2 mb-2 w-full rounded"
          required
        />
        <button
          type="submit"
          className="bg-blue-500 text-white rounded p-2 w-full hover:bg-blue-600"
          disabled={!username || !email || !password}
        >
          Зарегистрироваться
        </button>
      </form>
    </div>
  );
};

export default Register;