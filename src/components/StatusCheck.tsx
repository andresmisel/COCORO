import React, { useState, useEffect } from "react";
import { parse } from "date-fns";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Registration, Status, Payment, Config } from "../types";
import { QRCodeSVG } from "qrcode.react";
import { Search, Loader2, ChevronLeft, QrCode, AlertTriangle, CheckCircle, MessageSquare, CreditCard, Download, HeartPulse } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { generateMedicalPDF } from "../lib/pdf-utils";

interface Props {
  onBack: () => void;
}

export default function StatusCheck({ onBack }: Props) {
  const [idNumber, setIdNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      const snap = await getDoc(doc(db, "config", "global"));
      if (snap.exists()) setConfig(snap.data() as Config);
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!idNumber || !searched) return;

    // Listen for Registration
    const qReg = query(collection(db, "registrations"), where("idNumber", "==", idNumber));
    const unsubReg = onSnapshot(qReg, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        setRegistration({ id: docData.id, ...docData.data() } as Registration);
      } else {
        setRegistration(null);
        setLoading(false); // No registration means we can stop loading for now
      }
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, "registrations");
    });

    // Listen for Payments
    const qPay = query(collection(db, "payments"), where("idNumber", "==", idNumber));
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
  }, [idNumber, searched]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumber) return;
    setLoading(true);
    setSearched(true);
    setLoading(true);
    setRegistration(null);
    setPayments([]);
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case Status.APPROVED: return "text-green-600 bg-green-50";
      case Status.REJECTED: return "text-red-600 bg-red-50";
      default: return "text-amber-600 bg-amber-50";
    }
  };

  const getStatusLabel = (status: Status) => {
    switch (status) {
      case Status.APPROVED: return "Aprobado";
      case Status.REJECTED: return "Rechazado";
      default: return "Pendiente";
    }
  };

  const totalUSDApproved = payments
    .filter(p => p.status === Status.APPROVED)
    .reduce((acc, p) => acc + p.amountUSD, 0);

  const now = new Date();

  const parseDate = (d: string) => {
    if (!d) return null;
    const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'yyyy/MM/dd'];
    for (const fmt of formats) {
        const date = parse(d, fmt, new Date());
        if (!isNaN(date.getTime())) return date;
    }
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date;
  };

  const isPhaseActive = (phase: any) => {
    const startStr = phase.startDate || phase.date || "";
    const endStr = phase.endDate || phase.date || "";
    if (!startStr || !endStr) return false;
    const sDate = parseDate(startStr);
    const eDate = parseDate(endStr);
    if (!sDate || !eDate || isNaN(sDate.getTime()) || isNaN(eDate.getTime())) return false;
    
    const [startH, startM] = (phase.startTime || phase.time || "00:00").split(':').map(Number);
    const [endH, endM] = (phase.endTime || "23:59").split(':').map(Number);
    
    sDate.setHours(startH, startM, 0, 0);
    eDate.setHours(endH, endM, 59, 999);
    
    return now >= sDate && now <= eDate;
  };

  const activePhaseForSolvency = config?.phases?.find(isPhaseActive);
  const sortedPhases = [...(config?.phases || [])].sort((a, b) => {
    const d1 = parseDate(a.startDate || a.date || "");
    const d2 = parseDate(b.startDate || b.date || "");
    return (d1?.getTime() || 0) - (d2?.getTime() || 0);
  });

  let minRequiredNow = 0;
  let upcomingPhase = activePhaseForSolvency || null;

  if (activePhaseForSolvency) {
    minRequiredNow = activePhaseForSolvency.minAmount || 0;
  } else {
    const nextPhase = sortedPhases.find(p => {
      const sDate = parseDate(p.startDate || p.date || "");
      if (!sDate) return false;
      const [sh, sm] = (p.startTime || p.time || "00:00").split(':').map(Number);
      sDate.setHours(sh, sm, 0, 0);
      return sDate > now;
    });

    if (nextPhase) {
      minRequiredNow = nextPhase.minAmount || 0;
      upcomingPhase = nextPhase;
    } else {
      minRequiredNow = config?.totalCostUSD || 0;
      upcomingPhase = sortedPhases[sortedPhases.length - 1] || null;
    }
  }

  const isQualifiedByPhase = totalUSDApproved >= minRequiredNow;

  const rawBalanceDue = config ? Math.max(0, config.totalCostUSD - totalUSDApproved) : 0;
  const balanceDue = rawBalanceDue < 0.01 ? 0 : rawBalanceDue;

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-gray-400" />
        </button>
        <h2 className="text-3xl font-bold text-gray-900 uppercase italic tracking-tight">Consultar Status</h2>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="Ingrese su número de cédula"
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto bg-primary text-white px-8 py-4 sm:py-0 rounded-2xl font-bold uppercase hover:bg-primary-dark transition-all disabled:opacity-70 flex items-center justify-center min-w-[120px]"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Buscar"}
        </button>
      </form>
      
      {loading && searched && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Buscando Registro...</p>
        </div>
      )}

      {searched && !registration && !loading && (
        <div className="bg-red-50 p-8 rounded-3xl text-center space-y-4 border border-red-100">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
          <h3 className="text-xl font-bold text-red-900">No se encontró registro</h3>
          <p className="text-red-700">Asegúrese de haber completado el formulario de inscripción correctamente.</p>
        </div>
      )}

      {registration && (
        <div className="bg-white p-8 rounded-3xl shadow-xl space-y-10 border border-gray-100">
          {/* Header Info */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-8">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Participante</h3>
              <p className="text-3xl font-bold text-gray-900 uppercase italic leading-tight">{registration.firstName} {registration.lastName}</p>
              <p className="text-gray-500 font-mono tracking-tighter">CÉDULA: {registration.idNumber}</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
                {config?.phases?.map(phase => {
                    const now = new Date();
                    const startDate = new Date(phase.startDate || phase.date);
                    const isPassed = now > startDate;
                    const attended = registration.phaseAttendance?.[phase.id]?.attended;
                    
                    if (!isPassed && !attended) return null; // Don't show future, haven't attended

                    return (
                        <div key={phase.id} className="bg-gray-50 p-2 rounded-xl border border-gray-100 italic text-center min-w-[80px]">
                            <p className="text-[9px] font-bold uppercase text-gray-400">{phase.name.substring(0, 10)}</p>
                            <p className={`text-xs font-black ${attended ? 'text-green-600' : 'text-red-500'}`}>
                                {attended ? 'PRESENTE' : 'AUSENTE'}
                            </p>
                        </div>
                    );
                })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left: Financial & Institutional */}
            <div className="space-y-8">
              {/* Wallet Card */}
              <div className="bg-primary p-6 rounded-3xl text-white shadow-xl shadow-primary/30 relative overflow-hidden">
                <div className="absolute right-[-20px] top-[-20px] w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between opacity-80">
                    <CreditCard className="w-6 h-6 text-white" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Resumen de Pagos</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase opacity-60">Total Acumulado (Aprobado)</p>
                    <p className="text-4xl font-black italic">${totalUSDApproved.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between items-end border-t border-white/20 pt-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-60">Restante por Pagar</p>
                      <p className="text-xl font-bold italic">${balanceDue.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase opacity-60">Meta Total</p>
                      <p className="text-lg font-bold opacity-80">${(config?.totalCostUSD || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="space-y-4">
                 <h4 className="font-bold text-gray-900 uppercase italic tracking-wide text-xs">Desglose Institucional</h4>
                 {/* Detailed Status Grid */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Grupo Scout</p>
                       <p className="text-sm font-bold text-gray-800">{registration.scoutGroup}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col justify-between">
                       <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Membresía</p>
                          <p className="text-sm font-bold text-gray-800">{registration.membershipType}</p>
                       </div>
                       <div className="mt-2 text-[9px] font-black uppercase flex items-center space-x-1">
                          <span className={registration.opsStatus === Status.APPROVED ? "text-blue-600" : registration.opsStatus === Status.REJECTED ? "text-red-600" : "text-amber-500"}>
                            {registration.opsStatus === Status.APPROVED ? "✓ Vigente" : registration.opsStatus === Status.REJECTED ? "✗ Vencido" : "⚡ Verificando"}
                          </span>
                       </div>
                    </div>
                 </div>

                 {registration.votingRole && (
                    <div className="bg-blue-50 text-blue-950 p-4 rounded-xl border border-blue-100 flex items-center justify-between my-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">🗳️</span>
                        <div>
                          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-none mb-1">Rol de Votación</p>
                          <p className="text-xs font-black text-blue-800 uppercase tracking-wider">{registration.votingRole}</p>
                        </div>
                      </div>
                      <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Habilitado</span>
                    </div>
                  )}

                 {registration.medicalData && (
                   <div className="space-y-2">
                     <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center space-x-2 text-green-700">
                       <CheckCircle className="w-4 h-4" />
                       <p className="text-xs font-bold uppercase">Ficha Médica: Completada</p>
                     </div>
                     <button 
                      onClick={() => generateMedicalPDF(registration, config)}
                      className="w-full flex items-center justify-center space-x-3 bg-amber-600/10 text-amber-700 p-4 rounded-2xl border border-amber-200 hover:bg-amber-600/20 transition-all group"
                     >
                       <HeartPulse className="w-5 h-5 group-hover:scale-110 transition-transform" />
                       <div className="text-left">
                         <p className="text-[10px] font-black uppercase leading-tight italic">Descargar Ficha Digital</p>
                         <p className="text-[9px] opacity-70">Haz clic para descargar en PDF</p>
                       </div>
                       <Download className="ml-auto w-4 h-4" />
                     </button>
                   </div>
                 )}

                 {!registration.medicalData && (
                    <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex items-start space-x-3">
                      <HeartPulse className="text-red-500 w-6 h-6 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-red-900 font-bold text-sm uppercase">Ficha Médica Pendiente</p>
                        <p className="text-red-700 text-xs mt-1 italic font-medium">Debes completar tu ficha médica al reportar una cuota para activar tu credencial.</p>
                      </div>
                    </div>
                 )}

                 {balanceDue <= 0 && registration.medicalData ? (
                    <div className="bg-green-50 p-5 rounded-2xl border border-green-100 flex items-start space-x-3">
                      <CheckCircle className="text-green-500 w-6 h-6 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-green-900 font-bold text-sm uppercase">¡Inscripción Completada!</p>
                        <p className="text-green-700 text-xs mt-1">Has completado el proceso de pago. {registration.opsStatus !== Status.APPROVED ? "Tu credencial se activará apenas operaciones valide tu membresía." : "¡Ya puedes usar tu credencial digital!"}</p>
                      </div>
                    </div>
                 ) : isQualifiedByPhase && registration.medicalData ? (
                    <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex items-start space-x-3">
                      <CheckCircle className="text-blue-500 w-6 h-6 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-blue-900 font-bold text-sm uppercase">¡Solvente para {upcomingPhase?.name || 'Evento'}!</p>
                        <p className="text-blue-700 text-xs mt-1">Has cubierto el monto mínimo requerido a la fecha (${minRequiredNow}). Tu credencial está activa.</p>
                      </div>
                    </div>
                 ) : balanceDue <= 0 && !registration.medicalData ? (
                    <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex items-start space-x-3">
                      <AlertTriangle className="text-amber-500 w-6 h-6 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-amber-900 font-bold text-sm uppercase">Pago Completo - Datos Faltantes</p>
                        <p className="text-amber-700 text-xs mt-1">Tu pago está completo pero falta tu ficha médica. Por favor ve a la sección de "Registro y Cuotas", ingresa tu cédula y completa la información médica pendiente.</p>
                      </div>
                    </div>
                 ) : (
                    <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex items-start space-x-3">
                      <AlertTriangle className="text-amber-500 w-6 h-6 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-amber-900 font-bold text-sm uppercase">¡Inscripción Incompleta!</p>
                        <p className="text-amber-700 text-xs mt-1">Aún tienes un saldo pendiente. Puedes reportar más cuotas en el formulario de registro.</p>
                      </div>
                    </div>
                 )}

                 {/* Pending Payments Note */}
                 {payments.some(p => p.status === Status.PENDING) && (
                   <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex items-start space-x-3">
                     <Loader2 className="text-blue-500 w-6 h-6 mt-0.5 shrink-0 animate-spin" />
                     <div>
                       <p className="text-blue-900 font-bold text-sm uppercase">Pagos en Verificación</p>
                       <p className="text-blue-700 text-xs mt-1">
                         Tienes {payments.filter(p => p.status === Status.PENDING).length} reporte(s) en proceso de validación por el Staff.
                       </p>
                     </div>
                   </div>
                 )}
              </div>

              {/* Staff Observations */}
              {(registration.adminObservations || registration.opsObservations) && (
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                  <div className="flex items-center space-x-2 text-gray-400">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Observaciones del Staff</span>
                  </div>
                  <div className="space-y-3">
                    {registration.adminObservations && (
                      <div className="bg-white p-3 rounded-xl border border-primary/10">
                        <span className="text-[9px] font-bold text-primary uppercase block mb-1">Administración</span>
                        <p className="text-xs text-gray-600 leading-relaxed">{registration.adminObservations}</p>
                      </div>
                    )}
                    {registration.opsObservations && (
                      <div className="bg-white p-3 rounded-xl border border-blue-100">
                        <span className="text-[9px] font-bold text-blue-600 uppercase block mb-1">Operaciones</span>
                        <p className="text-xs text-gray-600 leading-relaxed">{registration.opsObservations}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right: QR Code */}
            <div className="flex flex-col items-center justify-center p-10 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              {isQualifiedByPhase && registration.opsStatus === Status.APPROVED && registration.medicalData ? (
                <div className="text-center space-y-6">
                  <div className="bg-white p-6 rounded-3xl shadow-xl inline-block border border-gray-100">
                    {(() => {
                      const qualifiedPhases = sortedPhases
                        .filter(p => totalUSDApproved >= p.minAmount)
                        .sort((a, b) => b.minAmount - a.minAmount);
                      const qrColor = qualifiedPhases.length > 0 ? qualifiedPhases[0].color : "#000000";
                      
                      return (
                        <QRCodeSVG 
                          value={registration.idNumber} 
                          size={200}
                          level="H"
                          includeMargin={true}
                          fgColor={qrColor}
                        />
                      );
                    })()}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2 text-primary font-bold text-xs uppercase tracking-widest">
                      <QrCode className="w-4 h-4" />
                      <span>Credencial Digital</span>
                    </div>
                    <p className="text-[10px] text-gray-400 italic">Este código será escaneado en el acceso del evento.</p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="p-8 bg-white/50 rounded-full">
                    <QrCode className="w-24 h-24 text-gray-300 mx-auto" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="font-bold text-sm uppercase text-gray-400 tracking-widest">Código Bloqueado</p>
                    <div className="space-y-1">
                      {!isQualifiedByPhase && balanceDue > 0 && (
                        <p className="text-[10px] text-amber-500 font-bold uppercase tracking-tighter">Falta monto para {upcomingPhase?.name || 'Inscripción'} (${(minRequiredNow - totalUSDApproved).toFixed(2)})</p>
                      )}
                      {registration.opsStatus !== Status.APPROVED && (
                        <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter">Falta Validación Institucional</p>
                      )}
                      <p className="text-[9px] text-gray-400 italic max-w-[200px] mt-2">El código se activará automáticamente al cumplir ambos requisitos.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
