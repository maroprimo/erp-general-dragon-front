import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import useReferences from "../hooks/useReferences";
import { useAuth } from "../context/AuthContext";
import { formatDateTime, formatQty, formatMoney } from "../utils/formatters";

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function roundQty(value, precision = 10) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(precision));
}

function numberToInput(value, precision = 8) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return num.toFixed(precision).replace(/\.?0+$/, "");
}

function emptyLine() {
  return {
    product_id: "",
    display_quantity: "",
    display_unit_id: "",
    requested_quantity: "",
    notes: "",
  };
}

function workflowBadgeClass(status) {
  switch (status) {
    case "waiting_storekeeper":
      return "bg-slate-100 text-slate-700";
    case "source_issued":
      return "bg-amber-100 text-amber-700";
    case "kitchen_received":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function statusBadgeClass(status) {
  switch (status) {
    case "pending":
      return "bg-slate-100 text-slate-700";
    case "issued":
      return "bg-blue-100 text-blue-700";
    case "received":
      return "bg-emerald-100 text-emerald-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function buildSpaPageUrl(page, extraParams = {}) {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);

  params.set("page", page);
  params.delete("open_page");

  Object.entries(extraParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });

  return `${url.origin}${url.pathname}?${params.toString()}`;
}

function getFromWarehouse(issue) {
  return issue?.from_warehouse || issue?.fromWarehouse || null;
}

function getToWarehouse(issue) {
  return issue?.to_warehouse || issue?.toWarehouse || null;
}

function getRequestedBy(issue) {
  return issue?.requested_by || issue?.requestedBy || null;
}

function getIssuedBy(issue) {
  return issue?.issued_by || issue?.issuedBy || null;
}

function getReceivedBy(issue) {
  return issue?.received_by || issue?.receivedBy || null;
}

function getScanEvents(issue) {
  return issue?.scan_events || issue?.scanEvents || [];
}

function buildPrintUrl(issue) {
  const backendWeb = import.meta.env.VITE_BACKEND_WEB_URL || "";
  const backendWebWithIndex = backendWeb.includes("/index.php")
    ? backendWeb
    : `${backendWeb}/index.php`;

  return issue?.print_url || `${backendWebWithIndex}/print/kitchen-issue/${issue.id}`;
}

function buildScanUrl(issue) {
  return buildSpaPageUrl("kitchenIssueScanMobile", {
    scan_token: issue?.qr_token || "",
  });
}

export default function KitchenIssues() {
  const { user } = useAuth();
const {
  sites,
  warehouses,
  products,
  units: hookUnits = [],
  loading: refsLoading,
} = useReferences();

const [fullUnits, setFullUnits] = useState([]);

  const isRestrictedSiteUser = ["stock", "cuisine"].includes(user?.role);
  const restrictedSiteId = user?.site_id ? String(user.site_id) : "";

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [filters, setFilters] = useState({
    site_id: "",
    search: "",
    status: "",
  });

  const [form, setForm] = useState({
    site_id: "",
    from_warehouse_id: "",
    to_warehouse_id: "",
    notes: "",
    lines: [emptyLine()],
  });


  useEffect(() => {
  let mounted = true;

  const loadFullUnits = async () => {
    try {
      const res = await api.get("/units");
      const rows = asArray(res.data);

      if (mounted && Array.isArray(rows)) {
        setFullUnits(rows);
      }
    } catch (err) {
      console.error("Erreur chargement complet des unités:", err);
      if (mounted) {
        setFullUnits([]);
      }
    }
  };

  loadFullUnits();

  return () => {
    mounted = false;
  };
}, []);
  const isEditing = editingId !== null;
const effectiveUnits = useMemo(() => {
  return fullUnits.length > 0 ? fullUnits : hookUnits;
}, [fullUnits, hookUnits]);

const parseRatioValue = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const cleaned = String(value)
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".");

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};
const unitsById = useMemo(() => {
  const map = new Map();

  (effectiveUnits ?? []).forEach((unit) => {
    map.set(Number(unit.id), unit);
  });

  return map;
}, [effectiveUnits]);

  const productsById = useMemo(() => {
    const map = new Map();
    (products ?? []).forEach((product) => {
      map.set(Number(product.id), product);
    });
    return map;
  }, [products]);

  const getUnitModel = (unitId) => {
    return unitsById.get(Number(unitId)) || null;
  };

  const getUnitLabel = (unit) => {
    if (!unit) return "";
    return (
      unit.abbreviation ||
      unit.symbol ||
      unit.code ||
      unit.short_name ||
      unit.name ||
      ""
    );
  };

const getUnitRatio = (unit) => {
  if (!unit) return 1;

  const candidates = [
    unit.ratio,
    unit.ratio_base,
    unit.base_ratio,
    unit.conversion_ratio,
    unit.conversion_factor,
    unit.value,
  ];

  for (const candidate of candidates) {
    const parsed = parseRatioValue(candidate);
    if (parsed !== null && parsed > 0) {
      return parsed;
    }
  }

  return 1;
};

  const getProductById = (productId) => {
    return productsById.get(Number(productId)) || null;
  };

  const getProductUnitId = (product, type) => {
    if (!product) return "";
    return (
      product?.[`${type}_unit_id`] ||
      product?.[`${type}UnitId`] ||
      product?.[`${type}_unit`]?.id ||
      product?.[`${type}Unit`]?.id ||
      ""
    );
  };

  const getProductStockUnitId = (product) => {
    return (
      getProductUnitId(product, "stock") ||
      getProductUnitId(product, "purchase") ||
      getProductUnitId(product, "sale") ||
      getProductUnitId(product, "production") ||
      ""
    );
  };

const getProductEntryUnitIds = (product) => {
  if (!product) return [];

  const ordered = [
    product.purchase_unit_id,
    product.sale_unit_id,
    product.stock_unit_id,
    product.production_unit_id,
  ]
    .filter(Boolean)
    .map((id) => Number(id));

  const unique = [...new Set(ordered)];

  return unique.filter((id) => unitsById.has(Number(id)));
};

  const getPreferredEntryUnitId = (product) => {
    const ids = getProductEntryUnitIds(product);
    return ids.length ? String(ids[0]) : String(getProductStockUnitId(product) || "");
  };

  const convertQuantity = (value, fromUnitId, toUnitId) => {
    const qty = Number(value || 0);
    if (!Number.isFinite(qty)) return 0;

    const fromUnit = getUnitModel(fromUnitId);
    const toUnit = getUnitModel(toUnitId);

    if (!fromUnit || !toUnit) return qty;

    const fromRatio = getUnitRatio(fromUnit);
    const toRatio = getUnitRatio(toUnit);

    return roundQty((qty * fromRatio) / toRatio, 10);
  };

  const getLineProduct = (line) => getProductById(line.product_id);

  const getLineEntryUnit = (line) => {
    const product = getLineProduct(line);
    const unitId = line.display_unit_id || getPreferredEntryUnitId(product);
    return getUnitModel(unitId);
  };

  const getLineStockUnit = (line) => {
    const product = getLineProduct(line);
    return getUnitModel(getProductStockUnitId(product));
  };

  const getLineConversionPreview = (line) => {
  const entryUnit = getLineEntryUnit(line);
  const stockUnit = getLineStockUnit(line);

  if (!entryUnit || !stockUnit) return "-";

  const converted = convertQuantity(1, entryUnit.id, stockUnit.id);

  return `1 ${getUnitLabel(entryUnit)} = ${formatQty(converted)} ${getUnitLabel(stockUnit)}`;
};

  const computeRequestedQuantity = (line) => {
    const product = getLineProduct(line);
    if (!product) return Number(line.requested_quantity || 0);

    const entryUnitId = line.display_unit_id || getPreferredEntryUnitId(product);
    const stockUnitId = getProductStockUnitId(product);
    const qty = Number(line.display_quantity || 0);

    if (!Number.isFinite(qty) || qty <= 0) return 0;
    if (!entryUnitId || !stockUnitId) return roundQty(qty, 10);

    return convertQuantity(qty, entryUnitId, stockUnitId);
  };

  const getConversionHint = (line) => {
    const entryUnit = getLineEntryUnit(line);
    const stockUnit = getLineStockUnit(line);

    if (!entryUnit || !stockUnit) return "";

    const oneEntryInStock = convertQuantity(1, entryUnit.id, stockUnit.id);
    if (!Number.isFinite(oneEntryInStock)) return "";

    return `1 ${getUnitLabel(entryUnit)} = ${formatQty(oneEntryInStock)} ${getUnitLabel(stockUnit)}`;
  };

  const buildLineFromExisting = (rawLine) => {
    const product = getProductById(rawLine.product_id);
    const preferredEntryUnitId = getPreferredEntryUnitId(product);
    const stockUnitId = getProductStockUnitId(product);
    const stockQty = Number(rawLine.requested_quantity ?? 0);

    let displayQuantity = "";
    if (stockQty > 0) {
      if (preferredEntryUnitId && stockUnitId) {
        displayQuantity = numberToInput(
          convertQuantity(stockQty, stockUnitId, preferredEntryUnitId),
          8
        );
      } else {
        displayQuantity = numberToInput(stockQty, 8);
      }
    }

    return {
      product_id: rawLine.product_id ? String(rawLine.product_id) : "",
      display_unit_id: preferredEntryUnitId || "",
      display_quantity: displayQuantity,
      requested_quantity:
        rawLine.requested_quantity !== null &&
        rawLine.requested_quantity !== undefined
          ? String(rawLine.requested_quantity)
          : "",
      notes: rawLine.notes || "",
    };
  };

  const visibleSites = useMemo(() => {
    if (isRestrictedSiteUser) {
      return (sites ?? []).filter((s) => Number(s.id) === Number(restrictedSiteId));
    }
    return sites ?? [];
  }, [sites, isRestrictedSiteUser, restrictedSiteId]);

  const effectiveFormSiteId =
    form.site_id || (isRestrictedSiteUser ? restrictedSiteId : "");

  const currentSiteWarehouses = useMemo(() => {
    if (!effectiveFormSiteId) return warehouses ?? [];
    return (warehouses ?? []).filter(
      (w) => Number(w.site_id) === Number(effectiveFormSiteId)
    );
  }, [warehouses, effectiveFormSiteId]);

  const visibleIssues = useMemo(() => {
    if (!isRestrictedSiteUser || !restrictedSiteId) return issues;
    return issues.filter(
      (issue) => Number(issue.site_id) === Number(restrictedSiteId)
    );
  }, [issues, isRestrictedSiteUser, restrictedSiteId]);

  const selectedIssue = useMemo(() => {
    return visibleIssues.find((item) => Number(item.id) === Number(selectedId)) || null;
  }, [visibleIssues, selectedId]);

  const filteredIssues = useMemo(() => {
    const effectiveFilterSiteId = isRestrictedSiteUser
      ? restrictedSiteId
      : filters.site_id;

    return visibleIssues.filter((issue) => {
      const fromWarehouse = getFromWarehouse(issue);
      const toWarehouse = getToWarehouse(issue);

      const siteOk = effectiveFilterSiteId
        ? Number(issue.site_id) === Number(effectiveFilterSiteId)
        : true;

      const statusOk = filters.status ? issue.status === filters.status : true;

      const haystack = [
        issue.issue_number,
        issue.site?.name,
        fromWarehouse?.name,
        toWarehouse?.name,
        issue.notes,
        issue.status,
        issue.workflow_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const searchOk = filters.search
        ? haystack.includes(filters.search.toLowerCase())
        : true;

      return siteOk && statusOk && searchOk;
    });
  }, [visibleIssues, filters, isRestrictedSiteUser, restrictedSiteId]);

  const loadIssues = async () => {
    try {
      setLoading(true);
      const res = await api.get("/kitchen-issues");
      const rows = asArray(res.data);
      setIssues(rows);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les BSC");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, []);

  useEffect(() => {
    if (!selectedId && filteredIssues.length > 0) {
      setSelectedId(filteredIssues[0].id);
      return;
    }

    if (selectedId) {
      const exists = filteredIssues.some(
        (item) => Number(item.id) === Number(selectedId)
      );
      if (!exists) {
        setSelectedId(filteredIssues[0]?.id ?? null);
      }
    }
  }, [filteredIssues, selectedId]);

  useEffect(() => {
    if (refsLoading) return;

    const preferredSite =
      (sites ?? []).find((s) => Number(s.id) === Number(user?.site_id)) ||
      (sites ?? []).find((s) => s.is_default) ||
      (sites ?? [])[0] ||
      null;

    if (!preferredSite) return;

    const siteIdToUse = isRestrictedSiteUser
      ? String(preferredSite.id)
      : form.site_id || String(preferredSite.id);

    const siteWarehouses = (warehouses ?? []).filter(
      (w) => Number(w.site_id) === Number(siteIdToUse)
    );

    setForm((prev) => ({
      ...prev,
      site_id: siteIdToUse,
      from_warehouse_id:
        prev.from_warehouse_id &&
        siteWarehouses.some((w) => Number(w.id) === Number(prev.from_warehouse_id))
          ? prev.from_warehouse_id
          : siteWarehouses[0]?.id
          ? String(siteWarehouses[0].id)
          : "",
      to_warehouse_id:
        prev.to_warehouse_id &&
        siteWarehouses.some((w) => Number(w.id) === Number(prev.to_warehouse_id))
          ? prev.to_warehouse_id
          : siteWarehouses[1]?.id
          ? String(siteWarehouses[1].id)
          : siteWarehouses[0]?.id
          ? String(siteWarehouses[0].id)
          : "",
    }));

    setFilters((prev) => ({
      ...prev,
      site_id: isRestrictedSiteUser
        ? String(preferredSite.id)
        : prev.site_id || String(preferredSite.id),
    }));
  }, [refsLoading, sites, warehouses, user, isRestrictedSiteUser, form.site_id]);

  useEffect(() => {
    if (!effectiveFormSiteId) return;

    const sameSiteWarehouses = (warehouses ?? []).filter(
      (w) => Number(w.site_id) === Number(effectiveFormSiteId)
    );

    const fromValid = sameSiteWarehouses.some(
      (w) => Number(w.id) === Number(form.from_warehouse_id)
    );
    const toValid = sameSiteWarehouses.some(
      (w) => Number(w.id) === Number(form.to_warehouse_id)
    );

    setForm((prev) => ({
      ...prev,
      site_id: isRestrictedSiteUser ? restrictedSiteId : prev.site_id,
      from_warehouse_id: fromValid
        ? prev.from_warehouse_id
        : sameSiteWarehouses[0]?.id
        ? String(sameSiteWarehouses[0].id)
        : "",
      to_warehouse_id: toValid
        ? prev.to_warehouse_id
        : sameSiteWarehouses[1]?.id
        ? String(sameSiteWarehouses[1].id)
        : sameSiteWarehouses[0]?.id
        ? String(sameSiteWarehouses[0].id)
        : "",
    }));
  }, [
    effectiveFormSiteId,
    warehouses,
    form.from_warehouse_id,
    form.to_warehouse_id,
    isRestrictedSiteUser,
    restrictedSiteId,
  ]);

  const resetForm = () => {
    const preferredSite =
      (sites ?? []).find((s) => Number(s.id) === Number(user?.site_id)) ||
      (sites ?? []).find((s) => s.is_default) ||
      (sites ?? [])[0] ||
      null;

    const siteIdToUse = preferredSite?.id ? String(preferredSite.id) : "";
    const siteWarehouses = (warehouses ?? []).filter(
      (w) => Number(w.site_id) === Number(siteIdToUse)
    );

    setEditingId(null);
    setForm({
      site_id: isRestrictedSiteUser ? restrictedSiteId : siteIdToUse,
      from_warehouse_id: siteWarehouses[0]?.id ? String(siteWarehouses[0].id) : "",
      to_warehouse_id: siteWarehouses[1]?.id
        ? String(siteWarehouses[1].id)
        : siteWarehouses[0]?.id
        ? String(siteWarehouses[0].id)
        : "",
      notes: "",
      lines: [emptyLine()],
    });
  };

  const startEdit = (issue) => {
    if (!issue || issue.status !== "pending") {
      toast.error("Seuls les BSC en attente peuvent être modifiés.");
      return;
    }

    if (
      isRestrictedSiteUser &&
      restrictedSiteId &&
      Number(issue.site_id) !== Number(restrictedSiteId)
    ) {
      toast.error("Accès refusé pour un autre site.");
      return;
    }

    setEditingId(issue.id);
    setSelectedId(issue.id);
    setForm({
      site_id: isRestrictedSiteUser
        ? restrictedSiteId
        : issue.site_id
        ? String(issue.site_id)
        : "",
      from_warehouse_id: issue.from_warehouse_id
        ? String(issue.from_warehouse_id)
        : "",
      to_warehouse_id: issue.to_warehouse_id ? String(issue.to_warehouse_id) : "",
      notes: issue.notes || "",
      lines:
        (issue.lines ?? []).length > 0
          ? issue.lines.map((line) => buildLineFromExisting(line))
          : [emptyLine()],
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleProductChange = (index, productId) => {
    const product = getProductById(productId);
    const preferredUnitId = getPreferredEntryUnitId(product);

    setForm((prev) => {
      const lines = [...prev.lines];
      lines[index] = {
        ...lines[index],
        product_id: productId,
        display_unit_id: preferredUnitId,
        display_quantity: "",
        requested_quantity: "",
      };
      return { ...prev, lines };
    });
  };

  const handleDisplayQuantityChange = (index, value) => {
    setForm((prev) => {
      const lines = [...prev.lines];
      const line = { ...lines[index], display_quantity: value };

      const requestedQty = computeRequestedQuantity(line);
      line.requested_quantity =
        value && requestedQty > 0 ? String(requestedQty) : "";

      lines[index] = line;
      return { ...prev, lines };
    });
  };

  const handleDisplayUnitChange = (index, newUnitId) => {
    setForm((prev) => {
      const lines = [...prev.lines];
      const currentLine = lines[index];
      const product = getLineProduct(currentLine);

      let nextDisplayQuantity = currentLine.display_quantity;

      if (product) {
        const oldUnitId =
          currentLine.display_unit_id || getPreferredEntryUnitId(product);
        const stockUnitId = getProductStockUnitId(product);

        if (
          currentLine.display_quantity !== "" &&
          oldUnitId &&
          newUnitId &&
          Number(currentLine.display_quantity) > 0
        ) {
          nextDisplayQuantity = numberToInput(
            convertQuantity(Number(currentLine.display_quantity), oldUnitId, newUnitId),
            8
          );
        } else if (
          currentLine.requested_quantity !== "" &&
          stockUnitId &&
          newUnitId &&
          Number(currentLine.requested_quantity) > 0
        ) {
          nextDisplayQuantity = numberToInput(
            convertQuantity(Number(currentLine.requested_quantity), stockUnitId, newUnitId),
            8
          );
        }
      }

      const nextLine = {
        ...currentLine,
        display_unit_id: newUnitId,
        display_quantity: nextDisplayQuantity,
      };

      const requestedQty = computeRequestedQuantity(nextLine);
      nextLine.requested_quantity =
        nextDisplayQuantity && requestedQty > 0 ? String(requestedQty) : "";

      lines[index] = nextLine;
      return { ...prev, lines };
    });
  };

  const updateLine = (index, field, value) => {
    setForm((prev) => {
      const lines = [...prev.lines];
      lines[index] = { ...lines[index], [field]: value };
      return { ...prev, lines };
    });
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, emptyLine()],
    }));
  };

  const removeLine = (index) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.site_id || !form.from_warehouse_id || !form.to_warehouse_id) {
      toast.error("Sélectionnez le site, le dépôt source et le dépôt cuisine.");
      return;
    }

    if (Number(form.from_warehouse_id) === Number(form.to_warehouse_id)) {
      toast.error("Le dépôt source doit être différent du dépôt cuisine.");
      return;
    }

    const validLines = form.lines
      .map((line) => {
        const requestedQty = computeRequestedQuantity(line);
        return {
          ...line,
          requested_quantity_numeric: requestedQty,
        };
      })
      .filter(
        (line) =>
          line.product_id &&
          Number(line.display_quantity || 0) > 0 &&
          Number(line.requested_quantity_numeric || 0) > 0
      );

    if (validLines.length === 0) {
      toast.error("Ajoutez au moins une ligne valide.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        site_id: Number(isRestrictedSiteUser ? restrictedSiteId : form.site_id),
        from_warehouse_id: Number(form.from_warehouse_id),
        to_warehouse_id: Number(form.to_warehouse_id),
        notes: form.notes || "",
        lines: validLines.map((line) => ({
          product_id: Number(line.product_id),
          display_quantity: Number(line.display_quantity || 0),
          display_unit_id: line.display_unit_id ? Number(line.display_unit_id) : null,
          requested_quantity: Number(line.requested_quantity_numeric || 0),
          notes: line.notes || "",
        })),
      };

      let res;

      if (isEditing) {
        res = await api.put(`/kitchen-issues/${editingId}`, payload);
      } else {
        res = await api.post("/kitchen-issues", payload);
      }

      toast.success(
        res.data?.message ||
          (isEditing ? "BSC mis à jour." : "BSC créé avec succès.")
      );

      resetForm();
      await loadIssues();

      const newId = res.data?.data?.id;
      if (newId) {
        setSelectedId(newId);
      }
    } catch (err) {
      console.error(err);

      const message = err?.response?.data?.message || err?.message || "";

      if (
        typeof message === "string" &&
        message.toLowerCase().includes("malformed utf-8")
      ) {
        toast.success(
          isEditing
            ? "BSC enregistré, mais la réponse serveur contient un problème d’encodage UTF-8."
            : "BSC créé, mais la réponse serveur contient un problème d’encodage UTF-8."
        );
        await loadIssues();
        resetForm();
        return;
      }

      toast.error(
        err?.response?.data?.message ||
          (isEditing ? "Erreur mise à jour BSC" : "Erreur création BSC")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteIssue = async (issue) => {
    const ok = window.confirm(
      `Voulez-vous vraiment supprimer le BSC "${issue.issue_number}" ?`
    );
    if (!ok) return;

    try {
      setDeletingId(issue.id);
      const res = await api.delete(`/kitchen-issues/${issue.id}`);
      toast.success(res.data?.message || "BSC supprimé.");

      if (Number(selectedId) === Number(issue.id)) {
        setSelectedId(null);
      }
      if (Number(editingId) === Number(issue.id)) {
        resetForm();
      }

      await loadIssues();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur suppression BSC");
    } finally {
      setDeletingId(null);
    }
  };

  const totalEstimated = useMemo(() => {
    return form.lines.reduce((sum, line) => {
      const product = getLineProduct(line);
      const price = Number(product?.last_purchase_price ?? 0);
      const requestedQty = computeRequestedQuantity(line);
      return sum + requestedQty * price;
    }, 0);
  }, [form.lines, products, units]);

  const getLineStockUnitLabel = (line) => {
    const stockUnit = getLineStockUnit(line);
    return getUnitLabel(stockUnit);
  };

  const getLineEntryUnitOptions = (line) => {
    const product = getLineProduct(line);
    return getProductEntryUnitIds(product)
      .map((unitId) => getUnitModel(unitId))
      .filter(Boolean);
  };

  const getIssueLineUnitLabel = (line) => {
    const product = line?.product || getProductById(line?.product_id);
    const stockUnit = getUnitModel(getProductStockUnitId(product));
    return getUnitLabel(stockUnit);
  };

  if (refsLoading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="xl:col-span-5">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                {isEditing ? "Modifier le BSC" : "Bon de Sortie Cuisine"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Demande de sortie interne du dépôt principal vers le dépôt cuisine.
              </p>
              {isRestrictedSiteUser && (
                <p className="mt-1 text-xs text-slate-400">
                  Affichage limité au site d’affectation.
                </p>
              )}
            </div>

            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-slate-200 px-4 py-2 text-slate-800"
              >
                Annuler
              </button>
            )}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <select
                className="rounded-xl border p-3 disabled:bg-slate-100 disabled:text-slate-500"
                value={form.site_id}
                disabled={isRestrictedSiteUser}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    site_id: e.target.value,
                    from_warehouse_id: "",
                    to_warehouse_id: "",
                  }))
                }
              >
                <option value="">Choisir un site</option>
                {visibleSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>

              <input
                className="rounded-xl border p-3"
                value={form.notes}
                placeholder="Notes générales"
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <select
                className="rounded-xl border p-3"
                value={form.from_warehouse_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    from_warehouse_id: e.target.value,
                  }))
                }
              >
                <option value="">Dépôt source</option>
                {currentSiteWarehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>

              <select
                className="rounded-xl border p-3"
                value={form.to_warehouse_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    to_warehouse_id: e.target.value,
                  }))
                }
              >
                <option value="">Dépôt cuisine</option>
                {currentSiteWarehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-lg font-semibold text-slate-800">
                  Lignes produits
                </div>

                <button
                  type="button"
                  onClick={addLine}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-white"
                >
                  Ajouter ligne
                </button>
              </div>

              <div className="space-y-3">
                {form.lines.map((line, index) => {
                  const product = getLineProduct(line);
                  const entryUnit = getLineEntryUnit(line);
                  const stockUnit = getLineStockUnit(line);
                  const entryUnitOptions = getLineEntryUnitOptions(line);
                  const computedRequestedQty = computeRequestedQuantity(line);
                  const conversionHint = getConversionHint(line);

                  return (
                    <div
                      key={index}
                      className="rounded-xl border p-3"
                    >
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                        <div className="lg:col-span-4">
                          <select
                            className="w-full rounded-xl border p-3"
                            value={line.product_id}
                            onChange={(e) =>
                              handleProductChange(index, e.target.value)
                            }
                          >
                            <option value="">Produit</option>
                            {(products ?? []).map((productItem) => (
                              <option key={productItem.id} value={productItem.id}>
                                {productItem.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="lg:col-span-3">
                          <input
                            type="number"
                            step="0.000001"
                            className="w-full rounded-xl border p-3"
                            placeholder="Quantité"
                            value={line.display_quantity}
                            onChange={(e) =>
                              handleDisplayQuantityChange(index, e.target.value)
                            }
                          />
                        </div>

                        <div className="lg:col-span-2">
                          <select
                            className="w-full rounded-xl border p-3"
                            value={line.display_unit_id || ""}
                            onChange={(e) =>
                              handleDisplayUnitChange(index, e.target.value)
                            }
                            disabled={entryUnitOptions.length <= 1}
                          >
                            <option value="">Unité</option>
                            {entryUnitOptions.map((unit) => (
                              <option key={unit.id} value={unit.id}>
                                {getUnitLabel(unit)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="lg:col-span-2">
                          <input
                            className="w-full rounded-xl border p-3"
                            placeholder="Notes ligne"
                            value={line.notes}
                            onChange={(e) => updateLine(index, "notes", e.target.value)}
                          />
                        </div>

                        <div className="lg:col-span-1">
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            disabled={form.lines.length === 1}
                            className="w-full rounded-xl bg-red-600 px-3 py-3 text-white disabled:opacity-50"
                          >
                            X
                          </button>
                        </div>
                      </div>

{product && (
  <div className="mt-2 space-y-2">
    {entryUnitOptions.length > 1 && (
      <select
        className="w-full rounded-xl border p-2 text-sm"
        value={line.display_unit_id || ""}
        onChange={(e) => handleDisplayUnitChange(index, e.target.value)}
      >
        {entryUnitOptions.map((unit) => (
          <option key={unit.id} value={unit.id}>
            Saisie en {getUnitLabel(unit)}
          </option>
        ))}
      </select>
    )}

    <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <div>
        Unité saisie : <strong>{getUnitLabel(entryUnit) || "-"}</strong>
      </div>
      <div className="mt-1">
        Équiv. stock :{" "}
        <strong>
          {computedRequestedQty > 0 ? formatQty(computedRequestedQty) : "0"}{" "}
          {getUnitLabel(stockUnit) || "-"}
        </strong>
      </div>
      <div className="mt-1 text-slate-500">
        Conversion : {getLineConversionPreview(line)}
      </div>
    </div>
  </div>
)}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                Estimation indicative :{" "}
                <strong>{formatMoney(totalEstimated)} Ar</strong>
              </div>

              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                Astuce : le chef saisit la quantité dans l’unité pratique.  
                Le système convertit automatiquement vers l’unité de stock réelle.
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                disabled={submitting}
                className="rounded-xl bg-emerald-700 px-4 py-3 text-white disabled:opacity-60"
              >
                {submitting
                  ? "Enregistrement..."
                  : isEditing
                  ? "Mettre à jour le BSC"
                  : "Créer le BSC"}
              </button>

              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl bg-slate-200 px-4 py-3 text-slate-800"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="xl:col-span-7">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                Historique BSC
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Impression ticket, scan rapide, édition avant sortie et suivi des états.
              </p>
            </div>

            <button
              onClick={loadIssues}
              className="rounded-xl bg-slate-900 px-4 py-2 text-white"
            >
              Rafraîchir
            </button>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <select
              className="rounded-xl border p-3 disabled:bg-slate-100 disabled:text-slate-500"
              value={filters.site_id}
              disabled={isRestrictedSiteUser}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, site_id: e.target.value }))
              }
            >
              {!isRestrictedSiteUser && <option value="">Tous les sites</option>}
              {visibleSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border p-3"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="">Tous les statuts</option>
              <option value="pending">pending</option>
              <option value="issued">issued</option>
              <option value="received">received</option>
              <option value="cancelled">cancelled</option>
            </select>

            <input
              className="rounded-xl border p-3"
              placeholder="Recherche numéro / dépôt / note"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />
          </div>

          {loading ? (
            <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
              Chargement des BSC...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
              <div className="space-y-3">
                {filteredIssues.length === 0 && (
                  <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                    Aucun BSC trouvé.
                  </div>
                )}

                {filteredIssues.map((issue) => {
                  const fromWarehouse = getFromWarehouse(issue);
                  const toWarehouse = getToWarehouse(issue);

                  return (
                    <div
                      key={issue.id}
                      onClick={() => setSelectedId(issue.id)}
                      className={`cursor-pointer rounded-xl border p-4 transition ${
                        Number(selectedId) === Number(issue.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-800">
                            {issue.issue_number}
                          </div>
                          <div className="text-sm text-slate-500">
                            {issue.site?.name || "-"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatDateTime(issue.requested_at || issue.created_at)}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                              issue.status
                            )}`}
                          >
                            {issue.status}
                          </span>
                          <span
                            className={`rounded-lg px-2 py-1 text-xs font-semibold ${workflowBadgeClass(
                              issue.workflow_status
                            )}`}
                          >
                            {issue.workflow_status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-slate-600">
                        {fromWarehouse?.name || "-"} → {toWarehouse?.name || "-"}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(issue);
                          }}
                          disabled={issue.status !== "pending"}
                          className="rounded-xl bg-blue-700 px-3 py-2 text-sm text-white disabled:opacity-40"
                        >
                          Modifier
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(buildPrintUrl(issue), "_blank");
                          }}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white"
                        >
                          Imprimer ticket
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(buildScanUrl(issue), "_blank");
                          }}
                          className="rounded-xl bg-emerald-700 px-3 py-2 text-sm text-white"
                        >
                          Ouvrir scan
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteIssue(issue);
                          }}
                          disabled={
                            deletingId === issue.id || issue.status !== "pending"
                          }
                          className="rounded-xl bg-red-700 px-3 py-2 text-sm text-white disabled:opacity-40"
                        >
                          {deletingId === issue.id ? "Suppression..." : "Supprimer"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                {!selectedIssue ? (
                  <div className="text-slate-400">Sélectionnez un BSC.</div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-800">
                          {selectedIssue.issue_number}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Site : {selectedIssue.site?.name || "-"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                            selectedIssue.status
                          )}`}
                        >
                          {selectedIssue.status}
                        </span>

                        <span
                          className={`rounded-lg px-2 py-1 text-xs font-semibold ${workflowBadgeClass(
                            selectedIssue.workflow_status
                          )}`}
                        >
                          {selectedIssue.workflow_status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-sm text-slate-500">Dépôt source</div>
                        <div className="font-semibold text-slate-800">
                          {getFromWarehouse(selectedIssue)?.name || "-"}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-sm text-slate-500">Dépôt cuisine</div>
                        <div className="font-semibold text-slate-800">
                          {getToWarehouse(selectedIssue)?.name || "-"}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-sm text-slate-500">Demandé par</div>
                        <div className="font-semibold text-slate-800">
                          {getRequestedBy(selectedIssue)?.name ||
                            getRequestedBy(selectedIssue)?.email ||
                            "-"}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-sm text-slate-500">Date demande</div>
                        <div className="font-semibold text-slate-800">
                          {formatDateTime(
                            selectedIssue.requested_at || selectedIssue.created_at
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-sm text-slate-500">Sorti du dépôt</div>
                        <div className="font-semibold text-slate-800">
                          {formatDateTime(selectedIssue.issued_at)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {getIssuedBy(selectedIssue)?.name ||
                            getIssuedBy(selectedIssue)?.email ||
                            "-"}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-sm text-slate-500">
                          Reçu en cuisine
                        </div>
                        <div className="font-semibold text-slate-800">
                          {formatDateTime(selectedIssue.received_at)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {getReceivedBy(selectedIssue)?.name ||
                            getReceivedBy(selectedIssue)?.email ||
                            "-"}
                        </div>
                      </div>
                    </div>

                    {selectedIssue.notes && (
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-sm text-slate-500">Notes</div>
                        <div className="font-semibold text-slate-800">
                          {selectedIssue.notes}
                        </div>
                      </div>
                    )}

                    {selectedIssue.qr_image_url && (
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="mb-3 text-sm font-semibold text-slate-700">
                          QR BSC
                        </div>

                        <div className="flex flex-col gap-4 md:flex-row md:items-start">
                          <img
                            src={selectedIssue.qr_image_url}
                            alt="QR BSC"
                            className="h-40 w-40 rounded-xl border bg-white p-2"
                          />

                          <div className="space-y-3">
                            <div className="text-sm break-all text-slate-600">
                              {buildScanUrl(selectedIssue)}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  window.open(buildPrintUrl(selectedIssue), "_blank")
                                }
                                className="rounded-xl bg-slate-900 px-4 py-2 text-white"
                              >
                                Imprimer ticket
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  window.open(buildScanUrl(selectedIssue), "_blank")
                                }
                                className="rounded-xl bg-emerald-700 px-4 py-2 text-white"
                              >
                                Ouvrir scan
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="mb-3 text-lg font-semibold text-slate-800">
                        Lignes du BSC
                      </h4>

                      <div className="overflow-x-auto rounded-2xl border">
                        <table className="min-w-full text-left">
                          <thead className="border-b border-slate-200 bg-slate-50">
                            <tr className="text-slate-600">
                              <th className="px-4 py-3">Produit</th>
                              <th className="px-4 py-3">Demandé</th>
                              <th className="px-4 py-3">Sorti</th>
                              <th className="px-4 py-3">Reçu</th>
                              <th className="px-4 py-3">Rejeté</th>
                              <th className="px-4 py-3">Coût unit.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedIssue.lines ?? []).map((line) => {
                              const unitLabel = getIssueLineUnitLabel(line);

                              return (
                                <tr
                                  key={line.id}
                                  className="border-b border-slate-100 hover:bg-slate-50"
                                >
                                  <td className="px-4 py-3">
                                    {line.product?.name || "-"}
                                  </td>
                                  <td className="px-4 py-3">
                                    {formatQty(line.requested_quantity)} {unitLabel}
                                  </td>
                                  <td className="px-4 py-3">
                                    {formatQty(line.issued_quantity)} {unitLabel}
                                  </td>
                                  <td className="px-4 py-3">
                                    {formatQty(line.received_quantity)} {unitLabel}
                                  </td>
                                  <td className="px-4 py-3">
                                    {formatQty(line.rejected_quantity)} {unitLabel}
                                  </td>
                                  <td className="px-4 py-3">
                                    {line.unit_cost !== null &&
                                    line.unit_cost !== undefined
                                      ? `${formatMoney(line.unit_cost)} Ar`
                                      : "-"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3 text-lg font-semibold text-slate-800">
                        Historique des scans
                      </h4>

                      <div className="space-y-3">
                        {getScanEvents(selectedIssue).length === 0 && (
                          <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                            Aucun scan enregistré pour le moment.
                          </div>
                        )}

                        {getScanEvents(selectedIssue).map((event) => (
                          <div
                            key={event.id}
                            className="rounded-xl border border-slate-200 p-4"
                          >
                            <div className="font-semibold text-slate-800">
                              {event.scan_stage} — {event.new_status}
                            </div>

                            <div className="text-sm text-slate-500">
                              {event.user?.name ||
                                event.user?.email ||
                                "Utilisateur"}{" "}
                              — {formatDateTime(event.scanned_at)}
                            </div>

                            {(event.latitude || event.longitude) && (
                              <div className="text-sm text-slate-500">
                                GPS: {event.latitude ?? "-"}, {event.longitude ?? "-"}
                              </div>
                            )}

                            {event.notes && (
                              <div className="mt-2 text-sm text-slate-700">
                                {event.notes}
                              </div>
                            )}

                            {event.photo_url && (
                              <img
                                src={event.photo_url}
                                alt="scan"
                                className="mt-3 h-24 w-24 rounded-xl object-cover"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}