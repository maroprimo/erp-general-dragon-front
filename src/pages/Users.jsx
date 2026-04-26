import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

const ROLE_OPTIONS = [
  { value: "pdg", label: "PDG" },
  { value: "admin", label: "Admin" },
  { value: "stock", label: "Stock" },
  { value: "controle", label: "Contrôle" },
  { value: "cuisine", label: "Cuisine" },
  { value: "chauffeur", label: "Chauffeur" },
  { value: "securite", label: "Sécurité" },
  { value: "achat", label: "Achat" },
  { value: "logistique", label: "Logistique" },
];

const emptyForm = {
  name: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  role: "admin",
  site_id: "",
  warehouse_id: "",
  password: "",
  is_active: true,
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [form, setForm] = useState(emptyForm);

  const loadData = async () => {
    try {
      setLoading(true);

      const [usersRes, sitesRes, warehousesRes] = await Promise.all([
        api.get("/users"),
        api.get("/sites"),
        api.get("/warehouses"),
      ]);

      setUsers(usersRes.data?.data ?? usersRes.data ?? []);
      setSites(sitesRes.data?.data ?? sitesRes.data ?? []);
      setWarehouses(warehousesRes.data?.data ?? warehousesRes.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!avatarFile) {
      if (!editingId) {
        setPreviewUrl("");
      }
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile, editingId]);

  const filteredWarehouses = useMemo(() => {
    if (!form.site_id) return warehouses ?? [];
    return (warehouses ?? []).filter(
      (warehouse) => Number(warehouse.site_id) === Number(form.site_id)
    );
  }, [warehouses, form.site_id]);

  const updateForm = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "site_id") {
        next.warehouse_id = "";
      }

      return next;
    });
  };

  /*
  const getAvatarSrc = (user) => {
    if (user?.avatar_url) {
      if (user.avatar_url.startsWith("http")) return user.avatar_url;
      return `https://stock.dragonroyalmg.com${user.avatar_url}`;
    }

    if (user?.avatar_path) {
      return `https://stock.dragonroyalmg.com/storage/${user.avatar_path}`;
    }

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user?.name || user?.email || "User"
    )}`;
  };
  */
