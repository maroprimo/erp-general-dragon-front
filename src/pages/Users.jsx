import { useEffect, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import toast from "react-hot-toast";
import ConfirmBox from "../components/ConfirmBox";

const roles = [
  "pdg",
  "admin",
  "stock",
  "cuisine",
  "achat",
  "controle",
  "livraison",
  "caissier",
];

export default function Users() {
  const { sites, loading } = useReferences();

  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [confirmUserId, setConfirmUserId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "stock",
    is_active: true,
    site_id: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "stock",
    is_active: true,
    site_id: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data.data ?? res.data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les utilisateurs");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = {
        ...form,
        is_active: Boolean(form.is_active),
        site_id: form.site_id ? Number(form.site_id) : null,
      };

      const res = await api.post("/users", payload);
      toast.success(res.data.message || "Utilisateur créé");
      setForm({
        name: "",
        email: "",
        password: "",
        role: "stock",
        is_active: true,
        site_id: "",
      });
      loadUsers();
    } catch (err) {
      console.error(err);
      toast.error("Erreur création utilisateur");
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "stock",
      is_active: !!user.is_active,
      site_id: user.site_id || "",
    });
  };

  const saveEdit = async (id) => {
    setMessage("");
    setError("");

    try {
      const payload = {
        ...editForm,
        is_active: Boolean(editForm.is_active),
        site_id: editForm.site_id ? Number(editForm.site_id) : null,
      };
      // 2. Si le mot de passe est vide ou absent, on le supprime du payload
        // pour que le backend ne tente pas de le valider
        if (!editForm.password || editForm.password.trim() === "") {
          delete payload.password;
        }

      await api.put(`/users/${id}`, payload);
      setMessage("Utilisateur mis à jour");
      setEditingId(null);
      loadUsers();
      } catch (err) {
          
          console.error(err);
          setError("Erreur mise à jour utilisateur");
      }
  };

  const toggleUser = async (id) => {
    setMessage("");
    setError("");

    try {
      await api.patch(`/users/${id}/toggle`);
      setMessage("Statut utilisateur modifié");
      loadUsers();
    } catch (err) {
      console.error(err);
      setError("Erreur modification utilisateur");
    }
  };

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 space-y-8">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h1 className="mb-6 text-3xl font-bold text-slate-800">
          Gestion des utilisateurs
        </h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="Nom"
            className="rounded-xl border p-3"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />

          <input
            type="email"
            placeholder="Email"
            className="rounded-xl border p-3"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />

          <input
            type="password"
            placeholder="Mot de passe"
            className="rounded-xl border p-3"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          />

          <select
            className="rounded-xl border p-3"
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={form.site_id}
            onChange={(e) => setForm((prev) => ({ ...prev, site_id: e.target.value }))}
          >
            <option value="">Aucun site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
            />
            Compte actif
          </label>

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-white md:col-span-2"
          >
            Créer utilisateur
          </button>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Liste des utilisateurs</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-slate-200">
              <tr className="text-slate-600">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    {editingId === user.id ? (
                      <input
                        className="rounded border p-2"
                        value={editForm.name}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    ) : (
                      user.name
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === user.id ? (
                      <input
                        className="rounded border p-2"
                        value={editForm.email}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    ) : (
                      user.email
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === user.id ? (
                      <select
                        className="rounded border p-2"
                        value={editForm.role}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    ) : (
                      user.role
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === user.id ? (
                      <select
                        className="rounded border p-2"
                        value={editForm.site_id}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, site_id: e.target.value }))}
                      >
                        <option value="">Aucun site</option>
                        {sites.map((site) => (
                          <option key={site.id} value={site.id}>
                            {site.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      user.site?.name ?? "-"
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === user.id ? (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editForm.is_active}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, is_active: e.target.checked }))
                          }
                        />
                        actif
                      </label>
                    ) : user.is_active ? (
                      "Actif"
                    ) : (
                      "Inactif"
                    )}
                  </td>

                  <td className="px-4 py-3 space-x-2">
                    {editingId === user.id ? (
                      <>
                        <input
                          type="password"
                          placeholder="Nouveau mot de passe"
                          className="mb-2 rounded border p-2"
                          value={editForm.password}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                        />
                        <button
                          onClick={() => saveEdit(user.id)}
                          className="rounded-xl bg-emerald-600 px-3 py-2 text-white"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-xl bg-slate-500 px-3 py-2 text-white"
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(user)}
                          className="rounded-xl bg-blue-600 px-3 py-2 text-white"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => setConfirmUserId(user.id)}
                          className="rounded-xl bg-amber-600 px-3 py-2 text-white"
                        >
                          Activer / Désactiver
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
{confirmUserId && (
  <ConfirmBox
    title="Changer le statut"
    message="Voulez-vous vraiment activer ou désactiver cet utilisateur ?"
    onCancel={() => setConfirmUserId(null)}
    onConfirm={async () => {
      try {
        await toggleUser(confirmUserId);
        toast.success("Statut utilisateur modifié");
      } catch (err) {
        toast.error("Erreur modification utilisateur");
      } finally {
        setConfirmUserId(null);
      }
    }}
  />
)}
        {message && <div className="mt-4 text-emerald-700">{message}</div>}
        {error && <div className="mt-4 text-red-600">{error}</div>}
      </div>
    </div>
  );
  
}