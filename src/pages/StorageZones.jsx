import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

export default function StorageZones() {
  const [warehouses, setWarehouses] = useState([]);
  const [zones, setZones] = useState([]);

  const [form, setForm] = useState({
    warehouse_id: "",
    code: "",
    name: "",
    description: "",
    is_active: true,
  });

  const loadData = async () => {
    try {
      const [warehousesRes, zonesRes] = await Promise.all([
        api.get("/warehouses"),
        api.get("/storage-zones"),
      ]);
      setWarehouses(warehousesRes.data ?? []);
      setZones(zonesRes.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les zones");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/storage-zones", {
        ...form,
        warehouse_id: Number(form.warehouse_id),
        is_active: Boolean(form.is_active),
      });
      toast.success(res.data.message || "Zone créée");
      setForm({
        warehouse_id: "",
        code: "",
        name: "",
        description: "",
        is_active: true,
      });
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur création zone");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="xl:col-span-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h1 className="mb-4 text-3xl font-bold text-slate-800">Ajouter une zone</h1>

          <form onSubmit={submit} className="space-y-4">
            <select className="w-full rounded-xl border p-3" value={form.warehouse_id} onChange={(e) => setForm((p) => ({ ...p, warehouse_id: e.target.value }))}>
              <option value="">Choisir un dépôt</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} — {warehouse.site?.name || "-"}
                </option>
              ))}
            </select>

            <input className="w-full rounded-xl border p-3" placeholder="Code zone" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
            <input className="w-full rounded-xl border p-3" placeholder="Nom zone" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <textarea className="w-full rounded-xl border p-3" placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />

            <button className="rounded-xl bg-slate-900 px-4 py-3 text-white">
              Enregistrer la zone
            </button>
          </form>
        </div>
      </div>

      <div className="xl:col-span-8">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-2xl font-bold text-slate-800">Zones enregistrées</h2>

          <div className="space-y-3">
            {zones.map((zone) => (
              <div key={zone.id} className="rounded-xl border p-4">
                <div className="font-semibold text-slate-800">{zone.name}</div>
                <div className="text-sm text-slate-500">
                  {zone.code} — {zone.warehouse?.name || "-"} — {zone.warehouse?.site?.name || "-"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}