import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

const TERMINAL_TYPES = [
  { value: "pos", label: "POS / Caisse" },
  { value: "cashier", label: "Caisse" },
  { value: "kitchen", label: "Cuisine" },
  { value: "mobile", label: "Mobile" },
  { value: "admin", label: "Admin" },
];

const emptyForm = {
  site_id: "",
  warehouse_id: "",
  code: "",
  name: "",
  terminal_type: "pos",
  device_identifier: "",
  ip_address: "",
  is_active: true,
};

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

export default function Terminals() {
  const [terminals, setTerminals] = useState([]);
  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const [filters, setFilters] = useState({
    site_id: "",
    warehouse_id: "",
    terminal_type: "",
    search: "",
    is_active: "",
  });

  const [form, setForm] = useState(emptyForm);

  const filteredWarehouses = useMemo(() => {
    if (!form.site_id) return [];
    return (warehouses ?? []).filter(
      (warehouse) => Number(warehouse.site_id) === Number(form.site_id)
    );
  }, [warehouses, form.site_id]);

  const listFilteredWarehouses = useMemo(() => {
    if (!filters.site_id) return warehouses ?? [];
    return (warehouses ?? []).filter(
      (warehouse) => Number(warehouse.site_id) === Number(filters.site_id)
    );
  }, [warehouses, filters.site_id]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [terminalsRes, sitesRes, warehousesRes] = await Promise.all([
        api.get("/terminals"),
        api.get("/sites"),
        api.get("/warehouses"),
      ]);

      setTerminals(asArray(terminalsRes.data));
      setSites(asArray(sitesRes.data));
      setWarehouses(asArray(warehousesRes.data));
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les postes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const updateForm = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "site_id") {
        next.warehouse_id = "";
      }

      return next;
    });
  };

  const startEdit = (terminal) => {
    setEditingId(terminal.id);
    setForm({
      site_id: terminal.site_id ? String(terminal.site_id) : "",
      warehouse_id: terminal.warehouse_id ? String(terminal.warehouse_id) : "",
      code: terminal.code || "",
      name: terminal.name || "",
      terminal_type: terminal.terminal_type || "pos",
      device_identifier: terminal.device_identifier || "",
      ip_address: terminal.ip_address || "",
      is_active: Boolean(terminal.is_active ?? true),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const submit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        site_id: form.site_id ? Number(form.site_id) : null,
        warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
        code: form.code || "",
        name: form.name || "",
        terminal_type: form.terminal_type || "pos",
        device_identifier: form.device_identifier || "",
        ip_address: form.ip_address || "",
        is_active: Boolean(form.is_active),
      };

      if (!payload.site_id) {
        toast.error("Le site est obligatoire");
        return;
      }

      if (editingId) {
        const res = await api.post(`/terminals/${editingId}`, payload);
        toast.success(res.data?.message || "Poste mis à jour");
      } else {
        const res = await api.post("/terminals", payload);
        toast.success(res.data?.message || "Poste créé");
      }

      resetForm();
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur lors de l'enregistrement");
    }
  };

  const removeTerminal = async (terminal) => {
    const ok = window.confirm(
      `Voulez-vous vraiment supprimer le poste "${terminal.name}" ?`
    );

    if (!ok) return;

    try {
      const res = await api.delete(`/terminals/${terminal.id}`);
      toast.success(res.data?.message || "Poste supprimé");

      if (editingId === terminal.id) {
        resetForm();
      }

      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur suppression poste");
    }
  };

  const filteredTerminals = useMemo(() => {
    return terminals.filter((item) => {
      const siteOk = filters.site_id
        ? Number(item.site_id) === Number(filters.site_id)
        : true;

      const warehouseOk = filters.warehouse_id
        ? Number(item.warehouse_id) === Number(filters.warehouse_id)
        : true;

      const typeOk = filters.terminal_type
        ? String(item.terminal_type || "") === String(filters.terminal_type)
        : true;

      const activeOk =
        filters.is_active === ""
          ? true
          : Boolean(item.is_active) === (filters.is_active === "true");

      const haystack = [
        item.code,
        item.name,
        item.terminal_type,
        item.device_identifier,
        item.ip_address,
        item.site?.name,
        item.warehouse?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const searchOk = filters.search
        ? haystack.includes(filters.search.toLowerCase())
        : true;

      return siteOk && warehouseOk && typeOk && activeOk && searchOk;
    });
  }, [terminals, filters]);

  if (loading) {
    return <div className="p-6">Chargement des postes...</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="xl:col-span-5">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold text-slate-800">
              {editingId ? "Modifier un poste" : "Ajouter un poste"}
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
              <select
                className="rounded-xl border p-3"
                value={form.site_id}
                onChange={(e) => updateForm("site_id", e.target.value)}
                required
              >
                <option value="">Choisir un site *</option>
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
                className="rounded-xl border p-3"
                placeholder="Code poste *"
                value={form.code}
                onChange={(e) => updateForm("code", e.target.value)}
                required
              />

              <input
                className="rounded-xl border p-3"
                placeholder="Nom du poste *"
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
                required
              />

              <select
                className="rounded-xl border p-3"
                value={form.terminal_type}
                onChange={(e) => updateForm("terminal_type", e.target.value)}
              >
                {TERMINAL_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <input
                className="rounded-xl border p-3"
                placeholder="Identifiant machine"
                value={form.device_identifier}
                onChange={(e) => updateForm("device_identifier", e.target.value)}
              />

              <input
                className="rounded-xl border p-3 md:col-span-2"
                placeholder="Adresse IP"
                value={form.ip_address}
                onChange={(e) => updateForm("ip_address", e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 rounded-xl border p-3">
              <input
                type="checkbox"
                checked={Boolean(form.is_active)}
                onChange={(e) => updateForm("is_active", e.target.checked)}
              />
              Poste actif
            </label>

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-3 text-white"
              >
                {editingId ? "Mettre à jour" : "Créer le poste"}
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
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-800">
              Postes enregistrés
            </h2>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
            <select
              className="rounded-xl border p-3"
              value={filters.site_id}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  site_id: e.target.value,
                  warehouse_id: "",
                }))
              }
            >
              <option value="">Tous les sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border p-3"
              value={filters.warehouse_id}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, warehouse_id: e.target.value }))
              }
            >
              <option value="">Tous les dépôts</option>
              {listFilteredWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border p-3"
              value={filters.terminal_type}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, terminal_type: e.target.value }))
              }
            >
              <option value="">Tous les types</option>
              {TERMINAL_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border p-3"
              value={filters.is_active}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, is_active: e.target.value }))
              }
            >
              <option value="">Tous</option>
              <option value="true">Actifs</option>
              <option value="false">Inactifs</option>
            </select>

            <input
              className="rounded-xl border p-3"
              placeholder="Recherche..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />
          </div>

          <div className="space-y-3">
            {filteredTerminals.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucun poste enregistré.
              </div>
            )}

            {filteredTerminals.map((terminal) => (
              <div
                key={terminal.id}
                className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center"
              >
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">
                    {terminal.name}
                  </div>

                  <div className="text-sm text-slate-500">
                    Code : {terminal.code || "-"}
                  </div>

                  <div className="text-sm text-slate-500">
                    Type : {terminal.terminal_type || "-"}
                  </div>

                  <div className="text-sm text-slate-500">
                    Site : {terminal.site?.name || "-"}
                  </div>

                  <div className="text-sm text-slate-500">
                    Dépôt : {terminal.warehouse?.name || "Aucun dépôt"}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-2">
                    {terminal.device_identifier && (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {terminal.device_identifier}
                      </span>
                    )}

                    {terminal.ip_address && (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {terminal.ip_address}
                      </span>
                    )}

                    <span
                      className={`rounded-lg px-2 py-1 text-xs ${
                        terminal.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {terminal.is_active ? "Actif" : "Inactif"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(terminal)}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-white"
                  >
                    Modifier
                  </button>

                  <button
                    onClick={() => removeTerminal(terminal)}
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