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

function statusLabel(status) {
  switch (String(status || "")) {
    case "free":
      return "Libre";
    case "occupied":
      return "Occupée";
    case "reserved":
      return "Réservée";
    case "cleaning":
      return "À nettoyer";
    case "inactive":
      return "Inactive";
    default:
      return status || "-";
  }
}

function statusClass(status) {
  switch (String(status || "")) {
    case "free":
      return "border-emerald-300 bg-emerald-50 text-emerald-700";
    case "occupied":
      return "border-red-300 bg-red-50 text-red-700";
    case "reserved":
      return "border-blue-300 bg-blue-50 text-blue-700";
    case "cleaning":
      return "border-amber-300 bg-amber-50 text-amber-700";
    case "inactive":
      return "border-slate-300 bg-slate-100 text-slate-500";
    default:
      return "border-slate-300 bg-white text-slate-700";
  }
}

function nowTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return value;
  }
}

const emptyAreaForm = {
  id: null,
  site_id: "",
  name: "",
  code: "",
  color: "",
  sort_order: 0,
  is_active: true,
};

const emptyTableForm = {
  id: null,
  site_id: "",
  restaurant_area_id: "",
  name: "",
  code: "",
  capacity: 4,
  status: "free",
  shape: "square",
  sort_order: 0,
  is_active: true,
};

