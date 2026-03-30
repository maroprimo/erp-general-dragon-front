import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
    } catch (err) {
      console.error(err);
      setError("Connexion impossible");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl"
      >
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-slate-800">General Dragon</h1>
          <p className="mt-2 text-sm text-slate-500">Connexion ERP Restaurants</p>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border border-slate-300 p-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Mot de passe"
            className="w-full rounded-xl border border-slate-300 p-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white hover:bg-slate-800"
          >
            Se connecter
          </button>
        </div>

        {error && <div className="mt-4 text-center text-red-600">{error}</div>}
      </form>
    </div>
  );
}