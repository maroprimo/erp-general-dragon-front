import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

  const openPrint = (type, id) => {
  const base = import.meta.env.VITE_BACKEND_WEB_URL || "";
  window.open(`${base}/print/${type}/${id}`, "_blank");
};
function InvoiceModal({ open, onClose, purchaseOrders, goodsReceipts, suppliers, sites, onSaved }) {
  const [form, setForm] = useState({
    supplier_id: "",
    site_id: "",
    purchase_order_id: "",
    goods_receipt_id: "",
    supplier_invoice_ref: "",
    amount_ht: "",
    amount_tva: "",
    amount_ttc: "",
    invoice_date: "",
    due_date: "",
    notes: "",
  });

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        supplier_id: Number(form.supplier_id),
        site_id: Number(form.site_id),
        purchase_order_id: form.purchase_order_id ? Number(form.purchase_order_id) : null,
        goods_receipt_id: form.goods_receipt_id ? Number(form.goods_receipt_id) : null,
        supplier_invoice_ref: form.supplier_invoice_ref || null,
        amount_ht: Number(form.amount_ht),
        amount_tva: form.amount_tva ? Number(form.amount_tva) : 0,
        amount_ttc: Number(form.amount_ttc),
        invoice_date: form.invoice_date || null,
        due_date: form.due_date || null,
        notes: form.notes || "",
      };

      const res = await api.post("/purchase-documents/invoice", payload);
      toast.success(res.data.message || "Facture créée");
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erreur création facture");
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Nouvelle facture fournisseur</h2>

        <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <select className="rounded-xl border p-3" value={form.supplier_id} onChange={(e) => setForm((p) => ({ ...p, supplier_id: e.target.value }))}>
            <option value="">Fournisseur</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.company_name}
              </option>
            ))}
          </select>

          <select className="rounded-xl border p-3" value={form.site_id} onChange={(e) => setForm((p) => ({ ...p, site_id: e.target.value }))}>
            <option value="">Site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>

          <select className="rounded-xl border p-3" value={form.purchase_order_id} onChange={(e) => setForm((p) => ({ ...p, purchase_order_id: e.target.value }))}>
            <option value="">BC lié</option>
            {purchaseOrders.map((po) => (
              <option key={po.id} value={po.id}>
                {po.order_number}
              </option>
            ))}
          </select>

          <select className="rounded-xl border p-3" value={form.goods_receipt_id} onChange={(e) => setForm((p) => ({ ...p, goods_receipt_id: e.target.value }))}>
            <option value="">BR lié</option>
            {goodsReceipts.map((gr) => (
              <option key={gr.id} value={gr.id}>
                {gr.receipt_number}
              </option>
            ))}
          </select>

          <input className="rounded-xl border p-3" placeholder="Référence facture fournisseur" value={form.supplier_invoice_ref} onChange={(e) => setForm((p) => ({ ...p, supplier_invoice_ref: e.target.value }))} />
          <input className="rounded-xl border p-3" type="datetime-local" value={form.invoice_date} onChange={(e) => setForm((p) => ({ ...p, invoice_date: e.target.value }))} />

          <input className="rounded-xl border p-3" type="number" placeholder="Montant HT" value={form.amount_ht} onChange={(e) => setForm((p) => ({ ...p, amount_ht: e.target.value }))} />
          <input className="rounded-xl border p-3" type="number" placeholder="TVA" value={form.amount_tva} onChange={(e) => setForm((p) => ({ ...p, amount_tva: e.target.value }))} />

          <input className="rounded-xl border p-3" type="number" placeholder="Montant TTC" value={form.amount_ttc} onChange={(e) => setForm((p) => ({ ...p, amount_ttc: e.target.value }))} />
          <input className="rounded-xl border p-3" type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />

          <input className="rounded-xl border p-3 md:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />

          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-300 px-4 py-2 text-slate-800">
              Annuler
            </button>
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-white">
              Créer facture
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PurchaseDocuments() {
  const [data, setData] = useState({
    purchase_orders: [],
    goods_receipts: [],
    supplier_invoices: [],
  });
  const [suppliers, setSuppliers] = useState([]);
  const [sites, setSites] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  const loadDocuments = async () => {
    try {
      const res = await api.get("/purchase-documents");
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les documents");
    }
  };

  const loadRefs = async () => {
    try {
      const [supRes, siteRes] = await Promise.all([
        api.get("/references/suppliers"),
        api.get("/references/sites"),
      ]);

      setSuppliers(supRes.data ?? []);
      setSites(siteRes.data ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDocuments();
    loadRefs();
  }, []);

  const validateInvoice = async (id) => {
    try {
      const res = await api.patch(`/purchase-documents/invoice/${id}/validate`);
      toast.success(res.data.message || "Facture validée");
      loadDocuments();
    } catch (err) {
      console.error(err);
      console.log(typeof openPrint);
      toast.error("Erreur validation facture");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Documents achats</h1>
          <p className="text-slate-500">
            Suivi complet des BC, BR et factures fournisseurs.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="rounded-xl bg-slate-900 px-4 py-2 text-white"
        >
          Nouvelle facture
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">Bons de commande</h2>
          <div className="space-y-3">
            {(data.purchase_orders ?? []).map((po) => (
              <div key={po.id} className="rounded-xl border border-slate-200 p-4">
                <div className="font-semibold text-slate-800">{po.order_number}</div>
                <div className="text-sm text-slate-500">
                  {po.supplier?.company_name ?? "-"} / {po.site?.name ?? "-"}
                </div>
                <div className="text-sm text-slate-500">
                  Statut doc : {po.document_status ?? "-"}
                </div>
                <div className="text-sm text-slate-500">
                  Réf facture : {po.supplier_invoice_ref ?? "-"}
                </div>
                <button
                  onClick={() => openPrint("purchase-order", po.id)}
                  className="mt-3 rounded-xl bg-slate-900 px-3 py-2 text-white"
                >
                  Imprimer
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">Bons de réception</h2>
          <div className="space-y-3">
            {(data.goods_receipts ?? []).map((gr) => (
              <div key={gr.id} className="rounded-xl border border-slate-200 p-4">
                <div className="font-semibold text-slate-800">{gr.receipt_number}</div>
                <div className="text-sm text-slate-500">
                  {gr.purchase_order?.supplier?.company_name ?? "-"} / {gr.site?.name ?? "-"}
                </div>
                <div className="text-sm text-slate-500">
                  Réf facture : {gr.supplier_invoice_ref ?? "-"}
                </div>
                <div className="text-sm text-slate-500">
                  Date : {gr.document_date ? new Date(gr.document_date).toLocaleString() : "-"}
                </div>
                <button
                onClick={() => openPrint("goods-receipt", gr.id)}
                className="mt-3 rounded-xl bg-slate-900 px-3 py-2 text-white"
              >
                Imprimer
              </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">Factures fournisseurs</h2>
          <div className="space-y-3">
            {(data.supplier_invoices ?? []).map((inv) => (
              <div key={inv.id} className="rounded-xl border border-slate-200 p-4">
                <div className="font-semibold text-slate-800">{inv.invoice_number}</div>
                <div className="text-sm text-slate-500">
                  {inv.supplier?.company_name ?? "-"} / {inv.site?.name ?? "-"}
                </div>
                <div className="text-sm text-slate-500">
                  Réf fournisseur : {inv.supplier_invoice_ref ?? "-"}
                </div>
                <div className="text-sm text-slate-500">
                  TTC : {inv.amount_ttc} Ar / Statut : {inv.status}
                </div>

                {inv.status !== "validated" && (
                  <button
                    onClick={() => validateInvoice(inv.id)}
                    className="mt-3 rounded-xl bg-emerald-700 px-3 py-2 text-white"
                  >
                    Valider
                  </button>
                )}
                <button
                onClick={() => openPrint("supplier-invoice", inv.id)}
                className="mt-3 mr-2 rounded-xl bg-slate-900 px-3 py-2 text-white"
              >
                Imprimer
              </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <InvoiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        purchaseOrders={data.purchase_orders ?? []}
        goodsReceipts={data.goods_receipts ?? []}
        suppliers={suppliers}
        sites={sites}
        onSaved={() => {
          setModalOpen(false);
          loadDocuments();
        }}
      />
    </div>
  );
}