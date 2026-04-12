import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

const emptyForm = {
  site_id: "",
  code: "",
  name: "",
  warehouse_type: "",
  is_active: true,
};

export default function Warehouses() {
  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

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
      toast.error("Impossible de charger les dépôts");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (warehouse) => {
    setEditingId(warehouse.id);
    setForm({
      site_id: warehouse.site_id ? String(warehouse.site_id) : "",
      code: warehouse.code || "",
      name: warehouse.name || "",
      warehouse_type: warehouse.warehouse_type || "",
      is_active: Boolean(warehouse.is_active),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.site_id) {
      toast.error("Choisir un site");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        ...form,
        site_id: Number(form.site_id),
        is_active: Boolean(form.is_active),
      };

      let res;

      if (isEditing) {
        res = await api.put(`/warehouses/${editingId}`, payload);
      } else {
        res = await api.post("/warehouses", payload);
      }

      toast.success(
        res.data?.message || (isEditing ? "Dépôt mis à jour" : "Dépôt créé")
      );

      resetForm();
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
          (isEditing ? "Erreur mise à jour dépôt" : "Erreur création dépôt")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteWarehouse = async (warehouse) => {
    const ok = window.confirm(
      `Voulez-vous vraiment supprimer le dépôt "${warehouse.name}" ?`
    );
    if (!ok) return;

    try {
      setDeletingId(warehouse.id);
      const res = await api.delete(`/warehouses/${warehouse.id}`);
      toast.success(res.data?.message || "Dépôt supprimé");

      if (editingId === warehouse.id) {
        resetForm();
      }

      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur suppression dépôt");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="xl:col-span-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold text-slate-800">
              {isEditing ? "Modifier un dépôt" : "Ajouter un dépôt"}
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
            <select
              className="w-full rounded-xl border p-3"
              value={form.site_id}
              onChange={(e) =>
                setForm((p) => ({ ...p, site_id: e.target.value }))
              }
            >
              <option value="">Choisir un site</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>

            <input
              className="w-full rounded-xl border p-3"
              placeholder="Code dépôt"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            />

            <input
              className="w-full rounded-xl border p-3"
              placeholder="Nom dépôt"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />

            <input
              className="w-full rounded-xl border p-3"
              placeholder="Type dépôt"
              value={form.warehouse_type}
              onChange={(e) =>
                setForm((p) => ({ ...p, warehouse_type: e.target.value }))
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
              Dépôt actif
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                disabled={submitting}
                className="rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-60"
              >
                {submitting
                  ? "Enregistrement..."
                  : isEditing
                  ? "Mettre à jour le dépôt"
                  : "Enregistrer le dépôt"}
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

      <div className="xl:col-span-8">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-2xl font-bold text-slate-800">
            Liste des dépôts
          </h2>

          <div className="space-y-3">
            {warehouses.map((warehouse) => (
              <div key={warehouse.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">
                      {warehouse.name}
                    </div>

                    <div className="text-sm text-slate-500">
                      {warehouse.code} — {warehouse.site?.name || "-"} —{" "}
                      {warehouse.warehouse_type || "-"}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      Statut : {warehouse.is_active ? "Actif" : "Inactif"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(warehouse)}
                      className="rounded-xl bg-blue-700 px-4 py-2 text-white"
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteWarehouse(warehouse)}
                      disabled={deletingId === warehouse.id}
                      className="rounded-xl bg-red-700 px-4 py-2 text-white disabled:opacity-60"
                    >
                      {deletingId === warehouse.id
                        ? "Suppression..."
                        : "Supprimer"}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {warehouses.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucun dépôt enregistré.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}