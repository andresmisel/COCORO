import React, { useState } from "react";
import { Registration, Status, PaymentMethod } from "../types";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Download, CheckCircle, XCircle, Clock, MessageSquare, Eye, Banknote } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/error-handler";

interface Props {
  registrations: Registration[];
  onExport: () => void;
}

export default function AdminPanel({ registrations, onExport }: Props) {
  const [obsId, setObsId] = useState<string | null>(null);
  const [obsText, setObsText] = useState("");
  const [viewProof, setViewProof] = useState<Registration | null>(null);

  const updateStatus = async (id: string, status: Status) => {
    try {
      await updateDoc(doc(db, "registrations", id), { adminStatus: status });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `registrations/${id}`);
    }
  };

  const saveObservation = async (id: string) => {
    try {
      await updateDoc(doc(db, "registrations", id), { adminObservations: obsText });
      setObsId(null);
      setObsText("");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `registrations/${id}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold uppercase italic text-gray-500 text-xs tracking-widest pl-2">Control de Pagos</h3>
        <button 
          onClick={onExport}
          className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-xl font-bold uppercase text-xs hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Pagos Excel</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Participante / Contacto</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Información de Pago</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest text-center">Status Adm</th>
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
                    <div className="space-y-1">
                      {reg.paymentMethod === PaymentMethod.TRANSFER ? (
                        <>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase">Ref</span>
                            <span className="font-mono text-xs font-bold">{reg.bankReference}</span>
                          </div>
                          {reg.exchangeRate && (
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded uppercase">Tasa</span>
                              <span className="font-mono text-[10px] font-bold">Bs {reg.exchangeRate}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase">Recibo</span>
                          <span className="font-mono text-xs font-bold">{reg.receiptNumber}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${reg.paymentMethod === PaymentMethod.TRANSFER ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-600'}`}>
                          {reg.paymentMethod === PaymentMethod.TRANSFER ? 'Bs' : 'U$D'}
                        </span>
                        <span className={`font-mono text-xs font-bold ${reg.paymentMethod === PaymentMethod.TRANSFER ? 'text-primary' : 'text-green-600'}`}>
                          {reg.paymentMethod === PaymentMethod.TRANSFER ? `Bs ${reg.amount.toFixed(2)}` : `$${reg.amount.toFixed(2)}`}
                        </span>
                      </div>
                      {reg.proofUrl && (
                        <button 
                          onClick={() => setViewProof(reg)}
                          className="flex items-center space-x-1 text-[10px] text-blue-500 font-bold uppercase hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
                        >
                           <Eye className="w-3 h-3" />
                           <span className="truncate max-w-[100px]">{reg.proofName || "Ver Comprobante"}</span>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      reg.adminStatus === Status.APPROVED ? 'bg-green-100 text-green-600' : 
                      reg.adminStatus === Status.REJECTED ? 'bg-red-100 text-red-600' : 
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {reg.adminStatus === Status.APPROVED ? 'Aprobado' : reg.adminStatus === Status.REJECTED ? 'Rechazado' : 'Pendiente'}
                    </span>
                    {reg.adminObservations && (
                      <p className="text-[9px] text-gray-400 mt-1 italic max-w-[100px] mx-auto truncate">"{reg.adminObservations}"</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-1">
                      <button 
                        onClick={() => { setObsId(reg.id); setObsText(reg.adminObservations || ""); }}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Agregar Observación"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => updateStatus(reg.id, Status.REJECTED)}
                        disabled={reg.adminStatus === Status.REJECTED}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30"
                        title="Rechazar"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => updateStatus(reg.id, Status.APPROVED)}
                        disabled={reg.adminStatus === Status.APPROVED}
                        className="p-2 text-green-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all disabled:opacity-30"
                        title="Aprobar"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => updateStatus(reg.id, Status.PENDING)}
                        disabled={reg.adminStatus === Status.PENDING}
                        className="p-2 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all disabled:opacity-30"
                        title="Pendiente"
                      >
                        <Clock className="w-4 h-4" />
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[110] p-2 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-4 sm:p-6 bg-gray-50 border-b flex justify-between items-center sticky top-0 z-10">
              <div>
                <h4 className="font-bold uppercase italic text-primary text-sm sm:text-base">Comprobante de Pago</h4>
                <p className="text-[10px] sm:text-xs text-gray-500">{viewProof.firstName} {viewProof.lastName}</p>
              </div>
              <button 
                onClick={() => setViewProof(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Cerrar"
              >
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
              </button>
            </div>
            <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-gray-100 p-3 sm:p-4 rounded-2xl">
                  <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {viewProof.paymentMethod === PaymentMethod.TRANSFER ? 'Referencia' : 'Número de Recibo'}
                  </p>
                  <p className="font-mono font-bold text-base sm:text-lg truncate">
                    {viewProof.paymentMethod === PaymentMethod.TRANSFER ? viewProof.bankReference : viewProof.receiptNumber}
                  </p>
                </div>
                <div className={`${viewProof.paymentMethod === PaymentMethod.TRANSFER ? 'bg-primary/5' : 'bg-green-50'} p-3 sm:p-4 rounded-2xl`}>
                  <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${viewProof.paymentMethod === PaymentMethod.TRANSFER ? 'text-primary/60' : 'text-green-400'}`}>
                    Monto ({viewProof.paymentMethod === PaymentMethod.TRANSFER ? 'Bs' : '$'})
                  </p>
                  <p className={`font-mono font-bold text-base sm:text-lg ${viewProof.paymentMethod === PaymentMethod.TRANSFER ? 'text-primary' : 'text-green-600'}`}>
                    {viewProof.paymentMethod === PaymentMethod.TRANSFER ? `Bs ${viewProof.amount.toFixed(2)}` : `$${viewProof.amount.toFixed(2)}`}
                  </p>
                </div>
              </div>

              {viewProof.paymentMethod === PaymentMethod.TRANSFER && viewProof.exchangeRate && (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <p className="text-[9px] sm:text-[10px] font-bold text-amber-500 uppercase tracking-widest">Tasa de Cambio Aplicada</p>
                  <p className="font-mono font-bold text-base text-amber-700">Bs {viewProof.exchangeRate}</p>
                </div>
              )}
              
              <div className="border border-gray-200 rounded-3xl overflow-hidden bg-gray-50 flex items-center justify-center min-h-[250px] max-h-[400px] overflow-y-auto shadow-inner">
                {viewProof.proofUrl && viewProof.proofUrl.startsWith('data:image/') ? (
                  <img 
                    src={viewProof.proofUrl} 
                    alt="Comprobante" 
                    className="max-w-full h-auto"
                  />
                ) : (
                  <div className="p-8 sm:p-12 flex flex-col items-center justify-center space-y-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                      <Download className="text-blue-600 w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-900 text-xs sm:text-sm">{viewProof.proofName || "Archivo adjunto"}</p>
                      <p className="text-[10px] text-gray-400 mt-1">El formato de este archivo requiere descarga</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center pb-2">
                <button 
                  onClick={() => {
                    if (!viewProof.proofUrl) return;
                    const link = document.createElement('a');
                    link.href = viewProof.proofUrl;
                    link.download = viewProof.proofName || "comprobante_pago";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="bg-blue-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl font-bold uppercase text-[10px] sm:text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 inline-flex items-center space-x-2"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Descargar Original</span>
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6 bg-gray-50 border-t flex gap-2 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button 
                onClick={() => { updateStatus(viewProof.id, Status.REJECTED); setViewProof(null); }}
                className="flex-1 py-3 bg-red-100 text-red-600 rounded-2xl font-bold uppercase text-[10px] sm:text-xs hover:bg-red-200 transition-all"
              >
                Rechazar
              </button>
              <button 
                onClick={() => { updateStatus(viewProof.id, Status.APPROVED); setViewProof(null); }}
                className="flex-1 py-3 bg-green-600 text-white rounded-2xl font-bold uppercase text-[10px] sm:text-xs hover:bg-green-700 transition-all shadow-lg shadow-green-200"
              >
                Aprobar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

