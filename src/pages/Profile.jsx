import { useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [file, setFile] = useState(null);

  const submitAvatar = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error("Choisir une image");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await api.post("/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(res.data.message || "Avatar mis à jour");

      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur upload avatar");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Profil</h1>
        <p className="text-slate-500">Photo et informations du compte connecté.</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center gap-4">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt="avatar"
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-slate-600">
              ?
            </div>
          )}

          <div>
            <div className="text-xl font-semibold text-slate-800">{user?.name}</div>
            <div className="text-sm text-slate-500">{user?.email}</div>
          </div>
        </div>

        <form onSubmit={submitAvatar} className="space-y-4">
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">
            Mettre à jour la photo
          </button>
        </form>
      </div>
    </div>
  );
}