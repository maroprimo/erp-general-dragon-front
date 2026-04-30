import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function money(v) {
  return Number(v || 0).toLocaleString("fr-FR");
}

function qty(v) {
  return Number(v || 0).toLocaleString("fr-FR", {
    maximumFractionDigits: 3,
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function badge(level) {
  switch (String(level || "").toLowerCase()) {
    case "danger":
      return "bg-red-100 text-red-700";
    case "warning":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}

export default function KitchenInventoryChecks() {
  const { user, activeTerminal } = useAuth();

  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [checks, setChecks] = useState([]);
  const [selectedCheck, setSelectedCheck] = useState(null);

  const [form, setForm] = useState({
    site_id: activeTerminal?.site_id || user?.site_id || "",
    warehouse_id: "",
    check_date: today(),
    notes: "",
    lines: [],
  });

  const visibleWarehouses = useMemo(() => {
    if (!form.site_id) return warehouses;
    return warehouses.filter((w) => Number(w.site_id) === Number(form.site_id));
  }, [warehouses, form.site_id]);

  const totals = useMemo(() => {
    return form.lines.reduce(
      (acc, line) => {
        acc.theoretical += Number(line.theoretical_value || 0);
        acc.actual += Number(line.actual_value || 0);
        acc.diff += Number(line.difference_value || 0);

        if (line.alert_level === "danger" || line.alert_level === "warning") {
          acc.alerts += 1;
        }

        return acc;
      },
      { theoretical: 0, actual: 0, diff: 0, alerts: 0 }
    );
  }, [form.lines]);

  const loadReferences = async () => {
    try {
      const [sitesRes, warehousesRes] = await Promise.all([
        api.get("/sites"),
        api.get("/warehouses"),
      ]);

      setSites(asArray(sitesRes.data));
      setWarehouses(asArray(warehousesRes.data));
    } catch (err) {
      console.error(err);
    }
  };

  const loadChecks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/kitchen-inventory-checks");
      const rows = asArray(res.data);
      setChecks(rows);
      setSelectedCheck((prev) => prev || rows[0] || null);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les contrôles inventaire");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferences();
    loadChecks();
  }, []);

  const preview = async () => {
    if (!form.site_id || !form.warehouse_id) {
      toast.error("Choisir un site et un dépôt");
      return;
    }

    try {
      setPreviewing(true);

      const res = await api.post("/kitchen-inventory-checks/preview", {
        site_id: Number(form.site_id),
        warehouse_id: Number(form.warehouse_id),
      });

      const rows = asArray(res.data).map((row) => ({
        ...row,
        actual_quantity: row.theoretical_quantity,
        difference_quantity: 0,
        actual_value: row.theoretical_value,
        difference_value: 0,
        alert_level: "normal",
      }));

      setForm((prev) => ({
        ...prev,
        lines: rows,
      }));

      toast.success("Produits chargés depuis le stock du dépôt");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur chargement stock");
    } finally {
      setPreviewing(false);
    }
  };

  const updateActualQty = (index, value) => {
    setForm((prev) => {
      const lines = prev.lines.map((line, i) => {
        if (i !== index) return line;

        const theoretical = Number(line.theoretical_quantity || 0);
        const actual = Number(value || 0);
        const unitCost = Number(line.unit_cost || 0);
        const diffQty = actual - theoretical;
        const diffValue = diffQty * unitCost;

        let alert = "normal";
        if (Math.abs(diffValue) >= 50000) alert = "danger";
        else if (Math.abs(diffValue) >= 10000 || Math.abs(diffQty) > 0) alert = "warning";

        return {
          ...line,
          actual_quantity: value,
          difference_quantity: diffQty,
          actual_value: actual * unitCost,
          difference_value: diffValue,
          alert_level: alert,
        };
      });

      return {
        ...prev,
        lines,
      };
    });
  };

  const submit = async () => {
    if (!form.site_id || !form.warehouse_id) {
      toast.error("Choisir un site et un dépôt");
      return;
    }

    if (!form.lines.length) {
      toast.error("Aucune ligne à enregistrer");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        site_id: Number(form.site_id),
        warehouse_id: Number(form.warehouse_id),
        check_date: form.check_date,
        notes: form.notes || null,
        lines: form.lines.map((line) => ({
          product_id: Number(line.product_id),
          unit_id: line.unit_id || null,
          theoretical_quantity: Number(line.theoretical_quantity || 0),
          actual_quantity: Number(line.actual_quantity || 0),
          unit_cost: Number(line.unit_cost || 0),
          notes: line.notes || null,
        })),
      };

      const res = await api.post("/kitchen-inventory-checks", payload);
      toast.success(res.data?.message || "Contrôle créé");

      setSelectedCheck(res.data?.data || null);
      setForm((prev) => ({
        ...prev,
        notes: "",
        lines: [],
      }));

      await loadChecks();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur enregistrement contrôle");
    } finally {
      setSubmitting(false);
    }
  };

  const validateSelected = async () => {
    if (!selectedCheck?.id) return;

    try {
      const res = await api.post(`/kitchen-inventory-checks/${selectedCheck.id}/validate`);
      toast.success(res.data?.message || "Contrôle validé");
      setSelectedCheck(res.data?.data || null);
      await loadChecks();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur validation");
    }
  };

  const adjustSelectedStock = async () => {
  if (!selectedCheck?.id) return;

  const notes = window.prompt(
    "Note d'ajustement stock (optionnel) :",
    "Ajustement après contrôle inventaire cuisine"
  );

  if (notes === null) return;

  try {
    const res = await api.post(
      `/kitchen-inventory-checks/${selectedCheck.id}/adjust-stock`,
      {
        adjustment_notes: notes || null,
      }
    );

    toast.success(res.data?.message || "Stock ajusté");
    setSelectedCheck(res.data?.data || null);
    await loadChecks();
  } catch (err) {
    console.error(err);
    toast.error(err?.response?.data?.message || "Erreur ajustement stock");
  }
};


  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-700 p-5 text-white shadow-xl">
        <h1 className="text-3xl font-black">Contrôle pertes & écarts cuisine</h1>
        <p className="mt-1 text-sm text-slate-200">
          Inventaire rapide des sous-dépôts et comparaison avec le stock théorique.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <div className="rounded-2xl bg-white p-5 shadow">
            <h2 className="mb-4 text-xl font-bold text-slate-800">
              Nouveau contrôle
            </h2>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select
                className="rounded-xl border p-3"
                value={form.site_id}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    site_id: e.target.value,
                    warehouse_id: "",
                    lines: [],
                  }))
                }
              >
                <option value="">Choisir site</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>

              <select
                className="rounded-xl border p-3"
                value={form.warehouse_id}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    warehouse_id: e.target.value,
                    lines: [],
                  }))
                }
              >
                <option value="">Choisir dépôt cuisine</option>
                {visibleWarehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                className="rounded-xl border p-3"
                value={form.check_date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, check_date: e.target.value }))
                }
              />

              <button
                onClick={preview}
                disabled={previewing}
                className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-60"
              >
                {previewing ? "Chargement..." : "Charger stock"}
              </button>
            </div>

            <textarea
              className="mt-3 w-full rounded-xl border p-3"
              rows={2}
              placeholder="Notes du contrôle"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Théorique</div>
                <div className="font-black">{money(totals.theoretical)} Ar</div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Réel compté</div>
                <div className="font-black">{money(totals.actual)} Ar</div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Écart</div>
                <div className={`font-black ${totals.diff < 0 ? "text-red-700" : "text-emerald-700"}`}>
                  {money(totals.diff)} Ar
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Alertes</div>
                <div className="font-black">{totals.alerts}</div>
              </div>
            </div>

            <div className="mt-5 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {form.lines.length === 0 && (
                <div className="rounded-xl bg-slate-50 p-5 text-center text-slate-500">
                  Chargez le stock du dépôt pour commencer.
                </div>
              )}

              {form.lines.map((line, index) => (
                <div key={`${line.product_id}-${index}`} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-bold text-slate-900">
                        {line.product_name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {line.product_code || "-"} • {line.unit_name || "-"}
                      </div>
                    </div>

                    <span className={`rounded-lg px-2 py-1 text-xs font-bold ${badge(line.alert_level)}`}>
                      {line.alert_level}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Théorique</div>
                      <div className="font-bold">{qty(line.theoretical_quantity)}</div>
                    </div>

                    <input
                      type="number"
                      step="0.001"
                      className="rounded-lg border p-3"
                      value={line.actual_quantity}
                      onChange={(e) => updateActualQty(index, e.target.value)}
                    />

                    <div className="rounded-lg bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Écart qté</div>
                      <div className={`font-bold ${Number(line.difference_quantity) < 0 ? "text-red-700" : "text-emerald-700"}`}>
                        {qty(line.difference_quantity)}
                      </div>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">PMP</div>
                      <div className="font-bold">{money(line.unit_cost)} Ar</div>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Écart valeur</div>
                      <div className={`font-bold ${Number(line.difference_value) < 0 ? "text-red-700" : "text-emerald-700"}`}>
                        {money(line.difference_value)} Ar
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {form.lines.length > 0 && (
              <button
                onClick={submit}
                disabled={submitting}
                className="mt-5 rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white disabled:opacity-60"
              >
                {submitting ? "Enregistrement..." : "Enregistrer le contrôle"}
              </button>
            )}
          </div>
        </div>

        <div className="xl:col-span-5">
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                Historique contrôles
              </h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                {checks.length}
              </span>
            </div>

            <div className="max-h-[35vh] space-y-3 overflow-y-auto pr-1">
              {loading && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Chargement...
                </div>
              )}

              {!loading && checks.length === 0 && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Aucun contrôle.
                </div>
              )}

              {checks.map((check) => (
                <div
                  key={check.id}
                  onClick={() => setSelectedCheck(check)}
                  className={`cursor-pointer rounded-xl border p-4 ${
                    Number(selectedCheck?.id) === Number(check.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold">{check.check_number}</div>
                      <div className="text-sm text-slate-500">
                        {check.warehouse?.name || "-"} • {check.check_date}
                      </div>
                    </div>
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold">
                      {check.status}
                    </span>
                  </div>

                  <div className="mt-2 text-sm">
                    Écart :{" "}
                    <strong className={Number(check.total_difference_value) < 0 ? "text-red-700" : "text-emerald-700"}>
                      {money(check.total_difference_value)} Ar
                    </strong>
                  </div>
                </div>
              ))}
            </div>

            {selectedCheck && (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-xl font-black">
                      {selectedCheck.check_number}
                    </div>
                    <div className="text-sm text-slate-500">
                      {selectedCheck.site?.name || "-"} • {selectedCheck.warehouse?.name || "-"}
                    </div>
                  </div>

                    <div className="flex flex-wrap gap-2">
                    {selectedCheck.status !== "validated" && (
                        <button
                        onClick={validateSelected}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                        >
                        Valider
                        </button>
                    )}

                    {selectedCheck.status === "validated" &&
                        selectedCheck.adjustment_status !== "adjusted" && (
                        <button
                            onClick={adjustSelectedStock}
                            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
                        >
                            Ajuster stock
                        </button>
                        )}

                    {selectedCheck.adjustment_status === "adjusted" && (
                        <span className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
                        Stock ajusté
                        </span>
                    )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-white p-3">
                    <div className="text-xs text-slate-500">Théorique</div>
                    <div className="font-bold">
                      {money(selectedCheck.total_theoretical_value)} Ar
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <div className="text-xs text-slate-500">Réel</div>
                    <div className="font-bold">
                      {money(selectedCheck.total_actual_value)} Ar
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <div className="text-xs text-slate-500">Écart</div>
                    <div className={`font-bold ${Number(selectedCheck.total_difference_value) < 0 ? "text-red-700" : "text-emerald-700"}`}>
                      {money(selectedCheck.total_difference_value)} Ar
                    </div>
                  </div>
                </div>

                <div className="mt-4 max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                  {(selectedCheck.lines || []).map((line) => (
                    <div key={line.id} className="rounded-xl bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold">
                            {line.product?.name || "-"}
                          </div>
                          <div className="text-xs text-slate-500">
                            Théorique {qty(line.theoretical_quantity)} / Réel {qty(line.actual_quantity)}
                          </div>
                        </div>

                        <span className={`rounded-lg px-2 py-1 text-xs font-bold ${badge(line.alert_level)}`}>
                          {line.alert_level}
                        </span>
                      </div>

                      <div className="mt-2 text-sm">
                        Écart :{" "}
                        <strong className={Number(line.difference_value) < 0 ? "text-red-700" : "text-emerald-700"}>
                          {money(line.difference_value)} Ar
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-white p-3">
                    <div className="text-xs text-slate-500">Statut ajustement</div>
                    <div className="font-bold">
                    {selectedCheck.adjustment_status || "not_adjusted"}
                    </div>
                </div>

                <div className="rounded-xl bg-white p-3">
                    <div className="text-xs text-slate-500">Mouvements créés</div>
                    <div className="font-bold">
                    {selectedCheck.adjustment_movement_count || 0}
                    </div>
                </div>

                <div className="rounded-xl bg-white p-3">
                    <div className="text-xs text-slate-500">Ajusté par</div>
                    <div className="font-bold">
                    {selectedCheck.adjusted_by?.name || selectedCheck.adjustedBy?.name || "-"}
                    </div>
                </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}