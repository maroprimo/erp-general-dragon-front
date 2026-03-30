import { useEffect, useState } from "react";
import api from "../services/api";

export default function useReferences() {
  const [sites, setSites] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/references/sites"),
      api.get("/references/suppliers"),
      api.get("/references/products"),
      api.get("/references/warehouses"),
    ])
      .then(([sitesRes, suppliersRes, productsRes, warehousesRes]) => {
        setSites(sitesRes.data);
        setSuppliers(suppliersRes.data);
        setProducts(productsRes.data);
        setWarehouses(warehousesRes.data);
      })
      .catch((err) => {
        console.error("Erreur chargement références", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return {
    sites,
    suppliers,
    products,
    warehouses,
    loading,
  };
}