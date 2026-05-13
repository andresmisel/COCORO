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
  orderBy,
  where
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Registration, StaffRole, Status, Config, Payment, PaymentMethod } from "../types";
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
  Users,
  DollarSign
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "progress" | "stats" | "config">("list");

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, "config", "global"));
        if (configDoc.exists()) {
          setConfig(configDoc.data() as Config);
        }
      } catch (e) {
        console.error("Error fetching config", e);
      }
    };
    fetchConfig();

    const qReg = query(collection(db, "registrations"), orderBy("createdAt", "desc"));
    const unsubReg = onSnapshot(qReg, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
      setRegistrations(data);
      if (payments.length > 0 || snapshot.empty) {
         setLoading(false);
      }
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, "registrations");
    });

    const qPay = query(collection(db, "payments"), orderBy("createdAt", "desc"));
    const unsubPay = onSnapshot(qPay, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
      setPayments(data);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, "payments");
    });

    return () => {
      unsubReg();
      unsubPay();
    };
  }, []);

  const filteredRegistrations = registrations.filter(r => 
    r.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.idNumber.includes(searchTerm)
  );

  const filteredPayments = payments.filter(p => {
    const r = registrations.find(reg => reg.idNumber === p.idNumber);
    const search = searchTerm.toLowerCase();
    return (
      p.idNumber.includes(searchTerm) ||
      (p.bankReference && p.bankReference.toLowerCase().includes(search)) ||
      (p.receiptNumber && p.receiptNumber.toLowerCase().includes(search)) ||
      (r && (r.firstName.toLowerCase().includes(search) || r.lastName.toLowerCase().includes(search)))
    );
  });

  const totalUSDApproved = payments
    .filter(p => p.status === Status.APPROVED)
    .reduce((acc, p) => acc + p.amountUSD, 0);

  const getDashboardTitle = () => {
    switch (role) {
      case "admin": return "Panel de Administración";
      case "ops": return "Panel de Operaciones";
      case "superadmin": return "Super Administrador";
      default: return "Dashboard";
    }
  };

  const exportToExcel = (data: Registration[], fileName: string, includePayments: boolean = false) => {
    let cleanData: any[] = [];

    const getMembershipStatus = (status: Status) => {
      switch (status) {
        case Status.APPROVED: return "Vigente";
        case Status.REJECTED: return "Vencido";
        default: return "Pendiente";
      }
    };

    if (includePayments) {
      // Export Payments Report
      cleanData = payments.map(p => {
        const r = registrations.find(reg => reg.idNumber === p.idNumber);
        return {
          Nombre_y_Apellido: r ? `${r.firstName} ${r.lastName}` : "N/A",
          Cedula: p.idNumber,
          Grupo: r?.scoutGroup || "N/A",
          Tipo_Membresia: r?.membershipType || "N/A",
          Status_Membresia: r ? getMembershipStatus(r.opsStatus) : "N/A",
          ID_Reporte: p.id,
          Metodo: p.paymentMethod,
          Monto: p.amount,
          Tasa: p.exchangeRate || "N/A",
          Equivalente_USD: p.amountUSD,
          Referencia_Recibo: p.paymentMethod === PaymentMethod.TRANSFER ? p.bankReference : p.receiptNumber,
          Status_Pago: p.status,
          Fecha_Pago: p.paymentDate,
          Fecha_Reporte: p.createdAt
        };
      });
    } else {
      // Export Registrations Report or Accumulated Report
      cleanData = data.map(r => {
        const userPayments = payments.filter(p => p.idNumber === r.idNumber && p.status === Status.APPROVED);
        const totalPaidUSD = userPayments.reduce((acc, p) => acc + p.amountUSD, 0);
        
        const rawMissingUSD = config ? Math.max(0, config.totalCostUSD - totalPaidUSD) : 0;
        const missingUSD = rawMissingUSD < 0.01 ? 0 : rawMissingUSD;
        
        return {
          Nombre_y_Apellido: `${r.firstName} ${r.lastName}`,
          Cedula: r.idNumber,
          Grupo: r.scoutGroup,
          Tipo_Membresia: r.membershipType,
          Status_Membresia: getMembershipStatus(r.opsStatus),
          Email: r.email,
          Solvencia_Pago: missingUSD <= 0 ? "COMPLETADO" : "PENDIENTE",
          Monto_Acumulado_USD: totalPaidUSD.toFixed(2),
          Monto_Faltante_USD: missingUSD.toFixed(2),
          Check_In: r.checkedIn ? "SI" : "NO",
          Fecha_CheckIn: r.checkInTime || "N/A",
          Fecha_Registro: r.createdAt
        };
      });
    }

    const ws = XLSX.utils.json_to_sheet(cleanData);
    const wb = XLSX.utils.book_new();
    const sheetName = includePayments ? "Pagos" : "Participantes";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
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
            <DollarSign className="w-4 h-4" />
            <span>Cobranza</span>
          </button>
          <button 
            onClick={() => setActiveTab("progress")}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold uppercase text-xs transition-all ${activeTab === 'progress' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Users className="w-4 h-4" />
            <span>Participantes</span>
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
          {(role === "admin" || role === "superadmin") && (
            <AdminPanel 
              payments={filteredPayments}
              registrations={registrations}
              searchTerm={searchTerm}
              onExport={() => exportToExcel(filteredRegistrations, "Pagos_Comunidad_Rover", true)}
            />
          )}

          {role === "ops" && (
            <OpsPanel 
              registrations={filteredRegistrations} 
              payments={payments}
              config={config}
              onExportAll={() => exportToExcel(filteredRegistrations, "Inscritos_Comunidad_Rover")}
              onExportAttendees={() => exportToExcel(filteredRegistrations.filter(r => r.checkedIn), "Asistentes_Comunidad_Rover")}
            />
          )}

          {role === "superadmin" && (
            <SuperAdminPanel 
              registrations={filteredRegistrations}
              payments={payments}
              onExport={() => exportToExcel(filteredRegistrations, "Base_Datos_Completa")}
            />
          )}
        </div>
      )}

      {activeTab === "progress" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => exportToExcel(filteredRegistrations, "Reporte_Acumulado_Participantes")}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl transition-all font-bold text-xs uppercase shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Reporte Acumulado</span>
            </button>
          </div>
          <ProgressPanel 
            registrations={filteredRegistrations}
            payments={payments}
            config={config}
          />
        </div>
      )}

      {activeTab === "stats" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Inscritos" value={registrations.length} color="primary" />
          <StatCard title="Pagos Aprobados ($)" value={totalUSDApproved.toFixed(2)} isUSD color="green" />
          <StatCard title="Membresías Vigentes" value={registrations.filter(r => r.opsStatus === Status.APPROVED).length} color="blue" />
          <StatCard title="Asistentes (Check-In)" value={registrations.filter(r => r.checkedIn).length} color="amber" />
        </div>
      )}

      {activeTab === "config" && role === "superadmin" && (
        <ConfigEditor />
      )}
    </div>
  );
}

