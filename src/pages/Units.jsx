import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

export default function Units() {
  const [units, setUnits] = useState([]);
  const [form, setForm] = useState({
    code: "",
    name: "",
    symbol: "",
    ratio_base: "1",
    is_active: true,
  });

  const loadUnits = async () => {
    try {
      const res = await api.get("/units");
      setUnits(res.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les unités");
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/units", {
        ...form,
        ratio_base: Number(form.ratio_base),
        is_active: Boolean(form.is_active),
      });
      toast.success(res.data.message || "Unité créée");
      setForm({
        code: "",
        name: "",
        symbol: "",
        ratio_base: "1",
        is_active: true,
      });
      loadUnits();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur création unité");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="xl:col-span-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h1 className="mb-4 text-3xl font-bold text-slate-800">Ajouter une unité</h1>

          <form onSubmit={submit} className="space-y-4">
            <input className="w-full rounded-xl border p-3" placeholder="Code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
            <input className="w-full rounded-xl border p-3" placeholder="Nom" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <input className="w-full rounded-xl border p-3" placeholder="Symbole" value={form.symbol} onChange={(e) => setForm((p) => ({ ...p, symbol: e.target.value }))} />
            <input className="w-full rounded-xl border p-3" type="number" step="0.000001" placeholder="Ratio base" value={form.ratio_base} onChange={(e) => setForm((p) => ({ ...p, ratio_base: e.target.value }))} />

            <button className="rounded-xl bg-slate-900 px-4 py-3 text-white">
              Enregistrer l’unité
            </button>
          </form>
        </div>
      </div>

      <div className="xl:col-span-8">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-2xl font-bold text-slate-800">Unités enregistrées</h2>

          <div className="space-y-3">
            {units.map((unit) => (
              <div key={unit.id} className="rounded-xl border p-4">
                <div className="font-semibold text-slate-800">{unit.name}</div>
                <div className="text-sm text-slate-500">
                  {unit.code} — {unit.symbol || "-"} — ratio base : {unit.ratio_base}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}