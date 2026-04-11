import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

export default function Warehouses() {
  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [form, setForm] = useState({
    site_id: "",
    code: "",
    name: "",
    warehouse_type: "",
    is_active: true,
  });

  const loadData = async () => {
    try {
      const [sitesRes, warehousesRes] = await Promise.all([
        api.get("/sites"),
        api.get("/warehouses"),
      ]);
      setSites(sitesRes.data ?? []);
      setWarehouses(warehousesRes.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les dépôts");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/warehouses", {
        ...form,
        site_id: Number(form.site_id),
        is_active: Boolean(form.is_active),
      });
      toast.success(res.data.message || "Dépôt créé");
      setForm({
        site_id: "",
        code: "",
        name: "",
        warehouse_type: "",
        is_active: true,
      });
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur création dépôt");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="xl:col-span-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h1 className="mb-4 text-3xl font-bold text-slate-800">Ajouter un dépôt</h1>

          <form onSubmit={submit} className="space-y-4">
            <select className="w-full rounded-xl border p-3" value={form.site_id} onChange={(e) => setForm((p) => ({ ...p, site_id: e.target.value }))}>
              <option value="">Choisir un site</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>

            <input className="w-full rounded-xl border p-3" placeholder="Code dépôt" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
            <input className="w-full rounded-xl border p-3" placeholder="Nom dépôt" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <input className="w-full rounded-xl border p-3" placeholder="Type dépôt" value={form.warehouse_type} onChange={(e) => setForm((p) => ({ ...p, warehouse_type: e.target.value }))} />

            <button className="rounded-xl bg-slate-900 px-4 py-3 text-white">
              Enregistrer le dépôt
            </button>
          </form>
        </div>
      </div>

      <div className="xl:col-span-8">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-2xl font-bold text-slate-800">Liste des dépôts</h2>

          <div className="space-y-3">
            {warehouses.map((warehouse) => (
              <div key={warehouse.id} className="rounded-xl border p-4">
                <div className="font-semibold text-slate-800">{warehouse.name}</div>
                <div className="text-sm text-slate-500">
                  {warehouse.code} — {warehouse.site?.name || "-"} — {warehouse.warehouse_type || "-"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}