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
import { Registration, StaffRole, Status, Config, Payment, PaymentMethod, EventPhase } from "../types";
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
  DollarSign,
  ShieldCheck,
  Key,
  Plus,
  User,
  ExternalLink,
  Image,
  HeartPulse,
  UserCheck,
  ClipboardSignature
} from "lucide-react";
import * as XLSX from "xlsx";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { DARK_PALETTE } from "../constants";
import AdminPanel from "./AdminPanel";
import ScanEntry from "./ScanEntry";
import OpsPanel from "./OpsPanel";
import SuperAdminPanel from "./SuperAdminPanel";
import EvaluationDashboard from "./EvaluationDashboard";
import ParticipantNews from "./ParticipantNews";
import { generateMedicalPDF } from "../lib/pdf-utils";
import { StaffMember } from "../types";

interface Props {
  role: StaffRole;
  staffName: string;
  onLogout: () => void;
}

export default function StaffDashboard({ role, staffName, onLogout }: Props) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "progress" | "stats" | "config" | "staff_mgmt" | "medical" | "evaluation" | "noticias" | "scanner">(
    role === 'scanner' ? "scanner" : role === 'risk' ? "medical" : role === 'comunicaciones' ? "noticias" : "list"
  );
  const [editingMedical, setEditingMedical] = useState<Registration | null>(null);

  useEffect(() => {
    if (role === "comunicaciones" || role === "superadmin") {
      sessionStorage.setItem("prensa_auth", "true");
      sessionStorage.setItem("prensa_author_name", staffName || "Prensa Oficial del Congreso");
    }
  }, [role, staffName]);

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

    const qReg = query(collection(db, "registrations"));
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
      case "risk": return "Gestión de Riesgo";
      case "comunicaciones": return "Panel de Comunicaciones";
      default: return "Dashboard";
    }
  };

  const exportMedicalToExcel = () => {
    const medicalData = registrations.map(r => ({
      Nombre: `${r.firstName} ${r.lastName}`,
      Cedula: r.idNumber,
      Grupo: r.scoutGroup,
      Tipo_Sangre: r.medicalData?.bloodType || "N/A",
      Peso: r.medicalData?.weight || "N/A",
      Estatura: r.medicalData?.height || "N/A",
      Alergias: r.medicalData?.allergies || "N/A",
      Intolerancias: r.medicalData?.intolerances || "N/A",
      Discapacidad: r.medicalData?.disability?.has ? `SI (${r.medicalData.disability.description})` : "NO",
      Antecedentes_Medicos: r.medicalData?.antecedents || "N/A",
      Medicamentos: r.medicalData?.medications || "N/A",
      Contacto_Emergencia: r.medicalData?.emergencyContactName || "N/A",
      Telefono_Emergencia: r.medicalData?.emergencyContactPhone || "N/A",
    }));

    const ws = XLSX.utils.json_to_sheet(medicalData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fichas_Medicas");
    XLSX.writeFile(wb, "Reporte_Medico_Participantes.xlsx");
  };

  const handleDeleteMedical = async (registrationId: string) => {
    try {
      await updateDoc(doc(db, "registrations", registrationId), {
        medicalData: null
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `registrations/${registrationId}`);
    }
  };

  const handleUpdateMedical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedical || !editingMedical.medicalData) return;

    try {
      await updateDoc(doc(db, "registrations", editingMedical.id), {
        medicalData: editingMedical.medicalData
      });
      setEditingMedical(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `registrations/${editingMedical.id}`);
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
          Aprobado_Por: (p.approvedBy || "N/A").replace("Sistema (Leindenz)", "Sistema Admin").replace("Sistema (Andres)", "Sistema Ops"),
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
          Talla_Franela: r.tshirtSize || "S/T",
          Status_Membresia: getMembershipStatus(r.opsStatus),
          Validado_Por: (r.validatedBy || "N/A").replace("Sistema (Leindenz)", "Sistema Admin").replace("Sistema (Andres)", "Sistema Ops"),
          Email: r.email,
          Solvencia_Pago: missingUSD <= 0 ? "COMPLETADO" : "PENDIENTE",
          Monto_Acumulado_USD: totalPaidUSD.toFixed(2),
          Monto_Faltante_USD: missingUSD.toFixed(2),
          Check_In: r.checkedIn ? "SI" : "NO",
          CheckIn_Por: (r.checkedInBy || "N/A").replace("Sistema (Leindenz)", "Sistema Admin").replace("Sistema (Andres)", "Sistema Ops"),
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
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex overflow-x-auto pb-2 md:pb-0 bg-gray-100 p-1.5 rounded-2xl no-scrollbar">
          {(role === "admin" || role === "superadmin") && (
            <button 
              onClick={() => setActiveTab("list")}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] md:text-xs transition-all flex-shrink-0 ${activeTab === 'list' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Pagos</span>
            </button>
          )}
          {role !== "scanner" && (
            <button 
              onClick={() => setActiveTab("progress")}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] md:text-xs transition-all flex-shrink-0 ${activeTab === 'progress' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Users className="w-4 h-4" />
              <span>Participantes</span>
            </button>
          )}
          {role !== "scanner" && (
            <button 
              onClick={() => setActiveTab("stats")}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] md:text-xs transition-all flex-shrink-0 ${activeTab === 'stats' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Métricas</span>
            </button>
          )}
          {(role === 'superadmin' || role === 'risk') && (
            <button 
              onClick={() => setActiveTab("medical")}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] md:text-xs transition-all flex-shrink-0 ${activeTab === 'medical' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <HeartPulse className="w-4 h-4" />
              <span>Médico</span>
            </button>
          )}
          {role === 'superadmin' && (
            <>
              <button 
                onClick={() => setActiveTab("config")}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] md:text-xs transition-all flex-shrink-0 ${activeTab === 'config' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Database className="w-4 h-4" />
                <span>Configuracion</span>
              </button>
              <button 
                onClick={() => setActiveTab("staff_mgmt")}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] md:text-xs transition-all flex-shrink-0 ${activeTab === 'staff_mgmt' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Personal</span>
              </button>
            </>
          )}
          {role !== "scanner" && (
            <button 
              onClick={() => setActiveTab("evaluation")}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] md:text-xs transition-all flex-shrink-0 ${activeTab === 'evaluation' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <ClipboardSignature className="w-4 h-4" />
              <span>Evaluación</span>
            </button>
          )}
          {(role === 'superadmin' || role === 'comunicaciones') && (
            <button 
              onClick={() => setActiveTab("noticias")}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] md:text-xs transition-all flex-shrink-0 ${activeTab === 'noticias' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Image className="w-4 h-4" />
              <span>Noticias</span>
            </button>
          )}
          {(role === "scanner" || role === "superadmin") && (
            <button 
              onClick={() => setActiveTab("scanner")}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] md:text-xs transition-all flex-shrink-0 ${activeTab === 'scanner' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <QrCode className="w-4 h-4" />
              <span>Scanner</span>
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

      {activeTab === "scanner" && (
        <ScanEntry config={config} />
      )}

      {activeTab === "list" && (
        <div className="space-y-6">
          {(role === "admin" || role === "superadmin") && (
            <AdminPanel 
              payments={filteredPayments}
              registrations={registrations}
              searchTerm={searchTerm}
              staffName={staffName}
              role={role}
              config={config}
              onExport={() => exportToExcel(filteredRegistrations, "Pagos_Comunidad_Rover", true)}
            />
          )}

          {role === "ops" && (
            <OpsPanel 
              registrations={filteredRegistrations} 
              payments={payments}
              config={config}
              staffName={staffName}
              role={role}
              onExportAll={() => exportToExcel(filteredRegistrations, "Inscritos_Comunidad_Rover")}
              onExportAttendees={() => exportToExcel(filteredRegistrations.filter(r => r.checkedIn), "Asistentes_Comunidad_Rover")}
            />
          )}

          {role === "superadmin" && (
            <SuperAdminPanel 
              registrations={filteredRegistrations}
              payments={payments}
              staffName={staffName}
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

      {activeTab === "medical" && (role === "superadmin" || role === "risk") && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="font-bold uppercase italic text-gray-500 text-xs tracking-widest pl-2">Gestión de Riesgo y Salud</h3>
            <button 
              onClick={exportMedicalToExcel}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold uppercase text-xs hover:bg-green-700 transition-all shadow-lg"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel Médico</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRegistrations.map(r => (
              <div key={r.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between hover:border-amber-200 transition-colors">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`${r.medicalData ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'} p-3 rounded-2xl relative`}>
                      <HeartPulse className="w-6 h-6" />
                      {!r.medicalData && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="bg-gray-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase text-gray-500 mb-1">
                        V-{r.idNumber}
                      </span>
                      {!r.medicalData && (
                        <span className="text-[10px] font-black text-red-600 uppercase italic tracking-tighter">Pendiente</span>
                      )}
                    </div>
                  </div>
                  <h4 className="font-black text-gray-900 uppercase italic text-lg leading-tight mb-1">
                    {r.firstName} {r.lastName}
                  </h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">
                    {r.scoutGroup}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 p-2 rounded-xl">
                      <p className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Tipo Sangre</p>
                      <p className="font-bold text-primary">{r.medicalData?.bloodType || "---"}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-xl">
                      <p className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Talla Franela</p>
                      <p className="font-bold text-indigo-600 uppercase">{r.tshirtSize || "S/T"}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-xl col-span-2">
                      <p className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Alergias</p>
                      <p className="font-bold text-sm truncate">{r.medicalData?.allergies || "Ninguna"}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-xl col-span-2">
                      <p className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Antecedentes</p>
                      <p className="font-bold text-sm truncate">{r.medicalData?.antecedents || "Ninguno"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button 
                    onClick={() => generateMedicalPDF(r, config)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-gray-900 text-white py-3 rounded-xl font-bold uppercase text-[10px] hover:bg-black transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>PDF</span>
                  </button>
                  {role === "superadmin" && (
                    <>
                      <button 
                        onClick={() => setEditingMedical(r)}
                        className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
                        title="Editar Ficha"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteMedical(r.id)}
                        className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                        title="Eliminar Ficha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Edit Medical Modal */}
          {editingMedical && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto outline-none animate-in fade-in zoom-in duration-300">
                <div className="sticky top-0 bg-white/80 backdrop-blur-md px-8 py-6 border-b border-gray-100 flex justify-between items-center z-10">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase italic">Editar Ficha Médica</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{editingMedical.firstName} {editingMedical.lastName}</p>
                  </div>
                  <button onClick={() => setEditingMedical(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <XCircle className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <form onSubmit={handleUpdateMedical} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sangre</label>
                      <select 
                        required
                        value={editingMedical.medicalData?.bloodType}
                        onChange={(e) => setEditingMedical({ ...editingMedical, medicalData: { ...editingMedical.medicalData!, bloodType: e.target.value } })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm"
                      >
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Peso (kg)</label>
                      <input 
                        type="text"
                        value={editingMedical.medicalData?.weight}
                        onChange={(e) => setEditingMedical({ ...editingMedical, medicalData: { ...editingMedical.medicalData!, weight: e.target.value } })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Estatura (cm)</label>
                      <input 
                        type="text"
                        value={editingMedical.medicalData?.height}
                        onChange={(e) => setEditingMedical({ ...editingMedical, medicalData: { ...editingMedical.medicalData!, height: e.target.value } })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Alergias</label>
                      <input 
                        type="text"
                        value={editingMedical.medicalData?.allergies}
                        onChange={(e) => setEditingMedical({ ...editingMedical, medicalData: { ...editingMedical.medicalData!, allergies: e.target.value } })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Intolerancias</label>
                      <input 
                        type="text"
                        value={editingMedical.medicalData?.intolerances}
                        onChange={(e) => setEditingMedical({ ...editingMedical, medicalData: { ...editingMedical.medicalData!, intolerances: e.target.value } })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Antecedentes Médicos</label>
                    <textarea 
                      value={editingMedical.medicalData?.antecedents}
                      onChange={(e) => setEditingMedical({ ...editingMedical, medicalData: { ...editingMedical.medicalData!, antecedents: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm h-20"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Discapacidad</label>
                      <div className="flex space-x-4 py-2">
                        <label className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            checked={editingMedical.medicalData?.disability?.has === true} 
                            onChange={() => setEditingMedical({ ...editingMedical, medicalData: { ...editingMedical.medicalData!, disability: { ...editingMedical.medicalData!.disability!, has: true } } })}
                          />
                          <span className="text-sm">Sí</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            checked={editingMedical.medicalData?.disability?.has === false} 
                            onChange={() => setEditingMedical({ ...editingMedical, medicalData: { ...editingMedical.medicalData!, disability: { has: false, description: "" } } })}
                          />
                          <span className="text-sm">No</span>
                        </label>
                      </div>
                      {editingMedical.medicalData?.disability?.has && (
                        <input 
                          type="text"
                          value={editingMedical.medicalData.disability.description}
                          onChange={(e) => setEditingMedical({ ...editingMedical, medicalData: { ...editingMedical.medicalData!, disability: { ...editingMedical.medicalData!.disability!, description: e.target.value } } })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-xs"
                          placeholder="Descripción"
                        />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Medicamentos</label>
                      <input 
                        type="text"
                        value={editingMedical.medicalData?.medications}
                        onChange={(e) => setEditingMedical({ ...editingMedical, medicalData: { ...editingMedical.medicalData!, medications: e.target.value } })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex space-x-4">
                    <button 
                      type="submit"
                      className="flex-1 bg-primary text-white py-3 rounded-2xl font-bold uppercase hover:bg-primary-dark transition-all"
                    >
                      Guardar Cambios
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEditingMedical(null)}
                      className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-2xl font-bold uppercase hover:bg-gray-200 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "stats" && (
        <div className="space-y-12">
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Inscritos" value={registrations.length} color="primary" />
            <StatCard title={`Pagos Aprobados (${config?.currency || "$"})`} value={totalUSDApproved.toFixed(2)} isUSD currency={config?.currency || "$"} color="green" />
            <StatCard title="Membresías Vigentes" value={registrations.filter(r => r.opsStatus === Status.APPROVED).length} color="blue" />
            <StatCard title="Asistentes (General)" value={registrations.filter(r => r.checkedIn).length} color="amber" />
          </div>

          {/* Phase Attendance Stats */}
          {config?.phases && config.phases.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 border-b border-gray-100 pb-4">
                <Users className="w-5 h-5 text-gray-400" />
                <h3 className="text-xl font-black text-gray-900 uppercase italic">Asistencia por Fase</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {config.phases.map((phase) => {
                  const attendees = registrations.filter(r => r.phaseAttendance?.[phase.id]?.attended).length;
                  return (
                    <div 
                      key={phase.id} 
                      className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all border-l-4"
                      style={{ borderLeftColor: phase.color }}
                    >
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{phase.name}</p>
                        <p className="text-3xl font-black italic text-gray-800">{attendees}</p>
                      </div>
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 transition-colors"
                        style={{ color: phase.color }}
                      >
                        <UserCheck className="w-5 h-5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "evaluation" && (
        <EvaluationDashboard role={role} />
      )}

      {activeTab === "noticias" && (role === "comunicaciones" || role === "superadmin") && (
        <ParticipantNews isSection={false} />
      )}

      {activeTab === "config" && role === "superadmin" && (
        <ConfigEditor />
      )}

      {activeTab === "staff_mgmt" && role === "superadmin" && (
        <StaffManager />
      )}
    </div>
  );
}

function StaffManager() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPassId, setEditingPassId] = useState<string | null>(null);
  const [tempPass, setTempPass] = useState("");
  const [newStaff, setNewStaff] = useState<Partial<StaffMember>>({
    name: "",
    password: "",
    role: "admin"
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "staff"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember));
      setStaff(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.password || !newStaff.role) return;
    
    setSaving(true);
    try {
      const staffDoc = {
        name: newStaff.name,
        password: newStaff.password,
        role: newStaff.role,
        createdAt: new Date().toISOString()
      };
      await addStaffMember(staffDoc as Omit<StaffMember, "id">);
      setNewStaff({ name: "", password: "", role: "admin" });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const addStaffMember = async (data: Omit<StaffMember, "id">) => {
    const staffRef = collection(db, "staff");
    await setDoc(doc(staffRef), data);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "staff", id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePassword = async (id: string, newPass: string) => {
    if (!newPass) return;
    try {
      await updateDoc(doc(db, "staff", id), { password: newPass });
      setEditingPassId(null);
      setTempPass("");
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-8">
      {/* Add Form */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold uppercase italic border-b pb-4 mb-6 flex items-center space-x-2">
          <Plus className="w-5 h-5 text-primary" />
          <span>Crear Nuevo Miembro Staff</span>
        </h3>
        
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Nombre</label>
            <input 
              required
              type="text"
              value={newStaff.name}
              onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm"
              placeholder="Ej. María Pérez"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Contraseña</label>
            <input 
              required
              type="text"
              value={newStaff.password}
              onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
              placeholder="Min 6 caracteres"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Rol</label>
            <select
              required
              value={newStaff.role}
              onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as any })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
            >
              <option value="admin">Administración</option>
              <option value="ops">Operaciones</option>
              <option value="risk">Gestión de Riesgo</option>
              <option value="comunicaciones">Comunicaciones</option>
              <option value="scanner">Escaner</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
          <button 
            type="submit"
            disabled={saving}
            className="bg-primary text-white font-bold uppercase px-6 py-2.5 rounded-xl hover:bg-primary-dark transition-all shadow-md disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Crear Accesso"}
          </button>
        </form>
      </div>

      {/* Staff List */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold uppercase italic border-b pb-4 mb-6">Staff Registrado (Trazabilidad)</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-50">
                <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4">Miembro</th>
                <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4">Rol</th>
                <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4">Contraseña</th>
                <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4">Fecha Creación</th>
                <th className="pb-4 text-right px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staff.map((member) => (
                <tr key={member.id} className="group hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4 font-bold text-sm text-gray-800">
                    <div className="flex items-center space-x-2">
                       <User className="w-4 h-4 text-gray-300" />
                       <span>{member.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                      member.role === 'superadmin' ? 'bg-purple-100 text-purple-600' :
                      member.role === 'admin' ? 'bg-blue-100 text-blue-600' :
                      member.role === 'risk' ? 'bg-amber-100 text-amber-600' :
                      member.role === 'comunicaciones' ? 'bg-sky-100 text-sky-600' :
                      member.role === 'scanner' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-orange-100 text-orange-600'
                    }`}>
                      {member.role === 'admin' ? 'Administración' : member.role === 'ops' ? 'Operaciones' : member.role === 'risk' ? 'Gestión de Riesgo' : member.role === 'comunicaciones' ? 'Comunicaciones' : member.role === 'scanner' ? 'Escaner' : 'Super Admin'}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-mono text-xs text-gray-500">{member.password}</td>
                  <td className="py-4 px-4 text-[10px] text-gray-400 font-mono">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4 text-right space-x-2">
                    {editingPassId === member.id ? (
                      <div className="flex items-center space-x-2 justify-end">
                        <input 
                          type="text"
                          value={tempPass}
                          onChange={(e) => setTempPass(e.target.value)}
                          className="px-2 py-1 border border-primary rounded-lg text-xs font-mono outline-none"
                          placeholder="Nueva clave"
                          autoFocus
                        />
                        <button 
                          onClick={() => handleUpdatePassword(member.id, tempPass)}
                          className="bg-primary text-white p-1.5 rounded-lg hover:bg-primary-dark transition-all"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setEditingPassId(null); setTempPass(""); }}
                          className="bg-gray-100 text-gray-500 p-1.5 rounded-lg hover:bg-gray-200 transition-all"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => { setEditingPassId(member.id); setTempPass(member.password); }}
                          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                          title="Cambiar Contraseña"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(member.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {staff.length === 0 && (
            <div className="py-12 text-center text-gray-400 uppercase font-bold text-xs tracking-widest">
               No hay miembros de staff registrados aún.
            </div>
          )}
        </div>
      </div>
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

function StatCard({ title, value, color, isUSD, currency = "$" }: { title: string, value: any, color: string, isUSD?: boolean, currency?: string }) {
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
        {isUSD && <span className="text-2xl mr-1">{currency}</span>}
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
    registrationDeadline: "",
    scoutUnit: "",
    eventName: "",
    eventDescription: "",
    headerTagline: "",
    locationUrl: "",
    photoAlbumUrl: "",
    phases: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const addPhase = () => {
    const newPhase: EventPhase = {
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      location: "",
      locationUrl: "",
      date: "",
      time: "",
      minAmount: 0,
      color: DARK_PALETTE[0]
    };
    setConfig({ ...config, phases: [...(config.phases || []), newPhase] });
  };

  const removePhase = (id: string) => {
    setConfig({ ...config, phases: (config.phases || []).filter(p => p.id !== id) });
  };

  const updatePhase = (id: string, field: keyof EventPhase, value: any) => {
    setConfig({
      ...config,
      phases: (config.phases || []).map(p => p.id === id ? { ...p, [field]: value } : p)
    });
  };

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
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Nombre del Evento</label>
          <input 
            type="text"
            value={config.eventName}
            onChange={(e) => setConfig({ ...config, eventName: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
            placeholder="Ej: Congreso de Comunidad Rover"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Tagline Cabecera (Ej: Caracas 2026)</label>
          <input 
            type="text"
            value={config.headerTagline}
            onChange={(e) => setConfig({ ...config, headerTagline: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
            placeholder="Ej: Caracas 2026"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Descripción del Evento</label>
        <textarea 
          value={config.eventDescription}
          onChange={(e) => setConfig({ ...config, eventDescription: e.target.value })}
          className="w-full h-24 p-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm leading-relaxed"
          placeholder="Descripción que aparecerá en el home..."
        />
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

      <div className="space-y-6 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Cronograma de Fases del Evento</h4>
          <button 
            onClick={addPhase}
            className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center space-x-2"
          >
            <Plus className="w-3 h-3" />
            <span>Agregar Fase</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {(config.phases || []).map((phase, idx) => (
            <div key={phase.id} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 relative group animate-in fade-in slide-in-from-top-2 duration-300">
              <button 
                onClick={() => removePhase(phase.id)}
                className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                title="Eliminar Fase"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Nombre Fase</label>
                  <input 
                    type="text"
                    value={phase.name}
                    onChange={(e) => updatePhase(phase.id, "name", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Ej: Fase 1: Mística"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ubicación</label>
                  <input 
                    type="text"
                    value={phase.location}
                    onChange={(e) => updatePhase(phase.id, "location", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Ej: Sede Scout"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Maps Link</label>
                  <input 
                    type="text"
                    value={phase.locationUrl}
                    onChange={(e) => updatePhase(phase.id, "locationUrl", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="https://maps..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Monto Min ($)</label>
                  <input 
                    type="number"
                    value={phase.minAmount}
                    onChange={(e) => updatePhase(phase.id, "minAmount", parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Ej: 10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Color QR</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {DARK_PALETTE.map(color => (
                      <button
                        key={color}
                        onClick={() => updatePhase(phase.id, "color", color)}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${phase.color === color ? 'border-primary ring-1 ring-primary/30 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 lg:col-span-1">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block">F. Inicio</label>
                    <input 
                      type="date"
                      value={phase.startDate || phase.date || ""}
                      onChange={(e) => {
                        updatePhase(phase.id, "startDate", e.target.value);
                        updatePhase(phase.id, "date", e.target.value);
                      }}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block">H. Inicio</label>
                    <input 
                      type="time"
                      value={phase.startTime || ""}
                      onChange={(e) => updatePhase(phase.id, "startTime", e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block">F. Cierre</label>
                    <input 
                      type="date"
                      value={phase.endDate || ""}
                      onChange={(e) => updatePhase(phase.id, "endDate", e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block">H. Cierre</label>
                    <input 
                      type="time"
                      value={phase.endTime || ""}
                      onChange={(e) => updatePhase(phase.id, "endTime", e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {(config.phases || []).length === 0 && (
            <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-3xl">
              <Layers className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No se han definido fases aún</p>
            </div>
          )}
        </div>
      </div>

      {/* SECCIONES COMPLEMENTARIAS (ADJUNTOS Y CUESTIONARIO) */}
      <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 space-y-6">
        <h4 className="text-xs font-black text-gray-900 uppercase italic border-b pb-2">Secciones Complementarias</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ATTACHMENTS CONFIG */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-gray-700 uppercase tracking-widest pl-1">Habilitar Sección de Adjuntos</label>
              <input 
                type="checkbox"
                checked={config.attachmentsActive || false}
                onChange={(e) => setConfig({ ...config, attachmentsActive: e.target.checked })}
                className="w-5 h-5 text-primary accent-primary rounded-xl cursor-pointer"
              />
            </div>
            
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">Título de Sección de Adjuntos</label>
                <input 
                  type="text"
                  value={config.attachmentsTitle || ""}
                  onChange={(e) => setConfig({ ...config, attachmentsTitle: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Ej: Adjuntar Documentos del Grupo"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">Descripción / Instrucciones</label>
                <textarea 
                  value={config.attachmentsDescription || ""}
                  onChange={(e) => setConfig({ ...config, attachmentsDescription: e.target.value })}
                  className="w-full h-16 p-2 rounded-lg border border-gray-200 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Instrucciones para los grupos..."
                />
              </div>
            </div>
          </div>

          {/* QUESTIONNAIRE CONFIG */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-gray-700 uppercase tracking-widest pl-1">Habilitar Cuestionario de Evaluación</label>
              <input 
                type="checkbox"
                checked={config.questionnaireActive || false}
                onChange={(e) => setConfig({ ...config, questionnaireActive: e.target.checked })}
                className="w-5 h-5 text-primary accent-primary rounded-xl cursor-pointer"
              />
            </div>
            
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">Título de Cuestionario</label>
                <input 
                  type="text"
                  value={config.questionnaireTitle || ""}
                  onChange={(e) => setConfig({ ...config, questionnaireTitle: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Ej: Evaluación General del Evento"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">Instrucciones del Cuestionario</label>
                <textarea 
                  value={config.questionnaireInstructions || ""}
                  onChange={(e) => setConfig({ ...config, questionnaireInstructions: e.target.value })}
                  className="w-full h-16 p-2 rounded-lg border border-gray-200 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Instrucciones para los votantes..."
                />
              </div>
            </div>
          </div>
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