const getAvatarSrc = (user) => {
  const rawAvatarUrl = user?.avatar_url || "";
  const rawAvatarPath = user?.avatar_path || "";

  if (rawAvatarUrl && /^https?:\/\//i.test(rawAvatarUrl)) {
    return rawAvatarUrl;
  }

  if (rawAvatarPath) {
    let cleanPath = String(rawAvatarPath).trim();

    if (/^https?:\/\//i.test(cleanPath)) {
      return cleanPath;
    }

    cleanPath = cleanPath.replace(/^\/+/, "");

    if (cleanPath.startsWith("storage/")) {
      return `https://stock.dragonroyalmg.com/${cleanPath}`;
    }

    if (cleanPath.startsWith("uploads/")) {
      return `https://stock.dragonroyalmg.com/${cleanPath}`;
    }

    return `https://stock.dragonroyalmg.com/uploads/${cleanPath}`;
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user?.name || user?.email || "User"
  )}`;
};

  const getWarehouseLabel = (userItem) => {
    if (userItem?.warehouse?.name) return userItem.warehouse.name;

    const match = (warehouses ?? []).find(
      (warehouse) => Number(warehouse.id) === Number(userItem?.warehouse_id)
    );

    if (match?.name) return match.name;

    if (userItem?.warehouse_id) return `Dépôt ID: ${userItem.warehouse_id}`;

    return "Aucun dépôt";
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setAvatarFile(null);
    setPreviewUrl("");
  };

  const startEdit = (userItem) => {
    setEditingId(userItem.id);
    setForm({
      name: userItem.name || "",
      first_name: userItem.first_name || "",
      last_name: userItem.last_name || "",
      email: userItem.email || "",
      phone: userItem.phone || "",
      role: userItem.role || "admin",
      site_id: userItem.site_id ? String(userItem.site_id) : "",
      warehouse_id: userItem.warehouse_id ? String(userItem.warehouse_id) : "",
      password: "",
      is_active: Boolean(userItem.is_active ?? true),
    });
    setAvatarFile(null);
    setPreviewUrl(getAvatarSrc(userItem));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const submit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();

      formData.append("name", form.name || "");
      formData.append("first_name", form.first_name || "");
      formData.append("last_name", form.last_name || "");
      formData.append("email", form.email || "");
      formData.append("phone", form.phone || "");
      formData.append("role", form.role || "");
      formData.append("is_active", form.is_active ? "1" : "0");

      if (form.site_id) {
        formData.append("site_id", form.site_id);
      }

      if (form.warehouse_id) {
        formData.append("warehouse_id", form.warehouse_id);
      }

      if (form.password) {
        formData.append("password", form.password);
      }

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      if (editingId) {
        const res = await api.post(`/users/${editingId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(res.data?.message || "Utilisateur mis à jour");
      } else {
        if (!form.password) {
          toast.error("Le mot de passe est obligatoire pour la création");
          return;
        }

        const res = await api.post("/users", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(res.data?.message || "Utilisateur créé");
      }

      resetForm();
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Erreur lors de l'enregistrement"
      );
    }
  };

  const removeUser = async (userItem) => {
    const ok = window.confirm(
      `Voulez-vous vraiment supprimer l'utilisateur "${userItem.name}" ?`
    );

    if (!ok) return;

    try {
      const res = await api.delete(`/users/${userItem.id}`);
      toast.success(res.data?.message || "Utilisateur supprimé");

      if (editingId === userItem.id) {
        resetForm();
      }

      loadData();
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Erreur suppression utilisateur"
      );
    }
  };

  if (loading) {
    return <div className="p-6">Chargement des utilisateurs...</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="xl:col-span-5">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold text-slate-800">
              {editingId ? "Modifier un utilisateur" : "Ajouter un utilisateur"}
            </h1>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-slate-200 px-4 py-2 text-slate-700"
              >
                Annuler
              </button>
            )}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                className="rounded-xl border p-3"
                placeholder="Nom affiché *"
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
                required
              />

              <select
                className="rounded-xl border p-3"
                value={form.role}
                onChange={(e) => updateForm("role", e.target.value)}
                required
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>

              <input
                className="rounded-xl border p-3"
                placeholder="Prénom"
                value={form.first_name}
                onChange={(e) => updateForm("first_name", e.target.value)}
              />

              <input
                className="rounded-xl border p-3"
                placeholder="Nom"
                value={form.last_name}
                onChange={(e) => updateForm("last_name", e.target.value)}
              />

              <input
                type="email"
                className="rounded-xl border p-3"
                placeholder="Email *"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                required
              />

              <input
                className="rounded-xl border p-3"
                placeholder="Téléphone"
                value={form.phone}
                onChange={(e) => updateForm("phone", e.target.value)}
              />

              <select
                className="rounded-xl border p-3"
                value={form.site_id}
                onChange={(e) => updateForm("site_id", e.target.value)}
              >
                <option value="">Aucun site</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>

              <select
                className="rounded-xl border p-3"
                value={form.warehouse_id}
                onChange={(e) => updateForm("warehouse_id", e.target.value)}
              >
                <option value="">Aucun dépôt</option>
                {filteredWarehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>

              <input
                type="password"
                className="rounded-xl border p-3 md:col-span-2"
                placeholder={
                  editingId
                    ? "Nouveau mot de passe (laisser vide si inchangé)"
                    : "Mot de passe *"
                }
                value={form.password}
                onChange={(e) => updateForm("password", e.target.value)}
                required={!editingId}
              />
            </div>

            <label className="flex items-center gap-2 rounded-xl border p-3">
              <input
                type="checkbox"
                checked={Boolean(form.is_active)}
                onChange={(e) => updateForm("is_active", e.target.checked)}
              />
              Utilisateur actif
            </label>

            <div className="rounded-xl border p-4">
              <div className="mb-3 text-sm font-medium text-slate-700">
                Avatar utilisateur
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />

              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Prévisualisation avatar"
                  className="mt-4 h-24 w-24 rounded-full border object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      form.name || "User"
                    )}`;
                  }}
                />
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-3 text-white"
              >
                {editingId ? "Mettre à jour" : "Créer l’utilisateur"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-slate-200 px-4 py-3 text-slate-700"
              >
                Réinitialiser
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="xl:col-span-7">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-2xl font-bold text-slate-800">
            Utilisateurs enregistrés
          </h2>

          <div className="space-y-3">
            {users.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucun utilisateur enregistré.
              </div>
            )}

            {users.map((userItem) => (
              <div
                key={userItem.id}
                className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center"
              >
                <img
                  src={getAvatarSrc(userItem)}
                  alt={userItem.name}
                  className="h-14 w-14 rounded-full border object-cover"
                  onError={(e) => {
                    if (!e.currentTarget.src.includes("/uploads/")) {
                      e.currentTarget.src = `https://stock.dragonroyalmg.com/uploads/${userItem?.avatar_path}`;
                    } else {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        userItem?.name || "User"
                      )}`;
                    }
                  }}
                />

                <div className="flex-1">
                  <div className="font-semibold text-slate-800">
                    {userItem.name}
                  </div>

                  <div className="text-sm text-slate-500">
                    {userItem.first_name || "-"} {userItem.last_name || ""}
                  </div>

                  <div className="text-sm text-slate-500">
                    {userItem.email || "-"}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {userItem.role || "-"}
                    </span>

                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {userItem.phone || "Téléphone -"}
                    </span>

                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {userItem.site?.name ||
                        (userItem.site_id
                          ? `Site ID: ${userItem.site_id}`
                          : "Aucun site")}
                    </span>

                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {getWarehouseLabel(userItem)}
                    </span>

                    <span
                      className={`rounded-lg px-2 py-1 text-xs ${
                        userItem.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {userItem.is_active ? "Actif" : "Inactif"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(userItem)}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-white"
                  >
                    Modifier
                  </button>

                  <button
                    onClick={() => removeUser(userItem)}
                    className="rounded-xl bg-red-600 px-4 py-2 text-white"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}