export default function RestaurantFloorPlan() {
  const { user, activeTerminal } = useAuth();

  const [loading, setLoading] = useState(true);

  const [sites, setSites] = useState([]);
  const [areas, setAreas] = useState([]);
  const [tables, setTables] = useState([]);

  const [selectedSiteId, setSelectedSiteId] = useState(
    activeTerminal?.site_id || user?.site_id || ""
  );

  const [selectedAreaId, setSelectedAreaId] = useState("");

  const [selectedTable, setSelectedTable] = useState(null);

  const [quickTableModalOpen, setQuickTableModalOpen] = useState(false);
const [quickTableName, setQuickTableName] = useState("");
const [draggingTableId, setDraggingTableId] = useState(null);
const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

const [floorObjects, setFloorObjects] = useState([]);
const [selectedObject, setSelectedObject] = useState(null);
const [draggingObjectId, setDraggingObjectId] = useState(null);
const [objectDragOffset, setObjectDragOffset] = useState({ x: 0, y: 0 });

const [objectModalOpen, setObjectModalOpen] = useState(false);
const [objectForm, setObjectForm] = useState({
  id: null,
  object_type: "text",
  label: "",
  width: 160,
  height: 50,
  rotation: 0,
  background_color: "#ffffff",
  border_color: "#93c5fd",
  text_color: "#0f172a",
  font_size: 16,
  border_width: 2,
  is_locked: false,
});

  const [areaForm, setAreaForm] = useState(emptyAreaForm);
  const [tableForm, setTableForm] = useState(emptyTableForm);

  const [sessionForm, setSessionForm] = useState({
    guest_count: 1,
    customer_name: "",
    customer_phone: "",
    notes: "",
  });

  const visibleAreas = useMemo(() => {
    if (!selectedSiteId) return areas;
    return areas.filter((area) => Number(area.site_id) === Number(selectedSiteId));
  }, [areas, selectedSiteId]);

  const visibleTables = useMemo(() => {
    return tables.filter((table) => {
      if (selectedSiteId && Number(table.site_id) !== Number(selectedSiteId)) {
        return false;
      }

      if (selectedAreaId && Number(table.restaurant_area_id) !== Number(selectedAreaId)) {
        return false;
      }

      return true;
    });
  }, [tables, selectedSiteId, selectedAreaId]);

  const visibleFloorObjects = useMemo(() => {
  return floorObjects.filter((object) => {
    if (selectedSiteId && Number(object.site_id) !== Number(selectedSiteId)) {
      return false;
    }

    if (selectedAreaId && Number(object.restaurant_area_id) !== Number(selectedAreaId)) {
      return false;
    }

    return true;
  });
}, [floorObjects, selectedSiteId, selectedAreaId]);

  const counters = useMemo(() => {
    return visibleTables.reduce(
      (acc, table) => {
        acc.total += 1;
        acc[table.status] = (acc[table.status] || 0) + 1;
        return acc;
      },
      {
        total: 0,
        free: 0,
        occupied: 0,
        reserved: 0,
        cleaning: 0,
        inactive: 0,
      }
    );
  }, [visibleTables]);


  const createQuickTable = async () => {
  if (!quickTableName.trim()) {
    toast.error("Numéro de table obligatoire");
    return;
  }

  if (!selectedSiteId) {
    toast.error("Choisir un site");
    return;
  }

  if (!selectedAreaId) {
    toast.error("Choisir une zone / salle");
    return;
  }

  try {
    const payload = {
      site_id: Number(selectedSiteId),
      restaurant_area_id: Number(selectedAreaId),
      name: quickTableName.trim(),
      code: quickTableName.trim(),
      capacity: 4,
      status: "free",
      shape: "square",
      sort_order: visibleTables.length + 1,
      is_active: true,
      position_x: 80 + visibleTables.length * 20,
      position_y: 80 + visibleTables.length * 20,
    };

    const res = await api.post("/restaurant-tables", payload);

    toast.success(res.data?.message || "Table créée");

    setQuickTableName("");
    setQuickTableModalOpen(false);

    await loadFloor();
  } catch (err) {
    console.error(err);
    toast.error(err?.response?.data?.message || "Erreur création table");
  }
};


const startDragTable = (e, table) => {
  e.preventDefault();

  const rect = e.currentTarget.getBoundingClientRect();

  setDraggingTableId(table.id);
  setDragOffset({
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  });

  setSelectedTable(table);
};

const moveTable = (e) => {
  if (!draggingTableId) return;

  const canvas = document.getElementById("floor-plan-canvas");

  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();

  const nextX = e.clientX - rect.left - dragOffset.x;
  const nextY = e.clientY - rect.top - dragOffset.y;

  setTables((prev) =>
    prev.map((table) =>
      Number(table.id) === Number(draggingTableId)
        ? {
            ...table,
            position_x: Math.max(0, nextX),
            position_y: Math.max(0, nextY),
          }
        : table
    )
  );
};

const stopDragTable = async () => {
  if (!draggingTableId) return;

  const table = tables.find((row) => Number(row.id) === Number(draggingTableId));

  setDraggingTableId(null);

  if (!table) return;

  try {
    await api.post(`/restaurant-tables/${table.id}/position`, {
      position_x: Number(table.position_x || 0),
      position_y: Number(table.position_y || 0),
    });
  } catch (err) {
    console.error(err);
    toast.error("Position non enregistrée");
  }
};


  const loadReferences = async () => {
    try {
      const sitesRes = await api.get("/sites");
      setSites(asArray(sitesRes.data));
    } catch (err) {
      console.error(err);
    }
  };

  const loadFloor = async () => {
    try {
      setLoading(true);

      const params = {};

      if (selectedSiteId) {
        params.site_id = selectedSiteId;
      }

const objectParams = { ...params };

if (selectedAreaId) {
  objectParams.restaurant_area_id = selectedAreaId;
}

const [areasRes, tablesRes, objectsRes] = await Promise.all([
  api.get("/restaurant-areas", { params }),
  api.get("/restaurant-tables", { params }),
  api.get("/restaurant-floor-objects", { params: objectParams }),
]);

setAreas(asArray(areasRes.data));
setTables(asArray(tablesRes.data));
setFloorObjects(asArray(objectsRes.data));
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger le plan salle");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferences();
    loadFloor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadFloor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId]);

    useEffect(() => {
    loadFloor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAreaId]);

  const resetAreaForm = () => {
    setAreaForm({
      ...emptyAreaForm,
      site_id: selectedSiteId || "",
    });
  };

  const resetTableForm = () => {
    setTableForm({
      ...emptyTableForm,
      site_id: selectedSiteId || "",
      restaurant_area_id: selectedAreaId || "",
    });
  };

  const saveArea = async () => {
    if (!areaForm.name) {
      toast.error("Nom de zone obligatoire");
      return;
    }

    try {
      const payload = {
        site_id: areaForm.site_id ? Number(areaForm.site_id) : null,
        name: areaForm.name,
        code: areaForm.code || null,
        color: areaForm.color || null,
        sort_order: Number(areaForm.sort_order || 0),
        is_active: Boolean(areaForm.is_active),
      };

      if (areaForm.id) {
        const res = await api.put(`/restaurant-areas/${areaForm.id}`, payload);
        toast.success(res.data?.message || "Zone modifiée");
      } else {
        const res = await api.post("/restaurant-areas", payload);
        toast.success(res.data?.message || "Zone créée");
      }

      resetAreaForm();
      await loadFloor();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur zone");
    }
  };

  const editArea = (area) => {
    setAreaForm({
      id: area.id,
      site_id: area.site_id || "",
      name: area.name || "",
      code: area.code || "",
      color: area.color || "",
      sort_order: area.sort_order || 0,
      is_active: Boolean(area.is_active),
    });
  };

  const deleteArea = async (area) => {
    const ok = window.confirm(`Supprimer la zone ${area.name} ?`);
    if (!ok) return;

    try {
      const res = await api.delete(`/restaurant-areas/${area.id}`);
      toast.success(res.data?.message || "Zone supprimée");
      await loadFloor();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Suppression impossible");
    }
  };

  const saveTable = async () => {
    if (!tableForm.name) {
      toast.error("Nom de table obligatoire");
      return;
    }

    try {
      const payload = {
        site_id: tableForm.site_id ? Number(tableForm.site_id) : null,
        restaurant_area_id: tableForm.restaurant_area_id
          ? Number(tableForm.restaurant_area_id)
          : null,
        name: tableForm.name,
        code: tableForm.code || null,
        capacity: Number(tableForm.capacity || 1),
        status: tableForm.status || "free",
        shape: tableForm.shape || "square",
        sort_order: Number(tableForm.sort_order || 0),
        is_active: Boolean(tableForm.is_active),
        position_x: Number(tableForm.position_x || selectedTable?.position_x || 80),
        position_y: Number(tableForm.position_y || selectedTable?.position_y || 80),
      };

      if (tableForm.id) {
        const res = await api.put(`/restaurant-tables/${tableForm.id}`, payload);
        toast.success(res.data?.message || "Table modifiée");
      } else {
        const res = await api.post("/restaurant-tables", payload);
        toast.success(res.data?.message || "Table créée");
      }

      resetTableForm();
      await loadFloor();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur table");
    }
  };

  const openNewObjectModal = (type = "text") => {
  if (!selectedSiteId) {
    toast.error("Choisir un site");
    return;
  }

  if (!selectedAreaId) {
    toast.error("Choisir une zone / salle");
    return;
  }

  const defaults = {
    text: {
      object_type: "text",
      label: "TEXTE",
      width: 160,
      height: 50,
      background_color: "transparent",
      border_color: "transparent",
      text_color: "#ffffff",
      font_size: 22,
      border_width: 0,
    },
    wall: {
      object_type: "wall",
      label: "",
      width: 220,
      height: 12,
      background_color: "#ffffff",
      border_color: "#ffffff",
      text_color: "#ffffff",
      font_size: 12,
      border_width: 0,
    },
    rectangle: {
      object_type: "rectangle",
      label: "",
      width: 180,
      height: 90,
      background_color: "rgba(255,255,255,0.12)",
      border_color: "#93c5fd",
      text_color: "#ffffff",
      font_size: 16,
      border_width: 2,
    },
    circle: {
      object_type: "circle",
      label: "",
      width: 90,
      height: 90,
      background_color: "rgba(255,255,255,0.12)",
      border_color: "#93c5fd",
      text_color: "#ffffff",
      font_size: 16,
      border_width: 2,
    },
    line: {
      object_type: "line",
      label: "",
      width: 220,
      height: 4,
      background_color: "#ffffff",
      border_color: "#ffffff",
      text_color: "#ffffff",
      font_size: 12,
      border_width: 0,
    },
  };

  setObjectForm({
    id: null,
    rotation: 0,
    is_locked: false,
    ...defaults[type],
  });

  setObjectModalOpen(true);
};

const editFloorObject = (object) => {
  setSelectedObject(object);

  setObjectForm({
    id: object.id,
    object_type: object.object_type || "text",
    label: object.label || "",
    width: Number(object.width || 160),
    height: Number(object.height || 50),
    rotation: Number(object.rotation || 0),
    background_color: object.background_color || "#ffffff",
    border_color: object.border_color || "#93c5fd",
    text_color: object.text_color || "#0f172a",
    font_size: Number(object.font_size || 16),
    border_width: Number(object.border_width || 2),
    is_locked: Boolean(object.is_locked),
  });

  setObjectModalOpen(true);
};

const saveFloorObject = async () => {
  try {
const payload = {
  site_id: selectedSiteId ? Number(selectedSiteId) : null,
  restaurant_area_id: selectedAreaId ? Number(selectedAreaId) : null,
  object_type: objectForm.object_type,
  label: objectForm.label || null,

  position_x: selectedObject?.position_x
    ? Number(selectedObject.position_x)
    : 120,

  position_y: selectedObject?.position_y
    ? Number(selectedObject.position_y)
    : 120,

  width: Number(objectForm.width || 120),
  height: Number(objectForm.height || 40),
  rotation: Number(objectForm.rotation || 0),
  background_color: objectForm.background_color || null,
  border_color: objectForm.border_color || null,
  text_color: objectForm.text_color || "#ffffff",
  font_size: Number(objectForm.font_size || 16),
  border_width: Number(objectForm.border_width || 0),
  is_locked: Boolean(objectForm.is_locked),
  sort_order: 0,
  meta: null,
};

    if (objectForm.id) {
      const res = await api.put(`/restaurant-floor-objects/${objectForm.id}`, payload);
      toast.success(res.data?.message || "Objet modifié");
    } else {
      const res = await api.post("/restaurant-floor-objects", payload);
      toast.success(res.data?.message || "Objet ajouté");
    }

    setObjectModalOpen(false);
    setSelectedObject(null);
    await loadFloor();
  } catch (err) {
    console.error(err);
    toast.error(err?.response?.data?.message || "Erreur objet plan");
  }
};

const deleteFloorObject = async (object) => {
  if (!object?.id) return;

  const ok = window.confirm("Supprimer cet objet du plan ?");
  if (!ok) return;

  try {
    const res = await api.delete(`/restaurant-floor-objects/${object.id}`);
    toast.success(res.data?.message || "Objet supprimé");
    setSelectedObject(null);
    await loadFloor();
  } catch (err) {
    console.error(err);
    toast.error(err?.response?.data?.message || "Suppression impossible");
  }
};

const startDragObject = (e, object) => {
  e.preventDefault();
  e.stopPropagation();

  setSelectedObject(object);
  setSelectedTable(null);

  if (object.is_locked) return;

  const rect = e.currentTarget.getBoundingClientRect();

  setDraggingObjectId(object.id);
  setObjectDragOffset({
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  });
};

const moveObject = (e) => {
  if (!draggingObjectId) return;

  const canvas = document.getElementById("floor-plan-canvas");
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();

  const nextX = e.clientX - rect.left - objectDragOffset.x;
  const nextY = e.clientY - rect.top - objectDragOffset.y;

  setFloorObjects((prev) =>
    prev.map((object) =>
      Number(object.id) === Number(draggingObjectId)
        ? {
            ...object,
            position_x: Math.max(0, nextX),
            position_y: Math.max(0, nextY),
          }
        : object
    )
  );
};

const stopDragObject = async () => {
  if (!draggingObjectId) return;

  const object = floorObjects.find(
    (row) => Number(row.id) === Number(draggingObjectId)
  );

  setDraggingObjectId(null);

  if (!object) return;

  try {
    await api.post(`/restaurant-floor-objects/${object.id}/position`, {
      position_x: Number(object.position_x || 0),
      position_y: Number(object.position_y || 0),
      width: Number(object.width || 120),
      height: Number(object.height || 40),
      rotation: Number(object.rotation || 0),
    });
  } catch (err) {
    console.error(err);
    toast.error("Position objet non enregistrée");
  }
};


  const editTable = (table) => {
    setSelectedTable(table);

    setTableForm({
      id: table.id,
      site_id: table.site_id || "",
      restaurant_area_id: table.restaurant_area_id || "",
      name: table.name || "",
      code: table.code || "",
      capacity: table.capacity || 4,
      status: table.status || "free",
      shape: table.shape || "square",
      sort_order: table.sort_order || 0,
      is_active: Boolean(table.is_active),
    });
  };

  const deleteTable = async (table) => {
    const ok = window.confirm(`Supprimer la table ${table.name} ?`);
    if (!ok) return;

    try {
      const res = await api.delete(`/restaurant-tables/${table.id}`);
      toast.success(res.data?.message || "Table supprimée");
      setSelectedTable(null);
      await loadFloor();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Suppression impossible");
    }
  };

  const changeTableStatus = async (table, status) => {
    try {
      const res = await api.post(`/restaurant-tables/${table.id}/status`, {
        status,
      });

      toast.success(res.data?.message || "Statut modifié");
      setSelectedTable(res.data?.data || table);
      await loadFloor();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur statut table");
    }
  };

  const openTableSession = async (table) => {
    try {
      const res = await api.post("/table-sessions/open", {
        restaurant_table_id: table.id,
        guest_count: Number(sessionForm.guest_count || 1),
        customer_name: sessionForm.customer_name || null,
        customer_phone: sessionForm.customer_phone || null,
        notes: sessionForm.notes || null,
      });

      toast.success(res.data?.message || "Table ouverte");

      setSessionForm({
        guest_count: 1,
        customer_name: "",
        customer_phone: "",
        notes: "",
      });

      setSelectedTable(null);
      await loadFloor();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur ouverture table");
    }
  };

  const closeTableSession = async (table) => {
    const session = table.open_session || table.openSession;

    if (!session?.id) {
      toast.error("Aucune session ouverte");
      return;
    }

    const ok = window.confirm("Clôturer cette session et passer la table en nettoyage ?");
    if (!ok) return;

    try {
      const res = await api.post(`/table-sessions/${session.id}/close`);
      toast.success(res.data?.message || "Session clôturée");
      setSelectedTable(null);
      await loadFloor();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur clôture session");
    }
  };

  const cancelTableSession = async (table) => {
    const session = table.open_session || table.openSession;

    if (!session?.id) {
      toast.error("Aucune session ouverte");
      return;
    }

    const reason = window.prompt("Motif d'annulation :", "Erreur ouverture table");
    if (reason === null) return;

    try {
      const res = await api.post(`/table-sessions/${session.id}/cancel`, {
        reason,
      });

      toast.success(res.data?.message || "Session annulée");
      setSelectedTable(null);
      await loadFloor();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur annulation session");
    }
  };

  const selectedOpenSession = selectedTable?.open_session || selectedTable?.openSession;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 p-5 text-white shadow-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-black">Plan salle</h1>
            <p className="mt-1 text-sm text-slate-200">
              Gestion des zones, tables et sessions de service.
            </p>
          </div>

          <button
            onClick={loadFloor}
            className="rounded-xl bg-white px-4 py-3 font-bold text-slate-900"
          >
            Actualiser
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Tables</div>
          <div className="text-3xl font-black">{counters.total}</div>
        </div>

        <div className="rounded-2xl bg-emerald-50 p-4 shadow">
          <div className="text-sm text-emerald-600">Libres</div>
          <div className="text-3xl font-black text-emerald-700">
            {counters.free}
          </div>
        </div>

        <div className="rounded-2xl bg-red-50 p-4 shadow">
          <div className="text-sm text-red-600">Occupées</div>
          <div className="text-3xl font-black text-red-700">
            {counters.occupied}
          </div>
        </div>

        <div className="rounded-2xl bg-blue-50 p-4 shadow">
          <div className="text-sm text-blue-600">Réservées</div>
          <div className="text-3xl font-black text-blue-700">
            {counters.reserved}
          </div>
        </div>

        <div className="rounded-2xl bg-amber-50 p-4 shadow">
          <div className="text-sm text-amber-600">À nettoyer</div>
          <div className="text-3xl font-black text-amber-700">
            {counters.cleaning}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 shadow">
          <div className="text-sm text-slate-500">Inactives</div>
          <div className="text-3xl font-black text-slate-700">
            {counters.inactive}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <select
                className="rounded-xl border p-3"
                value={selectedSiteId}
                onChange={(e) => {
                  setSelectedSiteId(e.target.value);
                  setSelectedAreaId("");
                  setSelectedTable(null);
                }}
              >
                <option value="">Tous sites</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>

              <select
                className="rounded-xl border p-3"
                value={selectedAreaId}
                onChange={(e) => {
                  setSelectedAreaId(e.target.value);
                  setSelectedTable(null);
                }}
              >
                <option value="">Toutes zones</option>
                {visibleAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  resetAreaForm();
                  resetTableForm();
                }}
                className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white"
              >
                Nouveau
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                Tables salle
              </h2>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                {visibleTables.length}
              </span>
            </div>

            {loading && (
              <div className="rounded-xl bg-slate-50 p-5 text-slate-500">
                Chargement...
              </div>
            )}

            {!loading && visibleTables.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-5 text-center text-slate-500">
                Aucune table. Créez une zone puis ajoutez vos tables.
              </div>
            )}

