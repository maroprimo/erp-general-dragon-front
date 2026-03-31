import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

const siteTypes = [
  "restaurant",
  "depot",
  "central",
  "production",
  "bureau",
];

export default function Sites() {
  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    code: "",
    name: "",
    type_site: "restaurant",
    address: "",
    city: "",
    country: "",
    phone: "",
    email: "",
    is_active: true,
    default_warehouse_id: "",
    is_default: false,
  });

  const [editForm, setEditForm] = useState({
    code: "",
    name: "",
    type_site: "restaurant",
    address: "",
    city: "",
    country: "",
    phone: "",
    email: "",
    is_active: true,
    default_warehouse_id: "",
    is_default: false,
  });

  const loadSites = async () => {
    try {
      const res = await api.get("/sites-admin");
      setSites(res.data.data ?? res.data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les sites");
    }
  };

  const loadWarehouses = async () => {
    try {
      const res = await api.get("/references/warehouses");
      setWarehouses(res.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les dépôts");
    }
  };

  useEffect(() => {
    loadSites();
    loadWarehouses();
  }, []);

  const createSite = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        default_warehouse_id: form.default_warehouse_id ? Number(form.default_warehouse_id) : null,
        is_active: Boolean(form.is_active),
        is_default: Boolean(form.is_default),
      };

      const res = await api.post("/sites-admin", payload);
      toast.success(res.data.message || "Site créé");

      setForm({
        code: "",
        name: "",
        type_site: "restaurant",
        address: "",
        city: "",
        country: "",
        phone: "",
        email: "",
        is_active: true,
        default_warehouse_id: "",
        is_default: false,
      });

      loadSites();
    } catch (err) {
      console.error(err);
      toast.error("Erreur création site");
    }
  };

  const startEdit = (site) => {
    setEditingId(site.id);
    setEditForm({
      code: site.code ?? "",
      name: site.name ?? "",
      type_site: site.type_site ?? "restaurant",
      address: site.address ?? "",
      city: site.city ?? "",
      country: site.country ?? "",
      phone: site.phone ?? "",
      email: site.email ?? "",
      is_active: !!site.is_active,
      default_warehouse_id: site.default_warehouse_id ?? "",
      is_default: !!site.is_default,
    });
  };

  const saveEdit = async (id) => {
    try {
      const payload = {
        ...editForm,
        default_warehouse_id: editForm.default_warehouse_id ? Number(editForm.default_warehouse_id) : null,
        is_active: Boolean(editForm.is_active),
        is_default: Boolean(editForm.is_default),
      };

      const res = await api.put(`/sites-admin/${id}`, payload);
      toast.success(res.data.message || "Site mis à jour");
      setEditingId(null);
      loadSites();
    } catch (err) {
      console.error(err);
      toast.error("Erreur mise à jour site");
    }
  };

  const toggleSite = async (id) => {
    try {
      const res = await api.patch(`/sites-admin/${id}/toggle`);
      toast.success(res.data.message || "Statut modifié");
      loadSites();
    } catch (err) {
      console.error(err);
      toast.error("Erreur changement statut");
    }
  };

  const setDefaultSite = async (id) => {
    try {
      const res = await api.patch(`/sites-admin/${id}/set-default`);
      toast.success(res.data.message || "Site par défaut défini");
      loadSites();
    } catch (err) {
      console.error(err);
      toast.error("Erreur définition site par défaut");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Sites</h1>
        <p className="text-slate-500">
          Gestion des restaurants, dépôts, sites de production et site par défaut.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Nouveau site</h2>

        <form onSubmit={createSite} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <input className="rounded-xl border p-3" placeholder="Code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
          <input className="rounded-xl border p-3" placeholder="Nom du site" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />

          <select className="rounded-xl border p-3" value={form.type_site} onChange={(e) => setForm((p) => ({ ...p, type_site: e.target.value }))}>
            {siteTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <input className="rounded-xl border p-3" placeholder="Adresse" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
          <input className="rounded-xl border p-3" placeholder="Ville" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
          <input className="rounded-xl border p-3" placeholder="Pays" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />

          <input className="rounded-xl border p-3" placeholder="Téléphone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          <input className="rounded-xl border p-3" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />

          <select
            className="rounded-xl border p-3"
            value={form.default_warehouse_id}
            onChange={(e) => setForm((p) => ({ ...p, default_warehouse_id: e.target.value }))}
          >
            <option value="">Aucun dépôt principal</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            />
            Site actif
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked }))}
            />
            Site par défaut
          </label>

          <button className="rounded-xl bg-slate-900 px-4 py-3 text-white xl:col-span-3">
            Enregistrer le site
          </button>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Liste des sites</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-slate-200">
              <tr className="text-slate-600">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Ville</th>
                <th className="px-4 py-3">Dépôt principal</th>
                <th className="px-4 py-3">Actif</th>
                <th className="px-4 py-3">Défaut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {editingId === site.id ? (
                      <input className="rounded border p-2" value={editForm.code} onChange={(e) => setEditForm((p) => ({ ...p, code: e.target.value }))} />
                    ) : site.code}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === site.id ? (
                      <input className="rounded border p-2" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                    ) : site.name}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === site.id ? (
                      <select className="rounded border p-2" value={editForm.type_site} onChange={(e) => setEditForm((p) => ({ ...p, type_site: e.target.value }))}>
                        {siteTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    ) : site.type_site}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === site.id ? (
                      <input className="rounded border p-2" value={editForm.city} onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))} />
                    ) : site.city}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === site.id ? (
                      <select
                        className="rounded border p-2"
                        value={editForm.default_warehouse_id}
                        onChange={(e) => setEditForm((p) => ({ ...p, default_warehouse_id: e.target.value }))}
                      >
                        <option value="">Aucun</option>
                        {warehouses.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      site.default_warehouse?.name ?? "-"
                    )}
                  </td>
                  <td className="px-4 py-3">{site.is_active ? "Oui" : "Non"}</td>
                  <td className="px-4 py-3">{site.is_default ? "Oui" : "Non"}</td>
                  <td className="px-4 py-3 space-x-2">
                    {editingId === site.id ? (
                      <>
                        <button
                          onClick={() => saveEdit(site.id)}
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
                          onClick={() => startEdit(site)}
                          className="rounded-xl bg-blue-600 px-3 py-2 text-white"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => toggleSite(site.id)}
                          className="rounded-xl bg-amber-600 px-3 py-2 text-white"
                        >
                          Activer / Désactiver
                        </button>
                        <button
                          onClick={() => setDefaultSite(site.id)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-white"
                        >
                          Définir défaut
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}