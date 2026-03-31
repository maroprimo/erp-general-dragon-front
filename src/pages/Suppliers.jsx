import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    code: "",
    company_name: "",
    contact_name: "",
    phone: "",
    email: "",
    whatsapp: "",
    address: "",
    city: "",
    country: "",
    payment_terms_days: "",
    notes: "",
    is_active: true,
  });

  const [editForm, setEditForm] = useState({
    code: "",
    company_name: "",
    contact_name: "",
    phone: "",
    email: "",
    whatsapp: "",
    address: "",
    city: "",
    country: "",
    payment_terms_days: "",
    notes: "",
    is_active: true,
  });

  const loadSuppliers = async () => {
    try {
      const res = await api.get("/suppliers");
      setSuppliers(res.data.data ?? res.data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les fournisseurs");
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const createSupplier = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        payment_terms_days: form.payment_terms_days ? Number(form.payment_terms_days) : null,
        is_active: Boolean(form.is_active),
      };

      const res = await api.post("/suppliers", payload);
      toast.success(res.data.message || "Fournisseur créé");

      setForm({
        code: "",
        company_name: "",
        contact_name: "",
        phone: "",
        email: "",
        whatsapp: "",
        address: "",
        city: "",
        country: "",
        payment_terms_days: "",
        notes: "",
        is_active: true,
      });

      loadSuppliers();
    } catch (err) {
      console.error(err);
      toast.error("Erreur création fournisseur");
    }
  };

  const startEdit = (supplier) => {
    setEditingId(supplier.id);
    setEditForm({
      code: supplier.code ?? "",
      company_name: supplier.company_name ?? "",
      contact_name: supplier.contact_name ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      whatsapp: supplier.whatsapp ?? "",
      address: supplier.address ?? "",
      city: supplier.city ?? "",
      country: supplier.country ?? "",
      payment_terms_days: supplier.payment_terms_days ?? "",
      notes: supplier.notes ?? "",
      is_active: !!supplier.is_active,
    });
  };

  const saveEdit = async (id) => {
    try {
      const payload = {
        ...editForm,
        payment_terms_days: editForm.payment_terms_days ? Number(editForm.payment_terms_days) : null,
        is_active: Boolean(editForm.is_active),
      };

      const res = await api.put(`/suppliers/${id}`, payload);
      toast.success(res.data.message || "Fournisseur mis à jour");
      setEditingId(null);
      loadSuppliers();
    } catch (err) {
      console.error(err);
      toast.error("Erreur mise à jour fournisseur");
    }
  };

  const toggleSupplier = async (id) => {
    try {
      const res = await api.patch(`/suppliers/${id}/toggle`);
      toast.success(res.data.message || "Statut modifié");
      loadSuppliers();
    } catch (err) {
      console.error(err);
      toast.error("Erreur changement statut");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Fournisseurs</h1>
        <p className="text-slate-500">
          Coordonnées, conditions de paiement et produits fournis.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Nouveau fournisseur</h2>

        <form onSubmit={createSupplier} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <input className="rounded-xl border p-3" placeholder="Code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
          <input className="rounded-xl border p-3" placeholder="Raison sociale" value={form.company_name} onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))} />
          <input className="rounded-xl border p-3" placeholder="Contact" value={form.contact_name} onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))} />
          <input className="rounded-xl border p-3" placeholder="Téléphone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          <input className="rounded-xl border p-3" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <input className="rounded-xl border p-3" placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))} />
          <input className="rounded-xl border p-3" placeholder="Adresse" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
          <input className="rounded-xl border p-3" placeholder="Ville" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
          <input className="rounded-xl border p-3" placeholder="Pays" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
          <input className="rounded-xl border p-3" type="number" placeholder="Délai paiement (jours)" value={form.payment_terms_days} onChange={(e) => setForm((p) => ({ ...p, payment_terms_days: e.target.value }))} />
          <input className="rounded-xl border p-3 xl:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            />
            Fournisseur actif
          </label>

          <button className="rounded-xl bg-slate-900 px-4 py-3 text-white xl:col-span-3">
            Enregistrer le fournisseur
          </button>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Liste des fournisseurs</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-slate-200">
              <tr className="text-slate-600">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Société</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Paiement</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {editingId === supplier.id ? (
                      <input className="rounded border p-2" value={editForm.code} onChange={(e) => setEditForm((p) => ({ ...p, code: e.target.value }))} />
                    ) : supplier.code}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === supplier.id ? (
                      <input className="rounded border p-2" value={editForm.company_name} onChange={(e) => setEditForm((p) => ({ ...p, company_name: e.target.value }))} />
                    ) : supplier.company_name}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === supplier.id ? (
                      <input className="rounded border p-2" value={editForm.contact_name} onChange={(e) => setEditForm((p) => ({ ...p, contact_name: e.target.value }))} />
                    ) : supplier.contact_name}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === supplier.id ? (
                      <input className="rounded border p-2" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
                    ) : supplier.phone}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === supplier.id ? (
                      <input className="rounded border p-2" value={editForm.whatsapp} onChange={(e) => setEditForm((p) => ({ ...p, whatsapp: e.target.value }))} />
                    ) : supplier.whatsapp}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === supplier.id ? (
                      <input className="rounded border p-2" type="number" value={editForm.payment_terms_days} onChange={(e) => setEditForm((p) => ({ ...p, payment_terms_days: e.target.value }))} />
                    ) : `${supplier.payment_terms_days ?? 0} j`}
                  </td>
                  <td className="px-4 py-3">{supplier.is_active ? "Actif" : "Inactif"}</td>
                  <td className="px-4 py-3 space-x-2">
                    {editingId === supplier.id ? (
                      <>
                        <button
                          onClick={() => saveEdit(supplier.id)}
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
                          onClick={() => startEdit(supplier)}
                          className="rounded-xl bg-blue-600 px-3 py-2 text-white"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => toggleSupplier(supplier.id)}
                          className="rounded-xl bg-amber-600 px-3 py-2 text-white"
                        >
                          Activer / Désactiver
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