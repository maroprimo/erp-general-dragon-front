import { useEffect, useState } from "react";
import api from "../services/api";

export default function useReferences() {
  const [sites, setSites] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/references/sites"),
      api.get("/references/suppliers"),
      api.get("/references/products"),
      api.get("/references/warehouses"),
      api.get("/references/units"),
    ])
      .then(([sitesRes, suppliersRes, productsRes, warehousesRes, unitsRes]) => {
        setSites(sitesRes.data);
        setSuppliers(suppliersRes.data);
        setProducts(productsRes.data);
        setWarehouses(warehousesRes.data);
        setUnits(unitsRes.data);
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
    units,
    loading,
  };
}