function ProgressPanel({ registrations, payments, config }: { registrations: Registration[], payments: Payment[], config: Config | null }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {registrations.map(r => {
        const approvedPayments = payments.filter(p => p.idNumber === r.idNumber && p.status === Status.APPROVED);
        const totalPaid = approvedPayments.reduce((acc, p) => acc + p.amountUSD, 0);
        const goal = config?.totalCostUSD || 0;
        const rawMissing = config ? Math.max(0, config.totalCostUSD - totalPaid) : 0;
        const missing = rawMissing < 0.01 ? 0 : rawMissing;
        const isCompletado = missing <= 0;
        const progress = goal > 0 ? Math.min(100, (totalPaid / goal) * 100) : 0;

        return (
          <div key={r.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <h4 className="font-bold text-gray-900 uppercase text-sm truncate max-w-[150px]">{r.firstName} {r.lastName}</h4>
                <p className="text-[10px] text-gray-400 font-mono">V-{r.idNumber}</p>
              </div>
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${isCompletado ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                {isCompletado ? 'Completado' : 'Incompleto'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
               <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                 r.opsStatus === Status.APPROVED ? 'bg-blue-100 text-blue-600' : 
                 r.opsStatus === Status.REJECTED ? 'bg-red-100 text-red-600' : 
                 'bg-gray-100 text-gray-500'
               }`}>
                 {r.opsStatus === Status.APPROVED ? 'Vigente' : r.opsStatus === Status.REJECTED ? 'Vencido' : 'Pendiente'}
               </span>
               <span className="text-[9px] text-gray-400 font-bold uppercase">{r.membershipType}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <span>Progreso de Pago</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${totalPaid >= goal ? 'bg-green-500' : 'bg-primary'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Acumulado</p>
                <p className="text-lg font-black text-gray-900">${totalPaid.toFixed(2)}</p>
              </div>
              <div className="space-y-0.5 text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Faltante</p>
                <p className="text-lg font-black text-primary">${missing.toFixed(2)}</p>
              </div>
            </div>
          </div>
        );
      })}
      {registrations.length === 0 && (
        <div className="col-span-full py-20 text-center text-gray-400 uppercase font-bold text-xs">
          No se encontraron participantes con los filtros actuales.
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, color, isUSD }: { title: string, value: any, color: string, isUSD?: boolean }) {
  const colors: any = {
    primary: "border-primary/20 text-primary bg-primary/5",
    green: "border-green-100 text-green-600 bg-green-50",
    blue: "border-blue-100 text-blue-600 bg-blue-50",
    amber: "border-amber-100 text-amber-600 bg-amber-50"
  };
  
  return (
    <div className={`p-8 rounded-3xl border-2 transition-all hover:scale-[1.02] ${colors[color]}`}>
      <h3 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">{title}</h3>
      <p className="text-4xl sm:text-5xl font-black italic">
        {isUSD && <span className="text-2xl mr-1">$</span>}
        {value}
      </p>
    </div>
  );
}

function ConfigEditor() {
  const [config, setConfig] = useState<Config>({ 
    bankDetails: "", 
    cashDetails: "",
    eventDate: "", 
    eventLocation: "",
    totalCostUSD: 0,
    registrationDeadline: ""
  });
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Monto Total del Evento ($)</label>
          <input 
            type="number"
            value={config.totalCostUSD}
            onChange={(e) => setConfig({ ...config, totalCostUSD: parseFloat(e.target.value) })}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
            placeholder="Ej: 35.00"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Fecha Límite Registro</label>
          <input 
            type="date"
            value={config.registrationDeadline}
            onChange={(e) => setConfig({ ...config, registrationDeadline: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Instrucciones de Transferencia:</label>
          <textarea 
            value={config.bankDetails}
            onChange={(e) => setConfig({ ...config, bankDetails: e.target.value })}
            className="w-full h-40 p-4 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary font-mono text-sm leading-relaxed"
            placeholder="Ingrese los datos de transferencia..."
          />
        </div>
        <div className="space-y-4">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Instrucciones de Efectivo:</label>
          <textarea 
            value={config.cashDetails}
            onChange={(e) => setConfig({ ...config, cashDetails: e.target.value })}
            className="w-full h-40 p-4 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary font-mono text-sm leading-relaxed"
            placeholder="Ingrese las instrucciones para efectivo..."
          />
        </div>
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
