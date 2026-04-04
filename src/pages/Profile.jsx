import { useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Profile() {
const { user, setUser, refreshUser } = useAuth();
  const [file, setFile] = useState(null);

const submitAvatar = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
        const res = await api.post("/me/avatar", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        // 1. On vérifie si on a bien reçu le user
        if (res.data && res.data.user) {
            // 2. On met à jour le state global (AuthContext)
            setUser(res.data.user); 
            toast.success("Avatar mis à jour !");
        }

    } catch (err) {
        console.error("Erreur upload:", err);
        // On affiche l'erreur seulement si la requête a échoué (400, 500, etc.)
        toast.error(err.response?.data?.message || "Erreur lors de la mise à jour");
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
  // On utilise l'URL absolue + le chemin de la BDD
  src={`https://stock.dragonroyalmg.com/uploads/${user?.avatar_path}`} 
  key={user?.avatar_path} // INDISPENSABLE pour rafraîchir l'image dès que le nom change
  alt="avatar"
  className="h-20 w-20 rounded-full object-cover border-2 border-blue-500"
  onError={(e) => {
    // Si /uploads/ échoue, on tente /storage/ (juste au cas où)
    if (!e.target.src.includes('/storage/')) {
        e.target.src = `https://stock.dragonroyalmg.com/storage/${user?.avatar_path}`;
    } else {
        e.target.src = `https://ui-avatars.com/api/?name=${user?.name}`;
    }
  }}
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