<div
  id="floor-plan-canvas"
onMouseMove={(e) => {
  moveTable(e);
  moveObject(e);
}}
onMouseUp={() => {
  stopDragTable();
  stopDragObject();
}}
onMouseLeave={() => {
  stopDragTable();
  stopDragObject();
}}

onClick={() => {
  setSelectedObject(null);
}}
  className="relative min-h-[620px] overflow-hidden rounded-3xl border border-blue-900 bg-[#0f4268] shadow-inner"
>
  <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
    <button
      type="button"
      onClick={() => setQuickTableModalOpen(true)}
      className="rounded-xl bg-cyan-500 px-4 py-2 font-black text-white shadow"
    >
      + Table
    </button>
<button
  type="button"
  onClick={() => openNewObjectModal("text")}
  className="rounded-xl bg-white/20 px-4 py-2 font-bold text-white"
>
  + Texte
</button>

<button
  type="button"
  onClick={() => openNewObjectModal("wall")}
  className="rounded-xl bg-white/20 px-4 py-2 font-bold text-white"
>
  + Mur
</button>

<button
  type="button"
  onClick={() => openNewObjectModal("rectangle")}
  className="rounded-xl bg-white/20 px-4 py-2 font-bold text-white"
>
  + Rectangle
</button>

<button
  type="button"
  onClick={() => openNewObjectModal("circle")}
  className="rounded-xl bg-white/20 px-4 py-2 font-bold text-white"
