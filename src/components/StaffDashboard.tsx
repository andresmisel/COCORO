import React, { useState, useEffect } from "react";
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  getDoc,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Registration, StaffRole, Status, Config } from "../types";
import { 
  LogOut, 
  Download, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Edit3, 
  QrCode, 
  Briefcase,
  Layers,
  Database,
  Search,
  Filter,
  BarChart3,
  Users
} from "lucide-react";
import * as XLSX from "xlsx";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import AdminPanel from "./AdminPanel";
import OpsPanel from "./OpsPanel";
import SuperAdminPanel from "./SuperAdminPanel";

interface Props {
  role: StaffRole;
  onLogout: () => void;
}

export default function StaffDashboard({ role, onLogout }: Props) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "stats" | "config">("list");

  useEffect(() => {
    const q = query(collection(db, "registrations"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
      setRegistrations(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "registrations");
    });

    return () => unsubscribe();
  }, []);

  const filteredRegistrations = registrations.filter(r => 
    r.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.idNumber.includes(searchTerm)
  );

  const getDashboardTitle = () => {
    switch (role) {
      case "admin": return "Panel de Administración";
      case "ops": return "Panel de Operaciones";
      case "superadmin": return "Super Administrador";
      default: return "Dashboard";
    }
  };

  const exportToExcel = (data: Registration[], fileName: string) => {
    const cleanData = data.map(r => ({
      Nombre: r.firstName,
      Apellido: r.lastName,
      Cedula: r.idNumber,
      Email: r.email,
      WhatsApp: r.whatsapp,
      Grupo_Scout: r.scoutGroup,
      Distrito: r.scoutDistrict,
      Provincia: r.scoutProvince,
      Referencia: r.bankReference,
      Monto: r.amount,
      Fecha_Pago: r.paymentDate,
      Admin_Status: r.adminStatus,
      Ops_Status: r.opsStatus,
      Check_In: r.checkedIn ? "SI" : "NO",
      Observaciones: r.adminObservations || ""
    }));

    const ws = XLSX.utils.json_to_sheet(cleanData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participantes");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-primary font-bold uppercase tracking-widest text-xs">Cargando Sistema...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center space-x-2 text-primary mb-1">
            {role === 'admin' && <Briefcase className="w-4 h-4" />}
            {role === 'ops' && <Layers className="w-4 h-4" />}
            {role === 'superadmin' && <Database className="w-4 h-4" />}
            <span className="text-[10px] font-bold uppercase tracking-widest">Módulo {role}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 uppercase italic tracking-tight">{getDashboardTitle()}</h1>
        </div>
        
        <button 
          onClick={onLogout}
          className="flex items-center space-x-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 px-4 py-2 rounded-xl transition-all font-bold text-sm uppercase"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </header>

      {/* Tabs / Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-gray-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab("list")}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold uppercase text-xs transition-all ${activeTab === 'list' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Users className="w-4 h-4" />
            <span>Inscritos</span>
          </button>
          <button 
            onClick={() => setActiveTab("stats")}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold uppercase text-xs transition-all ${activeTab === 'stats' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Métricas</span>
          </button>
          {role === 'superadmin' && (
            <button 
              onClick={() => setActiveTab("config")}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold uppercase text-xs transition-all ${activeTab === 'config' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Database className="w-4 h-4" />
              <span>Configuración</span>
            </button>
          )}
        </div>

        <div className="relative w-full md:w-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Buscar por Nombre o Cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-80 pl-11 pr-4 py-2.5 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary/20 text-sm"
          />
        </div>
      </div>

      {activeTab === "list" && (
        <div className="space-y-6">
          {role === "admin" && (
            <AdminPanel 
              registrations={filteredRegistrations} 
              onExport={() => exportToExcel(filteredRegistrations, "Pagos_Comunidad_Rover")}
            />
          )}

          {role === "ops" && (
            <OpsPanel 
              registrations={filteredRegistrations} 
              onExportAll={() => exportToExcel(filteredRegistrations, "Inscritos_Comunidad_Rover")}
              onExportAttendees={() => exportToExcel(filteredRegistrations.filter(r => r.checkedIn), "Asistentes_Comunidad_Rover")}
            />
          )}

          {role === "superadmin" && (
            <SuperAdminPanel 
              registrations={filteredRegistrations} 
              onExport={() => exportToExcel(filteredRegistrations, "Base_Datos_Completa")}
            />
          )}
        </div>
      )}

      {activeTab === "stats" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Inscritos" value={registrations.length} color="primary" />
          <StatCard title="Pagos Aprobados" value={registrations.filter(r => r.adminStatus === Status.APPROVED).length} color="green" />
          <StatCard title="Validados Ops" value={registrations.filter(r => r.opsStatus === Status.APPROVED).length} color="blue" />
          <StatCard title="En el Evento" value={registrations.filter(r => r.checkedIn).length} color="amber" />
        </div>
      )}

      {activeTab === "config" && role === "superadmin" && (
        <ConfigEditor />
      )}
    </div>
  );
}

function StatCard({ title, value, color }: { title: string, value: number, color: string }) {
  const colors: any = {
    primary: "border-primary/20 text-primary bg-primary/5",
    green: "border-green-100 text-green-600 bg-green-50",
    blue: "border-blue-100 text-blue-600 bg-blue-50",
    amber: "border-amber-100 text-amber-600 bg-amber-50"
  };
  
  return (
    <div className={`p-8 rounded-3xl border-2 transition-all hover:scale-[1.02] ${colors[color]}`}>
      <h3 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">{title}</h3>
      <p className="text-5xl font-black italic">{value}</p>
    </div>
  );
}

function ConfigEditor() {
  const [config, setConfig] = useState<Config>({ bankDetails: "", eventDate: "", eventLocation: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, "config", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data() as Config);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "global"), config);
      alert("Configuración guardada correctamente");
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, "config/global");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-8">
      <h3 className="text-xl font-bold uppercase italic border-b pb-4">Configuración del Evento</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Fecha del Evento</label>
          <input 
            type="text"
            value={config.eventDate}
            onChange={(e) => setConfig({ ...config, eventDate: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
            placeholder="Ej: 15-18 de Octubre, 2026"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Ubicación</label>
          <input 
            type="text"
            value={config.eventLocation}
            onChange={(e) => setConfig({ ...config, eventLocation: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
            placeholder="Ej: Hacienda El Limón, Ávila"
          />
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Datos Bancarios (En Registro):</label>
        <textarea 
          value={config.bankDetails}
          onChange={(e) => setConfig({ ...config, bankDetails: e.target.value })}
          className="w-full h-40 p-4 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary font-mono text-sm leading-relaxed"
          placeholder="Ingrese los datos de transferencia..."
        />
      </div>

      <button 
        onClick={handleSave}
        disabled={saving}
        className="bg-primary text-white px-8 py-3 rounded-2xl font-bold uppercase hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center space-x-2"
      >
        {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>Guardar Todos los Cambios</span>}
      </button>
    </div>
  );
}
