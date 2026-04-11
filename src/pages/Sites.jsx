import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

export default function Sites() {
  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [form, setForm] = useState({
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
      toast.error("Impossible de charger les sites");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
  if (!logoFile) {
    setLogoPreview("");
    return;
  }

  const objectUrl = URL.createObjectURL(logoFile);
  setLogoPreview(objectUrl);

  return () => URL.revokeObjectURL(objectUrl);
}, [logoFile]);


  const toggleWarehouse = (id) => {
    setForm((prev) => {
      const exists = prev.warehouse_ids.includes(String(id));
      return {
        ...prev,
        warehouse_ids: exists
          ? prev.warehouse_ids.filter((x) => x !== String(id))
          : [...prev.warehouse_ids, String(id)],
      };
    });
  };

const submit = async (e) => {
  e.preventDefault();

  try {
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

    const res = await api.post("/sites", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    toast.success(res.data.message || "Site créé");

    setForm({
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
    });

    setLogoFile(null);
    setLogoPreview("");
    loadData();
  } catch (err) {
    console.error(err);
    toast.error(err?.response?.data?.message || "Erreur création site");
  }
};

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="xl:col-span-5">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h1 className="mb-4 text-3xl font-bold text-slate-800">Ajouter un site</h1>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input className="rounded-xl border p-3" placeholder="Code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
              <input className="rounded-xl border p-3" placeholder="Nom du site" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              <input className="rounded-xl border p-3" placeholder="Type de site" value={form.type_site} onChange={(e) => setForm((p) => ({ ...p, type_site: e.target.value }))} />
              <input className="rounded-xl border p-3" placeholder="Ville" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
              <input className="rounded-xl border p-3" placeholder="Téléphone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              <input className="rounded-xl border p-3" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              <input className="rounded-xl border p-3" placeholder="NIF" value={form.nif} onChange={(e) => setForm((p) => ({ ...p, nif: e.target.value }))} />
              <input className="rounded-xl border p-3" placeholder="STAT" value={form.stat} onChange={(e) => setForm((p) => ({ ...p, stat: e.target.value }))} />
              <input className="rounded-xl border p-3" placeholder="RCS" value={form.rcs} onChange={(e) => setForm((p) => ({ ...p, rcs: e.target.value }))} />
              <input className="rounded-xl border p-3" placeholder="Statut" value={form.status_label} onChange={(e) => setForm((p) => ({ ...p, status_label: e.target.value }))} />
            </div>

            <textarea
              className="w-full rounded-xl border p-3"
              placeholder="Adresse"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            />

            <div className="rounded-xl border p-4">
              <div className="mb-3 text-lg font-semibold text-slate-800">Dépôts liés au site</div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {warehouses.map((warehouse) => (
                  <label key={warehouse.id} className="flex items-center gap-2 rounded-lg border p-3">
                    <input
                      type="checkbox"
                      checked={form.warehouse_ids.includes(String(warehouse.id))}
                      onChange={() => toggleWarehouse(warehouse.id)}
                    />
                    {warehouse.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="rounded-xl border p-4">
            <div className="mb-3 text-lg font-semibold text-slate-800">Logo du site</div>

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

            <button className="rounded-xl bg-slate-900 px-4 py-3 text-white">
              Enregistrer le site
            </button>
          </form>
        </div>
      </div>

      <div className="xl:col-span-7">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-2xl font-bold text-slate-800">Sites enregistrés</h2>

          <div className="space-y-3">
            {sites.map((site) => (
              <div key={site.id} className="rounded-xl border p-4">
                {site.logo_url && (
                  <img
                    src={`https://stock.dragonroyalmg.com${site.logo_url}`}
                    alt={site.name}
                    className="mt-3 h-14 w-14 rounded-xl border object-cover"
                  />
                )}
                <div className="font-semibold text-slate-800">{site.name}</div>
                <div className="text-sm text-slate-500">
                  {site.code} — {site.phone || "-"} — {site.email || "-"}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  NIF: {site.nif || "-"} | STAT: {site.stat || "-"} | RCS: {site.rcs || "-"}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Dépôts: {(site.warehouses ?? []).length}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}