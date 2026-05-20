import React, { useState, useEffect } from "react";
import { Registration, Status, Payment, Config } from "../types";
import { updateDoc, doc, query, where, getDocs, collection } from "firebase/firestore";
import { db } from "../lib/firebase";
import { MessageSquare, Download, CheckCircle, XCircle, Clock, QrCode, UserCheck } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { Html5QrcodeScanner } from "html5-qrcode";
import * as XLSX from "xlsx";

interface Props {
  registrations: Registration[];
  payments: Payment[];
  config: Config | null;
  onExportAll: () => void;
  onExportAttendees: () => void;
  staffName: string;
  role: string;
}

export default function OpsPanel({ registrations, payments, config, onExportAll, onExportAttendees, staffName, role }: Props) {
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [obsId, setObsId] = useState<string | null>(null);
  const [obsText, setObsText] = useState("");
  const [selectedPhase, setSelectedPhase] = useState<string>("general");

  const phases = config?.phases || [];

  const updateStatus = async (id: string, status: Status) => {
    try {
      await updateDoc(doc(db, "registrations", id), { 
        opsStatus: status,
        validatedBy: staffName
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `registrations/${id}`);
    }
  };

  const updateVotingRole = async (id: string, roleVal: "Delegado" | "Observador" | "") => {
    try {
      await updateDoc(doc(db, "registrations", id), { 
        votingRole: roleVal
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `registrations/${id}`);
    }
  };

  const saveObservation = async (id: string) => {
    try {
      await updateDoc(doc(db, "registrations", id), { opsObservations: obsText });
      setObsId(null);
      setObsText("");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `registrations/${id}`);
    }
  };

  const handleManualCheckIn = async (id: string, phaseId: string = "general") => {
    try {
      const updateData: any = {
        checkedIn: true,
        checkInTime: new Date().toISOString(),
        checkedInBy: staffName
      };

      if (phaseId !== "general") {
        updateData[`phaseAttendance.${phaseId}`] = {
          attended: true,
          time: new Date().toISOString(),
          by: staffName
        };
      }

      await updateDoc(doc(db, "registrations", id), updateData);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `registrations/${id}`);
    }
  };

  const exportPhaseAttendance = (phaseId: string) => {
    const phase = phases.find(p => p.id === phaseId);
    const phaseName = phase?.name || "General";
    
    const attendanceData = registrations.map(r => {
      const att = phaseId === 'general' ? { attended: r.checkedIn, time: r.checkInTime, by: r.checkedInBy } : r.phaseAttendance?.[phaseId];
      return {
        Nombre: `${r.firstName} ${r.lastName}`,
        Cedula: r.idNumber,
        Grupo: r.scoutGroup,
        Asistio: att?.attended ? "SI" : "NO",
        Fecha_Hora: att?.time ? new Date(att.time).toLocaleString() : "N/A",
        Marcado_Por: (att?.by || "N/A").replace("Sistema (Leindenz)", "Sistema Admin").replace("Sistema (Andres)", "Sistema Ops")
      };
    });

    const ws = XLSX.utils.json_to_sheet(attendanceData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
    XLSX.writeFile(wb, `Asistencia_${phaseName.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div className="flex flex-col space-y-1">
          <h3 className="font-bold uppercase italic text-gray-500 text-xs tracking-widest pl-2">Control de Acceso & Asistencia</h3>
          <div className="flex items-center space-x-2 pl-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Fase Activa:</span>
            <select 
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="text-[10px] font-bold uppercase text-primary bg-primary/5 px-2 py-1 rounded-lg outline-none cursor-pointer"
            >
              <option value="general">Membresía General</option>
              {phases.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedPhase !== 'general' && (
            <button 
              onClick={() => exportPhaseAttendance(selectedPhase)}
              className="flex items-center space-x-2 bg-green-50 text-green-600 px-4 py-2 rounded-xl font-bold uppercase text-xs hover:bg-green-100 transition-all border border-green-100"
            >
              <Download className="w-4 h-4" />
              <span>Reporte Fase</span>
            </button>
          )}
          <button 
            onClick={() => setShowScanner(!showScanner)}
            className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-xl font-bold uppercase text-xs hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
          >
            <QrCode className="w-4 h-4" />
            <span>{showScanner ? "Cerrar Escáner" : "Escanear QR"}</span>
          </button>
          <button 
            onClick={onExportAll}
            className="flex items-center space-x-2 border-2 border-gray-100 text-gray-600 px-4 py-2 rounded-xl font-bold uppercase text-xs hover:bg-gray-50 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Base Inscritos</span>
          </button>
          <button 
            onClick={onExportAttendees}
            className="flex items-center space-x-2 border-2 border-gray-100 text-gray-600 px-4 py-2 rounded-xl font-bold uppercase text-xs hover:bg-gray-50 transition-all"
          >
            <UserCheck className="w-4 h-4" />
            <span>Asistentes</span>
          </button>
        </div>
      </div>

      {showScanner && (
        <div className="bg-black/90 p-6 rounded-3xl overflow-hidden relative min-h-[400px]">
          <Scanner 
            onScan={async (idNumber) => {
              setScanResult(`Escaneado: V-${idNumber}`);
              try {
                const q = query(collection(db, "registrations"), where("idNumber", "==", idNumber));
                const snap = await getDocs(q);
                if (!snap.empty) {
                  const regDoc = snap.docs[0];
                  const regData = regDoc.data() as Registration;
                  
                  if (selectedPhase !== "general") {
                    const phase = phases.find(p => p.id === selectedPhase);
                    const userPayments = payments.filter(p => p.idNumber === idNumber && p.status === Status.APPROVED);
                    const totalPaid = userPayments.reduce((acc, p) => acc + p.amountUSD, 0);

                    if (phase) {
                      if (totalPaid < phase.minAmount) {
                        alert(`❌ ACCESO DENEGADO: El participante no cubre el monto mínimo para esta fase ($${totalPaid.toFixed(2)}/${phase.minAmount}).`);
                        return;
                      }
                      
                      const updateObj: any = {
                        [`phaseAttendance.${selectedPhase}`]: {
                          attended: true,
                          time: new Date().toISOString(),
                          by: staffName
                        }
                      };
                      // Also mark general check-in if not already
                      if (!regData.checkedIn) {
                        updateObj.checkedIn = true;
                        updateObj.checkInTime = new Date().toISOString();
                        updateObj.checkedInBy = staffName;
                      }
                      
                      await updateDoc(doc(db, "registrations", regDoc.id), updateObj);
                      alert(`✅ ¡Asistencia registrada para ${phase.name} - ${regData.firstName}!`);
                      return;
                    }
                  }

                  if (regData.checkedIn) {
                    alert(`⚠️ ALERTA: El usuario ${regData.firstName} ${regData.lastName} YA SE ENCUENTRA EN EL EVENTO.\nEntrada registrada a las: ${new Date(regData.checkInTime!).toLocaleTimeString()}`);
                    return;
                  }

                  const userPayments = payments.filter(p => p.idNumber === idNumber && p.status === Status.APPROVED);
                  const totalPaid = userPayments.reduce((acc, p) => acc + p.amountUSD, 0);
                  const rawMissing = config ? Math.max(0, config.totalCostUSD - totalPaid) : 0;
                  const isCompletado = rawMissing < 0.01;

                  if (isCompletado && regData.opsStatus === Status.APPROVED) {
                    await updateDoc(doc(db, "registrations", regDoc.id), { 
                      checkedIn: true, 
                      checkInTime: new Date().toISOString(),
                      checkedInBy: staffName
                    });
                    alert(`✅ ¡Acceso CONCEDIDO para ${regData.firstName} ${regData.lastName}!`);
                  } else if (!isCompletado) {
                    alert(`❌ ACCESO DENEGADO: El participante no ha completado el pago (${totalPaid.toFixed(2)}/${config?.totalCostUSD || 0}).`);
                  } else {
                    alert(`❌ ACCESO DENEGADO: Falta Validación Institucional para ${regData.firstName}.`);
                  }
                } else {
                  alert("❌ ERROR: No se encontró registro con este ID.");
                }
              } catch (e) {
                console.error(e);
              }
            }} 
          />
          {scanResult && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/90 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest text-primary">
              {scanResult}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Participante / Contacto</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Institución</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest text-center">Status Ops</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest text-center">Asistencia</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {registrations.map((reg) => (
                <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900 uppercase text-sm">{reg.firstName} {reg.lastName}</p>
                    <p className="text-[10px] text-gray-400 font-mono mb-1">V-{reg.idNumber}</p>
                    <p className="text-xs text-primary font-medium">{reg.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-gray-800 uppercase">{reg.scoutGroup}</p>
                    <p className="text-[10px] text-gray-500 uppercase">{reg.membershipType}</p>
                    <div className="mt-2">
                      <select 
                        value={reg.votingRole || ""}
                        onChange={(e) => updateVotingRole(reg.id, e.target.value as "Delegado" | "Observador" | "")}
                        className="text-[9px] font-black uppercase tracking-tighter text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg px-2 py-1 outline-none cursor-pointer transition-all w-full max-w-[130px]"
                      >
                        <option value="">¿Electoral?</option>
                        <option value="Delegado">Delegado 🗳️</option>
                        <option value="Observador">Observador 👁️</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center space-y-1.5">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        reg.opsStatus === Status.APPROVED ? 'bg-blue-100 text-blue-600' : 
                        reg.opsStatus === Status.REJECTED ? 'bg-red-100 text-red-600' : 
                        'bg-amber-100 text-amber-600'
                      }`}>
                        {reg.opsStatus === Status.APPROVED ? 'Vigente' : reg.opsStatus === Status.REJECTED ? 'Vencido' : 'Pendiente'}
                      </span>
                      {role === "superadmin" && reg.validatedBy && (
                        <p className="text-[8px] text-gray-400 mt-0.5 uppercase font-bold tracking-tighter">
                          Por: {reg.validatedBy.replace("Sistema (Leindenz)", "Sistema Admin").replace("Sistema (Andres)", "Sistema Ops")}
                        </p>
                      )}
                      {/* Solvency Indicator */}
                      {(() => {
                        const userPayments = payments.filter(p => p.idNumber === reg.idNumber && p.status === Status.APPROVED);
                        const totalPaid = userPayments.reduce((acc, p) => acc + p.amountUSD, 0);
                        const rawMissing = config ? Math.max(0, config.totalCostUSD - totalPaid) : 0;
                        const missing = rawMissing < 0.01 ? 0 : rawMissing;
                        const isCompletado = missing <= 0;
                        return (
                          <span className={`text-[9px] font-bold uppercase ${isCompletado ? 'text-green-600' : 'text-amber-500'}`}>
                            {isCompletado ? '💰 Completado' : `💳 Falta $${missing.toFixed(2)}`}
                          </span>
                        );
                      })()}
                    </div>
                    {reg.opsObservations && (
                      <p className="text-[9px] text-gray-400 mt-1 italic max-w-[100px] mx-auto truncate">"{reg.opsObservations}"</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {(() => {
                      const att = selectedPhase === 'general' ? { attended: reg.checkedIn, time: reg.checkInTime, by: reg.checkedInBy } : reg.phaseAttendance?.[selectedPhase];
                      const totalPaid = payments.filter(p => p.idNumber === reg.idNumber && p.status === Status.APPROVED).reduce((acc, p) => acc + p.amountUSD, 0);
                      const phase = phases.find(p => p.id === selectedPhase);
                      const isSolventForPhase = selectedPhase === 'general' ? 
                        (config ? (config.totalCostUSD - totalPaid < 0.01) : true) : 
                        (phase ? totalPaid >= phase.minAmount : true);

                      if (att?.attended) {
                        return (
                          <div className="flex flex-col items-center">
                            <span className="text-green-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> PRESENTE
                            </span>
                            <span className="text-[9px] text-gray-400 font-mono">{att.time ? new Date(att.time).toLocaleTimeString() : ''}</span>
                            {role === "superadmin" && att.by && (
                              <p className="text-[7px] text-gray-400 font-bold uppercase tracking-tighter">
                                Por: {att.by.replace("Sistema (Leindenz)", "Sistema Admin").replace("Sistema (Andres)", "Sistema Ops")}
                              </p>
                            )}
                          </div>
                        );
                      }
                      
                      return (
                        <button 
                          onClick={() => handleManualCheckIn(reg.id, selectedPhase)}
                          disabled={!isSolventForPhase || reg.opsStatus !== Status.APPROVED}
                          className="text-[10px] font-bold text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all disabled:opacity-30 uppercase tracking-widest"
                        >
                          {isSolventForPhase ? "Marcar entrada" : "Insolvente"}
                        </button>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-1">
                      <button 
                        onClick={() => { setObsId(reg.id); setObsText(reg.opsObservations || ""); }}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Agregar Observación"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                       <button 
                        onClick={() => updateStatus(reg.id, Status.REJECTED)}
                        disabled={reg.opsStatus === Status.REJECTED}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30"
                        title="Marcar Vencido"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => updateStatus(reg.id, Status.APPROVED)}
                        disabled={reg.opsStatus === Status.APPROVED}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all disabled:opacity-30"
                        title="Marcar Vigente"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Observation Modal */}
      {obsId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl">
            <h4 className="font-bold uppercase italic text-blue-600">Agregar Observación Operativa</h4>
            <textarea 
              value={obsText}
              onChange={(e) => setObsText(e.target.value)}
              className="w-full h-32 p-3 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              placeholder="Escriba aquí sus comentarios..."
            />
            <div className="flex gap-2">
              <button 
                onClick={() => { setObsId(null); setObsText(""); }}
                className="flex-1 py-2 bg-gray-100 rounded-xl font-bold uppercase text-xs"
              >
                Cancelar
              </button>
              <button 
                onClick={() => saveObservation(obsId)}
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Scanner({ onScan }: { onScan: (result: string) => void }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        // No detenemos para permitir escaneo continuo
      },
      (error) => {
        // Ignorar errores de escaneo fallido (por ejemplo, cuando no hay QR en foco)
      }
    );

    return () => {
      scanner.clear();
    };
  }, []);

  return <div id="reader" className="w-full h-full max-w-lg mx-auto bg-white rounded-2xl overflow-hidden" />;
}