>
  + Rond
</button>
    <button
      type="button"
      onClick={loadFloor}
      className="rounded-xl bg-white/20 px-4 py-2 font-bold text-white"
    >
      Actualiser
    </button>
  </div>

  <div className="absolute left-8 top-20 right-8 bottom-8 rounded-2xl border-4 border-dashed border-blue-300/30">
  {visibleFloorObjects.map((object) => {
  const isCircle = object.object_type === "circle";
  const isText = object.object_type === "text";
  const isWall = object.object_type === "wall" || object.object_type === "line";

  return (
        <div
        key={`object-${object.id}`}
        onClick={(e) => {
            e.stopPropagation();
            setSelectedObject(object);
            setSelectedTable(null);
        }}
        onMouseDown={(e) => startDragObject(e, object)}
        onDoubleClick={(e) => {
            e.stopPropagation();
            editFloorObject(object);
        }}
        className={`absolute select-none ring-offset-2 ${
            object.is_locked ? "cursor-not-allowed" : "cursor-move"
        } ${
            Number(selectedObject?.id) === Number(object.id)
            ? "ring-4 ring-cyan-300"
            : ""
        }`}
      style={{
        left: `${Number(object.position_x || 0)}px`,
        top: `${Number(object.position_y || 0)}px`,
        width: `${Number(object.width || 120)}px`,
        height: `${Number(object.height || 40)}px`,
        transform: `rotate(${Number(object.rotation || 0)}deg)`,
        background:
          object.background_color && object.background_color !== "transparent"
            ? object.background_color
            : "transparent",
        borderColor:
          object.border_color && object.border_color !== "transparent"
            ? object.border_color
            : "transparent",
        color: object.text_color || "#ffffff",
        fontSize: `${Number(object.font_size || 16)}px`,
        borderWidth: `${Number(object.border_width || 0)}px`,
        borderStyle: Number(object.border_width || 0) > 0 ? "solid" : "none",
        borderRadius: isCircle ? "9999px" : isWall ? "4px" : "12px",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      title="Double clic pour modifier"
    >
      {isText ? (
        <div className="w-full text-center font-black">
          {object.label || "TEXTE"}
        </div>
      ) : (
        <div className="w-full text-center font-black">
          {object.label || ""}
        </div>
      )}
    </div>
  );
})}
    {visibleTables.map((table) => {
      const openSession = table.open_session || table.openSession;
      {floorObjects.map((object) => {
        const isCircle = object.object_type === "circle";
        const isText = object.object_type === "text";
        const isWall = object.object_type === "wall" || object.object_type === "line";

  return (
    <div
      key={`object-${object.id}`}
      onMouseDown={(e) => startDragObject(e, object)}
      onDoubleClick={() => editFloorObject(object)}
      className={`absolute select-none ${
        object.is_locked ? "cursor-not-allowed" : "cursor-move"
      }`}
      style={{
        left: `${Number(object.position_x || 0)}px`,
        top: `${Number(object.position_y || 0)}px`,
        width: `${Number(object.width || 120)}px`,
        height: `${Number(object.height || 40)}px`,
        transform: `rotate(${Number(object.rotation || 0)}deg)`,
        background: object.background_color || "transparent",
        borderColor: object.border_color || "transparent",
        color: object.text_color || "#ffffff",
        fontSize: `${Number(object.font_size || 16)}px`,
        borderWidth: `${Number(object.border_width || 0)}px`,
        borderStyle: object.border_width > 0 ? "solid" : "none",
        borderRadius: isCircle ? "9999px" : isWall ? "4px" : "12px",
        zIndex: 5,
      }}
      title="Double clic pour modifier"
    >
      <div className="flex h-full w-full items-center justify-center text-center font-black">
        {isText ? object.label : object.label || ""}
      </div>
    </div>
  );
})}

      return (
        <button
          key={table.id}
          type="button"
          onMouseDown={(e) => startDragTable(e, table)}
          onDoubleClick={() => editTable(table)}
          className={`absolute flex h-16 w-16 select-none items-center justify-center rounded-xl border-2 text-lg font-black shadow-lg transition hover:scale-105 ${statusClass(
            table.status
          )}`}
          style={{
            left: `${Number(table.position_x || 80)}px`,
            top: `${Number(table.position_y || 80)}px`,
            zIndex: 20,
          }}
          title={`${table.name} - ${statusLabel(table.status)}`}
        >
          <div className="text-center">
            <div>{table.name}</div>
            {openSession && (
              <div className="text-[9px] font-semibold">
                {openSession.guest_count || 1}p
              </div>
            )}
          </div>
        </button>
      );
    })}
  </div>
</div>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <div className="rounded-2xl bg-white p-5 shadow">
            <h2 className="mb-4 text-xl font-bold text-slate-800">
              Zone salle
            </h2>

            <div className="space-y-3">
              <select
                className="w-full rounded-xl border p-3"
                value={areaForm.site_id}
                onChange={(e) =>
                  setAreaForm((p) => ({ ...p, site_id: e.target.value }))
                }
              >
                <option value="">Site automatique</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>

              <input
                className="w-full rounded-xl border p-3"
                placeholder="Nom zone : Salle principale"
                value={areaForm.name}
                onChange={(e) =>
                  setAreaForm((p) => ({ ...p, name: e.target.value }))
                }
              />

              <input
                className="w-full rounded-xl border p-3"
                placeholder="Code : SALLE"
                value={areaForm.code}
                onChange={(e) =>
                  setAreaForm((p) => ({ ...p, code: e.target.value }))
                }
              />

              <input
                type="number"
                className="w-full rounded-xl border p-3"
                placeholder="Ordre"
                value={areaForm.sort_order}
                onChange={(e) =>
                  setAreaForm((p) => ({ ...p, sort_order: e.target.value }))
                }
              />

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(areaForm.is_active)}
                  onChange={(e) =>
                    setAreaForm((p) => ({
                      ...p,
                      is_active: e.target.checked,
                    }))
                  }
                />
                Zone active
              </label>

              <div className="flex gap-2">
                <button
                  onClick={saveArea}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white"
                >
                  {areaForm.id ? "Modifier zone" : "Créer zone"}
                </button>

                {areaForm.id && (
                  <button
                    onClick={resetAreaForm}
                    className="rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {visibleAreas.map((area) => (
                <div
                  key={area.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                >
                  <div>
                    <div className="font-bold">{area.name}</div>
                    <div className="text-xs text-slate-500">
                      {area.tables_count || 0} table(s)
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => editArea(area)}
                      className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700"
                    >
                      Modifier
                    </button>

                    <button
                      onClick={() => deleteArea(area)}
                      className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <h2 className="mb-4 text-xl font-bold text-slate-800">
              Table
            </h2>

            <div className="space-y-3">
              <select
                className="w-full rounded-xl border p-3"
                value={tableForm.restaurant_area_id}
                onChange={(e) =>
                  setTableForm((p) => ({
                    ...p,
                    restaurant_area_id: e.target.value,
                  }))
                }
              >
                <option value="">Choisir zone</option>
                {visibleAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>

              <input
                className="w-full rounded-xl border p-3"
                placeholder="Nom table : T1"
                value={tableForm.name}
                onChange={(e) =>
                  setTableForm((p) => ({ ...p, name: e.target.value }))
                }
              />

              <input
                className="w-full rounded-xl border p-3"
                placeholder="Code : T1"
                value={tableForm.code}
                onChange={(e) =>
                  setTableForm((p) => ({ ...p, code: e.target.value }))
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  className="rounded-xl border p-3"
                  placeholder="Capacité"
                  value={tableForm.capacity}
                  onChange={(e) =>
                    setTableForm((p) => ({
                      ...p,
                      capacity: e.target.value,
                    }))
                  }
                />

                <input
                  type="number"
                  className="rounded-xl border p-3"
                  placeholder="Ordre"
                  value={tableForm.sort_order}
                  onChange={(e) =>
                    setTableForm((p) => ({
                      ...p,
                      sort_order: e.target.value,
                    }))
                  }
                />
              </div>

              <select
                className="w-full rounded-xl border p-3"
                value={tableForm.status}
                onChange={(e) =>
                  setTableForm((p) => ({ ...p, status: e.target.value }))
                }
              >
                <option value="free">Libre</option>
                <option value="occupied">Occupée</option>
                <option value="reserved">Réservée</option>
                <option value="cleaning">À nettoyer</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                className="w-full rounded-xl border p-3"
                value={tableForm.shape}
                onChange={(e) =>
                  setTableForm((p) => ({ ...p, shape: e.target.value }))
                }
              >
                <option value="square">Carrée</option>
                <option value="round">Ronde</option>
                <option value="rectangle">Rectangle</option>
              </select>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(tableForm.is_active)}
                  onChange={(e) =>
                    setTableForm((p) => ({
                      ...p,
                      is_active: e.target.checked,
                    }))
                  }
                />
                Table active
              </label>

              <div className="flex gap-2">
                <button
                  onClick={saveTable}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white"
                >
                  {tableForm.id ? "Modifier table" : "Créer table"}
                </button>

                {tableForm.id && (
                  <button
                    onClick={resetTableForm}
                    className="rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>
          </div>

{selectedObject && (
  <div className="rounded-2xl bg-white p-5 shadow">
    <h2 className="mb-4 text-xl font-bold text-slate-800">
      Objet sélectionné
    </h2>

    <div className="mb-4 rounded-xl bg-slate-50 p-4">
      <div className="text-sm text-slate-500">Type</div>
      <div className="font-black">
        {selectedObject.object_type}
      </div>

      <div className="mt-2 text-sm text-slate-500">Libellé</div>
      <div className="font-semibold">
        {selectedObject.label || "-"}
      </div>
    </div>

    <div className="grid grid-cols-1 gap-3">
      <button
        type="button"
        onClick={() => editFloorObject(selectedObject)}
        className="w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white"
      >
        Modifier l’objet
      </button>

      <button
        type="button"
        onClick={() => deleteFloorObject(selectedObject)}
        className="w-full rounded-xl bg-red-700 px-4 py-3 font-bold text-white"
      >
        Supprimer l’objet
      </button>

      <button
        type="button"
        onClick={() => setSelectedObject(null)}
        className="w-full rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700"
      >
        Désélectionner
      </button>
    </div>
  </div>
)}


          {selectedTable && (
            
            <div className="rounded-2xl bg-white p-5 shadow">
              <h2 className="mb-4 text-xl font-bold text-slate-800">
                Actions table {selectedTable.name}
              </h2>

              <div className="mb-4 rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Statut</div>
                <div className="font-black">
                  {statusLabel(selectedTable.status)}
                </div>

                {selectedOpenSession && (
                  <div className="mt-2 text-sm text-slate-600">
                    Session : {selectedOpenSession.session_number}
                  </div>
                )}
              </div>

              {selectedTable.status !== "occupied" && (
                <div className="space-y-3">
                  <input
                    type="number"
                    min="1"
                    className="w-full rounded-xl border p-3"
                    placeholder="Nombre de couverts"
                    value={sessionForm.guest_count}
                    onChange={(e) =>
                      setSessionForm((p) => ({
                        ...p,
                        guest_count: e.target.value,
                      }))
                    }
                  />

                  <input
                    className="w-full rounded-xl border p-3"
                    placeholder="Nom client optionnel"
                    value={sessionForm.customer_name}
                    onChange={(e) =>
                      setSessionForm((p) => ({
                        ...p,
                        customer_name: e.target.value,
                      }))
                    }
                  />

                  <input
                    className="w-full rounded-xl border p-3"
                    placeholder="Téléphone optionnel"
                    value={sessionForm.customer_phone}
                    onChange={(e) =>
                      setSessionForm((p) => ({
                        ...p,
                        customer_phone: e.target.value,
                      }))
                    }
                  />

                  <textarea
                    className="w-full rounded-xl border p-3"
                    rows={2}
                    placeholder="Notes"
                    value={sessionForm.notes}
                    onChange={(e) =>
                      setSessionForm((p) => ({
                        ...p,
                        notes: e.target.value,
                      }))
                    }
                  />

                  <button
                    onClick={() => openTableSession(selectedTable)}
                    className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white"
                  >
                    Ouvrir table
                  </button>
                </div>
              )}

              {selectedTable.status === "occupied" && (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      toast("Commande par table en S24.2");
                    }}
                    className="w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white"
                  >
                    Ouvrir commande
                  </button>

                  <button
                    onClick={() => closeTableSession(selectedTable)}
                    className="w-full rounded-xl bg-amber-600 px-4 py-3 font-bold text-white"
                  >
                    Clôturer / à nettoyer
                  </button>

                  <button
                    onClick={() => cancelTableSession(selectedTable)}
                    className="w-full rounded-xl bg-red-700 px-4 py-3 font-bold text-white"
                  >
                    Annuler session
                  </button>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => changeTableStatus(selectedTable, "free")}
                  className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700"
                >
                  Libre
                </button>

                <button
                  onClick={() => changeTableStatus(selectedTable, "reserved")}
                  className="rounded-xl bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700"
                >
                  Réservée
                </button>

                <button
                  onClick={() => changeTableStatus(selectedTable, "cleaning")}
                  className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700"
                >
                  Nettoyage
                </button>

                <button
                  onClick={() => changeTableStatus(selectedTable, "inactive")}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
                >
                  Inactive
                </button>
              </div>

              <button
                onClick={() => deleteTable(selectedTable)}
                className="mt-4 w-full rounded-xl bg-red-100 px-4 py-3 font-bold text-red-700"
              >
                Supprimer table
              </button>
            </div>
          )}
        </div>
      </div>

      {quickTableModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
      <div className="rounded-t-2xl bg-purple-900 px-5 py-3 text-white">
        <h3 className="text-lg font-black">Numéro de table</h3>
      </div>

      <div className="space-y-4 p-5">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-600">
            Numéro de table
          </span>

          <input
            autoFocus
            className="w-full rounded-xl border p-3 text-xl font-black"
            value={quickTableName}
            onChange={(e) => setQuickTableName(e.target.value)}
            placeholder="Ex : B1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                createQuickTable();
              }
            }}
          />
        </label>

        <div className="grid grid-cols-3 gap-2">
          {["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "-", "DEL"].map(
            (key) => (
              <button
                key={key}
                type="button"
                className="rounded-xl bg-slate-100 py-4 text-xl font-black text-slate-800"
                onClick={() => {
                  if (key === "DEL") {
                    setQuickTableName((prev) => prev.slice(0, -1));
                  } else {
                    setQuickTableName((prev) => prev + key);
                  }
                }}
              >
                {key}
              </button>
            )
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setQuickTableModalOpen(false);
              setQuickTableName("");
            }}
            className="flex-1 rounded-xl bg-rose-600 px-4 py-3 font-bold text-white"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={createQuickTable}
            className="flex-1 rounded-xl bg-cyan-600 px-4 py-3 font-bold text-white"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{objectModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
      <div className="rounded-t-2xl bg-slate-900 px-5 py-3 text-white">
        <h3 className="text-lg font-black">
          {objectForm.id ? "Modifier objet" : "Ajouter objet au plan"}
        </h3>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <select
            className="rounded-xl border p-3"
            value={objectForm.object_type}
            onChange={(e) =>
              setObjectForm((p) => ({ ...p, object_type: e.target.value }))
            }
          >
            <option value="text">Texte</option>
            <option value="wall">Mur</option>
            <option value="rectangle">Rectangle</option>
            <option value="circle">Rond</option>
            <option value="line">Ligne</option>
          </select>

          <input
            className="rounded-xl border p-3"
            placeholder="Texte / libellé"
            value={objectForm.label}
            onChange={(e) =>
              setObjectForm((p) => ({ ...p, label: e.target.value }))
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            className="rounded-xl border p-3"
            placeholder="Largeur"
            value={objectForm.width}
            onChange={(e) =>
              setObjectForm((p) => ({ ...p, width: e.target.value }))
            }
          />

          <input
            type="number"
            className="rounded-xl border p-3"
            placeholder="Hauteur"
            value={objectForm.height}
            onChange={(e) =>
              setObjectForm((p) => ({ ...p, height: e.target.value }))
            }
          />

          <input
            type="number"
            className="rounded-xl border p-3"
            placeholder="Rotation"
            value={objectForm.rotation}
            onChange={(e) =>
              setObjectForm((p) => ({ ...p, rotation: e.target.value }))
            }
          />

          <input
            type="number"
            className="rounded-xl border p-3"
            placeholder="Taille texte"
            value={objectForm.font_size}
            onChange={(e) =>
              setObjectForm((p) => ({ ...p, font_size: e.target.value }))
            }
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="text-sm">
            Fond
            <input
              type="color"
              className="mt-1 h-11 w-full rounded-xl border"
              value={
                objectForm.background_color?.startsWith("#")
                  ? objectForm.background_color
                  : "#ffffff"
              }
              onChange={(e) =>
                setObjectForm((p) => ({
                  ...p,
                  background_color: e.target.value,
                }))
              }
            />
          </label>

          <label className="text-sm">
            Bordure
            <input
              type="color"
              className="mt-1 h-11 w-full rounded-xl border"
              value={
                objectForm.border_color?.startsWith("#")
                  ? objectForm.border_color
                  : "#ffffff"
              }
              onChange={(e) =>
                setObjectForm((p) => ({
                  ...p,
                  border_color: e.target.value,
                }))
              }
            />
          </label>

          <label className="text-sm">
            Texte
            <input
              type="color"
              className="mt-1 h-11 w-full rounded-xl border"
              value={
                objectForm.text_color?.startsWith("#")
                  ? objectForm.text_color
                  : "#ffffff"
              }
              onChange={(e) =>
                setObjectForm((p) => ({
                  ...p,
                  text_color: e.target.value,
                }))
              }
            />
          </label>
        </div>

        <input
          type="number"
          className="w-full rounded-xl border p-3"
          placeholder="Épaisseur bordure"
          value={objectForm.border_width}
          onChange={(e) =>
            setObjectForm((p) => ({ ...p, border_width: e.target.value }))
          }
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(objectForm.is_locked)}
            onChange={(e) =>
              setObjectForm((p) => ({ ...p, is_locked: e.target.checked }))
            }
          />
          Verrouiller l’objet
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setObjectModalOpen(false);
              setSelectedObject(null);
            }}
            className="flex-1 rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700"
          >
            Annuler
          </button>

          {objectForm.id && (
            <button
              type="button"
              onClick={() => deleteFloorObject(selectedObject)}
              className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-bold text-white"
            >
              Supprimer
            </button>
          )}

          <button
            type="button"
            onClick={saveFloorObject}
            className="flex-1 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>

  );
}