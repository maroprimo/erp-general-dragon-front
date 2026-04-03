import { useEffect, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import toast from "react-hot-toast";

export default function ProductsCatalog() {
  const { suppliers, units, loading } = useReferences();
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);

  const [form, setForm] = useState({
    code: "",
    barcode: "",
    name: "",
    short_name: "",
    category_id: "",
    product_type: "",
    purchase_unit_id: "",
    stock_unit_id: "",
    production_unit_id: "",
    sale_unit_id: "",
    main_supplier_id: "",
    shelf_life_days: "",
    min_stock: "",
    max_stock: "",
    safety_stock: "",
    reorder_point: "",
    reorder_qty: "",
    storage_condition: "",
    origin: "",
    genre: "",
    category_type: "",
    nature: "",
    cold_type: "",
    valuation_method: "",
    default_storage_location_id: "",
    has_batch: false,
    has_expiry_date: false,
    is_active: true,
  });

  const [image, setImage] = useState(null);

const loadData = async () => {
    try {
        // On lance les appels
        const [catRes, locRes, prodRes] = await Promise.all([
            api.get("/references/categories"),
            api.get("/references/storage-locations"),
            api.get("/products-catalog")
        ]);

        // On vérifie et on assigne les données
        if (catRes.data) setCategories(catRes.data);
        if (locRes.data) setLocations(locRes.data);
        
        // Pour la pagination Laravel, les produits sont dans .data.data
        const actualProducts = prodRes.data?.data || prodRes.data || [];
        setProducts(actualProducts);

    } catch (err) {
        // On n'affiche l'erreur que si ce n'est pas un simple problème de montage
        if (err.response) {
            console.error("Erreur API Détails:", err.response.status, err.config.url);
        } else {
            console.error("Erreur JS interne:", err.message);
        }
        // Ne mettez le toast que si c'est vraiment bloquant
        // toast.error("Erreur de chargement"); 
    }
};

  useEffect(() => {
    loadData();
  }, []);

  const submit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value ?? "");
      });

      formData.set("has_batch", form.has_batch ? 1 : 0);
      formData.set("has_expiry_date", form.has_expiry_date ? 1 : 0);
      formData.set("is_active", form.is_active ? 1 : 0);

      if (image) {
        formData.append("image", image);
      }

      const res = await api.post("/products-catalog", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(res.data.message || "Produit créé");
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Erreur création produit");
    }
  };

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Gestion des Produits</h1>
        <p className="text-slate-500">Catalogue indépendant du POS achat.</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
<form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
  {/* --- Informations de base --- */}
  <input className="rounded-xl border p-3" placeholder="Code" onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
  <input className="rounded-xl border p-3" placeholder="Code-barres" onChange={(e) => setForm((p) => ({ ...p, barcode: e.target.value }))} />
  <input className="rounded-xl border p-3" placeholder="Nom" onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
  <input className="rounded-xl border p-3" placeholder="Nom court" onChange={(e) => setForm((p) => ({ ...p, short_name: e.target.value }))} />

  {/* --- Types et Catégories --- */}
  <select className="rounded-xl border p-3" required onChange={(e) => setForm((p) => ({ ...p, product_type: e.target.value }))}>
    <option value="">Type de produit</option>
    <option value="storable">Stockable</option>
    <option value="consumable">Consommable</option>
    <option value="service">Service</option>
  </select>

<select 
  className="rounded-xl border p-3" 
  required // Force l'utilisateur à choisir une catégorie existante
  onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
>
  <option value="">-- Choisir une catégorie --</option>
  {categories.map((c) => (
    <option key={c.id} value={c.id}>
      {c.name}
    </option>
  ))}
</select>

  {/* --- Gestion des Unités (Crucial pour éviter l'erreur 500) --- */}
  <select className="rounded-xl border p-3" required onChange={(e) => setForm((p) => ({ ...p, purchase_unit_id: e.target.value }))}>
    <option value="">Unité d'achat</option>
    {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
  </select>

  <select className="rounded-xl border p-3" required onChange={(e) => setForm((p) => ({ ...p, stock_unit_id: e.target.value }))}>
    <option value="">Unité de stock</option>
    {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
  </select>

  {/* --- Fournisseur et Emplacement --- */}
  <select className="rounded-xl border p-3" onChange={(e) => setForm((p) => ({ ...p, main_supplier_id: e.target.value }))}>
    <option value="">Fournisseur principal</option>
    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
  </select>

  <select className="rounded-xl border p-3" onChange={(e) => setForm((p) => ({ ...p, default_storage_location_id: e.target.value }))}>
    <option value="">Emplacement par défaut</option>
    {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
  </select>
    <select 
    className="rounded-xl border p-3" 
    required 
    onChange={(e) => setForm((p) => ({ ...p, valuation_method: e.target.value }))}
  >
    <option value="">Méthode de valorisation</option>
    <option value="FIFO">FIFO (Premier entré, premier sorti)</option>
    <option value="LIFO">LIFO (Dernier entré, premier sorti)</option>
    <option value="AVCO">AVCO (Coût unitaire moyen pondéré)</option>
  </select>

  {/* --- Caractéristiques Produit --- */}
  <input className="rounded-xl border p-3" placeholder="Origine" onChange={(e) => setForm((p) => ({ ...p, origin: e.target.value }))} />
  <input className="rounded-xl border p-3" placeholder="Genre" onChange={(e) => setForm((p) => ({ ...p, genre: e.target.value }))} />
  <input className="rounded-xl border p-3" placeholder="Type catégorie" onChange={(e) => setForm((p) => ({ ...p, category_type: e.target.value }))} />
  <input className="rounded-xl border p-3" placeholder="Nature" onChange={(e) => setForm((p) => ({ ...p, nature: e.target.value }))} />
  <input className="rounded-xl border p-3" placeholder="Type froid" onChange={(e) => setForm((p) => ({ ...p, cold_type: e.target.value }))} />
  <input className="rounded-xl border p-3" placeholder="Condition stockage" onChange={(e) => setForm((p) => ({ ...p, storage_condition: e.target.value }))} />

  {/* --- Paramètres de Stock --- */}
  <input type="number" className="rounded-xl border p-3" placeholder="Stock Min" onChange={(e) => setForm((p) => ({ ...p, min_stock: e.target.value }))} />
  <input type="number" className="rounded-xl border p-3" placeholder="Stock Max" onChange={(e) => setForm((p) => ({ ...p, max_stock: e.target.value }))} />

  {/* --- Image --- */}
  <div className="flex flex-col justify-center rounded-xl border border-dashed p-2">
    <span className="mb-1 text-xs text-gray-500">Image du produit</span>
    <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
  </div>

  <button type="submit" className="rounded-xl bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-800 xl:col-span-4">
    Enregistrer le produit
  </button>
</form>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {products.map((product) => (
          <div key={product.id} className="rounded-2xl bg-white p-4 shadow">
            {product.image_url ? (
            <img 
              src={`https://stock.dragonroyalmg.com/uploads/${product.image_path}`} 
              alt={product.name} 
              className="w-20 h-20 object-cover"
            />
            ) : (
              <div className="mb-3 flex h-40 w-full items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                Pas d’image
              </div>
            )}

            <div className="font-semibold text-slate-800">{product.name}</div>
            <div className="text-sm text-slate-500">{product.code}</div>
            <div className="mt-2 text-xs text-slate-500">{product.origin} / {product.genre}</div>
            <div className="text-xs text-slate-500">{product.nature} / {product.cold_type}</div>
          </div>
        ))}
      </div>
    </div>
  );
}