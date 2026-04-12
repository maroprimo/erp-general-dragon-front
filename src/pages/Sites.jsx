import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function buildLogoUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const base =
    import.meta.env.VITE_BACKEND_WEB_URL?.replace(/\/index\.php$/, "") ||
    "https://stock.dragonroyalmg.com";

  return `${base}${path}`;
}

const emptyForm = {
  code: "",
  name: "",
  type_site: "",
  address: "",
  city: "",
  country: "",
  phone: "",
  email: "",
  nif: "",
  stat: "",
  rcs: "",
  status_label: "",
  is_active: true,
  warehouse_ids: [],
};

export default function Sites() {
  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  const loadData = async () => {
    try {
      const [sitesRes, warehousesRes] = await Promise.all([
        api.get("/sites"),
        api.get("/warehouses"),
      ]);

      setSites(asArray(sitesRes.data));
      setWarehouses(asArray(warehousesRes.data));
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les sites");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!logoFile) {
      if (!isEditing) {
        setLogoPreview("");
      }
      return;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile, isEditing]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setLogoFile(null);
    setLogoPreview("");
  };

  const toggleWarehouse = (id) => {
    setForm((prev) => {
      const key = String(id);
      const exists = prev.warehouse_ids.includes(key);

      return {
        ...prev,
        warehouse_ids: exists
          ? prev.warehouse_ids.filter((x) => x !== key)
          : [...prev.warehouse_ids, key],
      };
    });
  };

  const startEdit = (site) => {
    setEditingId(site.id);
    setForm({
      code: site.code || "",
      name: site.name || "",
      type_site: site.type_site || "",
      address: site.address || "",
      city: site.city || "",
      country: site.country || "",
      phone: site.phone || "",
      email: site.email || "",
      nif: site.nif || "",
      stat: site.stat || "",
      rcs: site.rcs || "",
      status_label: site.status_label || "",
      is_active: Boolean(site.is_active),
      warehouse_ids: (site.warehouses || []).map((w) => String(w.id)),
    });
    setLogoFile(null);
    setLogoPreview(buildLogoUrl(site.logo_url));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("code", form.code || "");
      formData.append("name", form.name || "");
      formData.append("type_site", form.type_site || "");
      formData.append("address", form.address || "");
      formData.append("city", form.city || "");
      formData.append("country", form.country || "");
      formData.append("phone", form.phone || "");
      formData.append("email", form.email || "");
      formData.append("nif", form.nif || "");
      formData.append("stat", form.stat || "");
      formData.append("rcs", form.rcs || "");
      formData.append("status_label", form.status_label || "");
      formData.append("is_active", form.is_active ? "1" : "0");

      form.warehouse_ids.forEach((id) => {
        formData.append("warehouse_ids[]", id);
      });

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      let res;

      if (isEditing) {
        formData.append("_method", "PUT");
        res = await api.post(`/sites/${editingId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await api.post("/sites", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      toast.success(
        res.data?.message || (isEditing ? "Site mis à jour" : "Site créé")
      );

      resetForm();
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
          (isEditing ? "Erreur mise à jour site" : "Erreur création site")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSite = async (site) => {
    const ok = window.confirm(
      `Voulez-vous vraiment supprimer le site "${site.name}" ?`
    );
    if (!ok) return;

    try {
      setDeletingId(site.id);
      const res = await api.delete(`/sites/${site.id}`);
      toast.success(res.data?.message || "Site supprimé");

      if (editingId === site.id) {
        resetForm();
      }

      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur suppression site");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="xl:col-span-5">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold text-slate-800">
              {isEditing ? "Modifier le site" : "Ajouter un site"}
            </h1>

            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-slate-200 px-4 py-2 text-slate-800"
              >
                Annuler
              </button>
            )}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                className="rounded-xl border p-3"
                placeholder="Code"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              />

              <input
                className="rounded-xl border p-3"
                placeholder="Nom du site"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />

              <input
                className="rounded-xl border p-3"
                placeholder="Type de site"
                value={form.type_site}
                onChange={(e) =>
                  setForm((p) => ({ ...p, type_site: e.target.value }))
                }
              />

              <input
                className="rounded-xl border p-3"
                placeholder="Ville"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              />

              <input
                className="rounded-xl border p-3"
                placeholder="Pays"
                value={form.country}
                onChange={(e) =>
                  setForm((p) => ({ ...p, country: e.target.value }))
                }
              />

              <input
                className="rounded-xl border p-3"
                placeholder="Téléphone"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />

              <input
                className="rounded-xl border p-3"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />

              <input
                className="rounded-xl border p-3"
                placeholder="NIF"
                value={form.nif}
                onChange={(e) => setForm((p) => ({ ...p, nif: e.target.value }))}
              />

              <input
                className="rounded-xl border p-3"
                placeholder="STAT"
                value={form.stat}
                onChange={(e) => setForm((p) => ({ ...p, stat: e.target.value }))}
              />

              <input
                className="rounded-xl border p-3"
                placeholder="RCS"
                value={form.rcs}
                onChange={(e) => setForm((p) => ({ ...p, rcs: e.target.value }))}
              />

              <input
                className="rounded-xl border p-3"
                placeholder="Statut"
                value={form.status_label}
                onChange={(e) =>
                  setForm((p) => ({ ...p, status_label: e.target.value }))
                }
              />

              <label className="flex items-center gap-2 rounded-xl border p-3">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, is_active: e.target.checked }))
                  }
                />
                Site actif
              </label>
            </div>

            <textarea
              className="w-full rounded-xl border p-3"
              placeholder="Adresse"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            />

            <div className="rounded-xl border p-4">
              <div className="mb-3 text-lg font-semibold text-slate-800">
                Dépôts liés au site
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {warehouses.map((warehouse) => (
                  <label
                    key={warehouse.id}
                    className="flex items-center gap-2 rounded-lg border p-3"
                  >
                    <input
                      type="checkbox"
                      checked={form.warehouse_ids.includes(String(warehouse.id))}
                      onChange={() => toggleWarehouse(warehouse.id)}
                    />
                    <span>
                      {warehouse.name}
                      <span className="ml-2 text-sm text-slate-500">
                        ({warehouse.code || "Sans code"})
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="mb-3 text-lg font-semibold text-slate-800">
                Logo du site
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />

              {logoPreview && (
                <img
                  src={logoPreview}
                  alt="Prévisualisation logo"
                  className="mt-4 h-24 w-24 rounded-xl border object-cover"
                />
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                disabled={submitting}
                className="rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-60"
              >
                {submitting
                  ? "Enregistrement..."
                  : isEditing
                  ? "Mettre à jour le site"
                  : "Enregistrer le site"}
              </button>

              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl bg-slate-200 px-4 py-3 text-slate-800"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="xl:col-span-7">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-2xl font-bold text-slate-800">
            Sites enregistrés
          </h2>

          <div className="space-y-3">
            {sites.map((site) => (
              <div key={site.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-4">
                    {site.logo_url && (
                      <img
                        src={buildLogoUrl(site.logo_url)}
                        alt={site.name}
                        className="h-14 w-14 rounded-xl border object-cover"
                      />
                    )}

                    <div>
                      <div className="font-semibold text-slate-800">
                        {site.name}
                      </div>

                      <div className="text-sm text-slate-500">
                        {site.code} — {site.phone || "-"} — {site.email || "-"}
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        NIF: {site.nif || "-"} | STAT: {site.stat || "-"} | RCS:{" "}
                        {site.rcs || "-"}
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        Dépôts: {(site.warehouses ?? []).length}
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        {site.address || "-"} {site.city ? `— ${site.city}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(site)}
                      className="rounded-xl bg-blue-700 px-4 py-2 text-white"
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteSite(site)}
                      disabled={deletingId === site.id}
                      className="rounded-xl bg-red-700 px-4 py-2 text-white disabled:opacity-60"
                    >
                      {deletingId === site.id ? "Suppression..." : "Supprimer"}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {sites.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucun site enregistré.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}