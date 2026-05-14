import React, { useState } from "react";
import { Registration, Status, PaymentMethod, Payment } from "../types";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Download, CheckCircle, XCircle, MessageSquare, Eye } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import ProofViewer from "./ProofViewer";

interface Props {
  registrations: Registration[];
  payments: Payment[];
  onExport: () => void;
  searchTerm?: string;
  staffName: string;
  role: string;
}

export default function AdminPanel({ registrations, payments, onExport, searchTerm, staffName, role }: Props) {
  const [obsId, setObsId] = useState<string | null>(null);
  const [obsText, setObsText] = useState("");
  const [viewProof, setViewProof] = useState<Payment | null>(null);

  const updatePaymentStatus = async (id: string, status: Status) => {
    try {
      await updateDoc(doc(db, "payments", id), { 
        status,
        approvedBy: staffName 
      });
      if (viewProof && viewProof.id === id) setViewProof(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `payments/${id}`);
    }
  };

  const saveObservation = async (paymentId: string) => {
    try {
      await updateDoc(doc(db, "payments", paymentId), { adminObservations: obsText });
      setObsId(null);
      setObsText("");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `payments/${paymentId}`);
    }
  };

  const getParticipantInfo = (idNumber: string) => {
    return registrations.find(r => r.idNumber === idNumber);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold uppercase italic text-gray-500 text-[10px] md:text-xs tracking-widest pl-2">Control de Reportes (Individual)</h3>
        <button 
          onClick={onExport}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-primary text-white px-4 py-2 rounded-xl font-bold uppercase text-xs hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Historial</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Participante</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Detalles Pago</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-gray-400 font-bold uppercase text-xs tracking-widest italic">
                    No hay reportes de pagos en el sistema
                  </td>
                </tr>
              ) : payments.map((p) => {
                const participant = getParticipantInfo(p.idNumber);
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 uppercase text-sm">{participant ? `${participant.firstName} ${participant.lastName}` : (searchTerm ? "No coincide con búsqueda" : "Cargando / No registra...")}</p>
                      <p className="text-[10px] text-gray-400 font-mono mb-1">V-{p.idNumber}</p>
                      <p className="text-[9px] text-primary font-bold uppercase">{p.paymentDate}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {p.paymentMethod === PaymentMethod.TRANSFER ? (
                          <>
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase">Ref</span>
                              <span className="font-mono text-xs font-bold">{p.bankReference}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded uppercase">Monto/Tasa</span>
                              <span className="font-mono text-[10px] font-bold">Bs {p.amount.toFixed(2)} / {p.exchangeRate}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase">Recibo</span>
                            <span className="font-mono text-xs font-bold">{p.receiptNumber}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${p.paymentMethod === PaymentMethod.TRANSFER ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-600'}`}>
                            Eq. USD
                          </span>
                          <span className={`font-mono text-xs font-bold ${p.paymentMethod === PaymentMethod.TRANSFER ? 'text-primary' : 'text-green-600'}`}>
                            ${p.amountUSD.toFixed(2)}
                          </span>
                        </div>
                        {p.proofUrl && (
                          <button 
                            onClick={() => setViewProof(p)}
                            className="flex items-center space-x-1 text-[10px] text-blue-500 font-bold uppercase hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
                          >
                             <Eye className="w-3 h-3" />
                             <span className="truncate max-w-[100px]">{p.proofName || "Ver Comprobante"}</span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        p.status === Status.APPROVED ? 'bg-green-100 text-green-600' : 
                        p.status === Status.REJECTED ? 'bg-red-100 text-red-600' : 
                        'bg-amber-100 text-amber-600'
                      }`}>
                        {p.status === Status.APPROVED ? 'Aprobado' : p.status === Status.REJECTED ? 'Rechazado' : 'Pendiente'}
                      </span>
                      {role === "superadmin" && p.approvedBy && (
                        <p className="text-[8px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">Por: {p.approvedBy}</p>
                      )}
                      {p.adminObservations && (
                        <p className="text-[9px] text-gray-400 mt-1 italic max-w-[100px] mx-auto truncate">"{p.adminObservations}"</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-1">
                        <button 
                          onClick={() => { setObsId(p.id!); setObsText(p.adminObservations || ""); }}
                          className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Agregar Observación"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => updatePaymentStatus(p.id!, Status.REJECTED)}
                          disabled={p.status === Status.REJECTED}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30"
                          title="Rechazar"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => updatePaymentStatus(p.id!, Status.APPROVED)}
                          disabled={p.status === Status.APPROVED}
                          className="p-2 text-green-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all disabled:opacity-30"
                          title="Aprobar"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Observation Modal */}
      {obsId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl">
            <h4 className="font-bold uppercase italic text-primary">Agregar Observación Administrativa</h4>
            <textarea 
              value={obsText}
              onChange={(e) => setObsText(e.target.value)}
              className="w-full h-32 p-3 border rounded-2xl outline-none focus:ring-2 focus:ring-primary text-sm"
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
                className="flex-1 py-2 bg-primary text-white rounded-xl font-bold uppercase text-xs"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Proof Viewing Modal */}
      {viewProof && (
        <ProofViewer 
          payment={viewProof} 
          onClose={() => setViewProof(null)} 
          onApprove={(id) => updatePaymentStatus(id, Status.APPROVED)} 
          onReject={(id) => updatePaymentStatus(id, Status.REJECTED)} 
        />
      )}
    </div>
  );
}
