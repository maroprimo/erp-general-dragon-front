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

export default function Suppliers() {
  const { user } = useAuth();
  const isStockSiteUser = user?.role === "stock";
  const canManageSuppliers = !isStockSiteUser;

  const [suppliers, setSuppliers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

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
      setSuppliers(asArray(res.data));
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les fournisseurs");
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const haystack = [
        supplier.code,
        supplier.company_name,
        supplier.contact_name,
        supplier.phone,
        supplier.email,
        supplier.whatsapp,
        supplier.city,
        supplier.country,
        supplier.notes,
        supplier.is_active ? "actif" : "inactif",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return search ? haystack.includes(search.toLowerCase()) : true;
    });
  }, [suppliers, search]);

  const createSupplier = async (e) => {
    e.preventDefault();

    if (!canManageSuppliers) {
      toast.error("Accès en consultation uniquement");
      return;
    }

    try {
      const payload = {
        ...form,
        payment_terms_days: form.payment_terms_days
          ? Number(form.payment_terms_days)
          : null,
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
      toast.error(err?.response?.data?.message || "Erreur création fournisseur");
    }
  };

  const startEdit = (supplier) => {
    if (!canManageSuppliers) {
      toast.error("Accès en consultation uniquement");
      return;
    }

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
    if (!canManageSuppliers) {
      toast.error("Accès en consultation uniquement");
      return;
    }

    try {
      const payload = {
        ...editForm,
        payment_terms_days: editForm.payment_terms_days
          ? Number(editForm.payment_terms_days)
          : null,
        is_active: Boolean(editForm.is_active),
      };

      const res = await api.put(`/suppliers/${id}`, payload);
      toast.success(res.data.message || "Fournisseur mis à jour");
      setEditingId(null);
      loadSuppliers();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur mise à jour fournisseur");
    }
  };

  const toggleSupplier = async (id) => {
    if (!canManageSuppliers) {
      toast.error("Accès en consultation uniquement");
      return;
    }

    try {
      const res = await api.patch(`/suppliers/${id}/toggle`);
      toast.success(res.data.message || "Statut modifié");
      loadSuppliers();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur changement statut");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Fournisseurs</h1>
        <p className="text-slate-500">
          Coordonnées, conditions de paiement et produits fournis.
        </p>
        {isStockSiteUser && (
          <p className="mt-2 text-sm text-amber-700">
            Accès en consultation uniquement pour le profil stock.
          </p>
        )}
      </div>

      {!isStockSiteUser && (
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-2xl font-bold text-slate-800">
            Nouveau fournisseur
          </h2>

          <form
            onSubmit={createSupplier}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            <input
              className="rounded-xl border p-3"
              placeholder="Code"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            />
            <input
              className="rounded-xl border p-3"
              placeholder="Raison sociale"
              value={form.company_name}
              onChange={(e) =>
                setForm((p) => ({ ...p, company_name: e.target.value }))
              }
            />
            <input
              className="rounded-xl border p-3"
              placeholder="Contact"
              value={form.contact_name}
              onChange={(e) =>
                setForm((p) => ({ ...p, contact_name: e.target.value }))
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
              placeholder="WhatsApp"
              value={form.whatsapp}
              onChange={(e) =>
                setForm((p) => ({ ...p, whatsapp: e.target.value }))
              }
            />
            <input
              className="rounded-xl border p-3"
              placeholder="Adresse"
              value={form.address}
              onChange={(e) =>
                setForm((p) => ({ ...p, address: e.target.value }))
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
              type="number"
              placeholder="Délai paiement (jours)"
              value={form.payment_terms_days}
              onChange={(e) =>
                setForm((p) => ({ ...p, payment_terms_days: e.target.value }))
              }
            />
            <input
              className="rounded-xl border p-3 xl:col-span-2"
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((p) => ({ ...p, is_active: e.target.checked }))
                }
              />
              Fournisseur actif
            </label>

            <button className="rounded-xl bg-slate-900 px-4 py-3 text-white xl:col-span-3">
              Enregistrer le fournisseur
            </button>
          </form>
        </div>
      )}

      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-slate-800">
            Liste des fournisseurs
          </h2>

          <input
            className="w-full rounded-xl border p-3 md:w-80"
            placeholder="Rechercher un fournisseur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-slate-200">
              <tr className="text-slate-600">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Société</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Ville</th>
                <th className="px-4 py-3">Paiement</th>
                <th className="px-4 py-3">Statut</th>
                {canManageSuppliers && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((supplier) => (
                <tr
                  key={supplier.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    {editingId === supplier.id ? (
                      <input
                        className="rounded border p-2"
                        value={editForm.code}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, code: e.target.value }))
                        }
                      />
                    ) : (
                      supplier.code || "-"
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === supplier.id ? (
                      <input
                        className="rounded border p-2"
                        value={editForm.company_name}
                        onChange={(e) =>
                          setEditForm((p) => ({
                            ...p,
                            company_name: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      supplier.company_name || "-"
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === supplier.id ? (
                      <input
                        className="rounded border p-2"
                        value={editForm.contact_name}
                        onChange={(e) =>
                          setEditForm((p) => ({
                            ...p,
                            contact_name: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      supplier.contact_name || "-"
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === supplier.id ? (
                      <input
                        className="rounded border p-2"
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, phone: e.target.value }))
                        }
                      />
                    ) : (
                      supplier.phone || "-"
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === supplier.id ? (
                      <input
                        className="rounded border p-2"
                        value={editForm.whatsapp}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, whatsapp: e.target.value }))
                        }
                      />
                    ) : (
                      supplier.whatsapp || "-"
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === supplier.id ? (
                      <input
                        className="rounded border p-2"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, email: e.target.value }))
                        }
                      />
                    ) : (
                      supplier.email || "-"
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === supplier.id ? (
                      <input
                        className="rounded border p-2"
                        value={editForm.city}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, city: e.target.value }))
                        }
                      />
                    ) : (
                      supplier.city || "-"
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === supplier.id ? (
                      <input
                        className="rounded border p-2"
                        type="number"
                        value={editForm.payment_terms_days}
                        onChange={(e) =>
                          setEditForm((p) => ({
                            ...p,
                            payment_terms_days: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      `${supplier.payment_terms_days ?? 0} j`
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                        supplier.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {supplier.is_active ? "Actif" : "Inactif"}
                    </span>
                  </td>

                  {canManageSuppliers && (
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
                  )}
                </tr>
              ))}

              {filteredSuppliers.length === 0 && (
                <tr>
                  <td
                    colSpan={canManageSuppliers ? 10 : 9}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Aucun fournisseur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}