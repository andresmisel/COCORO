import { useState, useEffect } from "react";
import { Registration, MembershipType, Status, Payment, PaymentMethod } from "../types";
import { updateDoc, doc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Trash2, Edit3, Save, X, Download, AlertTriangle, Settings, Loader2, CreditCard, User, Eye } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import ProofViewer from "./ProofViewer";

interface Props {
  registrations: Registration[];
  payments: Payment[];
  onExport: () => void;
  staffName: string;
}

export default function SuperAdminPanel({ registrations, payments, onExport, staffName }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState<"registration" | "payment" | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [viewProof, setViewProof] = useState<Payment | null>(null);
  
  const [config, setConfig] = useState({ 
    bankDetails: "", 
    cashDetails: "",
    totalCostUSD: 0,
    registrationDeadline: ""
  });
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [view, setView] = useState<"users" | "payments">("users");

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, "config", "global"));
        if (configDoc.exists()) {
          const data = configDoc.data();
          setConfig({
            bankDetails: data.bankDetails || "",
            cashDetails: data.cashDetails || "",
            totalCostUSD: data.totalCostUSD || 0,
            registrationDeadline: data.registrationDeadline || ""
          });
        }
      } catch (e) {
        console.error("Error fetching config", e);
      }
    };
    fetchConfig();
  }, []);

  const saveConfig = async () => {
    setConfigLoading(true);
    try {
      await updateDoc(doc(db, "config", "global"), config);
      setIsEditingConfig(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, "config/global");
    } finally {
      setConfigLoading(false);
    }
  };

  const updatePaymentStatus = async (id: string, status: Status) => {
    try {
      await updateDoc(doc(db, "payments", id), { status });
      if (viewProof && viewProof.id === id) setViewProof(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `payments/${id}`);
    }
  };

  const handleDeleteRegistration = async (id: string) => {
    try {
      const reg = registrations.find(r => r.id === id);
      await deleteDoc(doc(db, "registrations", id));
      
      const userPayments = payments.filter(p => p.idNumber === reg?.idNumber);
      for (const p of userPayments) {
        await deleteDoc(doc(db, "payments", p.id!));
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `registrations/${id}`);
    }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      await deleteDoc(doc(db, "payments", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `payments/${id}`);
    }
  };

  const startEditRegistration = (reg: Registration) => {
    setEditingId(reg.id);
    setEditType("registration");
    setEditValues({
      firstName: reg.firstName,
      lastName: reg.lastName,
      idNumber: reg.idNumber,
      email: reg.email,
      scoutGroup: reg.scoutGroup,
      membershipType: reg.membershipType,
    });
  };

  const startEditPayment = (pay: Payment) => {
    setEditingId(pay.id!);
    setEditType("payment");
    setEditValues({
      amount: pay.amount,
      exchangeRate: pay.exchangeRate || 0,
      paymentDate: pay.paymentDate,
    });
  };

  const handleSave = async () => {
    if (!editingId || !editType) return;
    
    try {
      if (editType === "registration") {
        await updateDoc(doc(db, "registrations", editingId), {
          ...editValues,
          validatedBy: `${staffName} (Edit)`
        });
      } else {
        // Recalculate USD if rate or amount changed
        const payment = payments.find(p => p.id === editingId);
        if (payment) {
          let amountUSD = editValues.amount;
          if (payment.paymentMethod === PaymentMethod.TRANSFER && editValues.exchangeRate > 0) {
            amountUSD = editValues.amount / editValues.exchangeRate;
          }
          await updateDoc(doc(db, "payments", editingId), {
            ...editValues,
            amountUSD,
            approvedBy: `${staffName} (Edit)`
          });
        }
      }
      setEditingId(null);
      setEditType(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${editType}s/${editingId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Config Sections */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-primary">
            <Settings className="w-5 h-5" />
            <h3 className="font-bold uppercase text-xs tracking-widest">Maestro</h3>
          </div>
          <button 
            onClick={() => isEditingConfig ? saveConfig() : setIsEditingConfig(true)}
            disabled={configLoading}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-xl font-bold uppercase text-[10px] hover:bg-primary/20 transition-all"
          >
            {configLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isEditingConfig ? <Save className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
            <span>{isEditingConfig ? "Guardar" : "Editar"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Costo Evento ($)</label>
            <input 
              type="number"
              disabled={!isEditingConfig}
              value={config.totalCostUSD}
              onChange={e => setConfig({...config, totalCostUSD: parseFloat(e.target.value)})}
              className="w-full px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 transition-all font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Fecha Límite</label>
            <input 
              type="date"
              disabled={!isEditingConfig}
              value={config.registrationDeadline}
              onChange={e => setConfig({...config, registrationDeadline: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 transition-all"
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <p className="text-[10px] text-gray-400 italic">Configure el costo del evento y la fecha límite para nuevas inscripciones.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Instrucciones de Transferencia</label>
            <textarea 
              disabled={!isEditingConfig}
              value={config.bankDetails}
              onChange={e => setConfig({...config, bankDetails: e.target.value})}
              className="w-full h-32 px-4 py-3 rounded-2xl border border-gray-100 text-xs font-mono outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 transition-all resize-none"
              placeholder="Datos bancarios..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Instrucciones de Efectivo</label>
            <textarea 
              disabled={!isEditingConfig}
              value={config.cashDetails}
              onChange={e => setConfig({...config, cashDetails: e.target.value})}
              className="w-full h-32 px-4 py-3 rounded-2xl border border-gray-100 text-xs font-mono outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 transition-all resize-none"
              placeholder="Instrucciones para pago en efectivo..."
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex bg-gray-50 p-1 rounded-xl w-full lg:w-auto">
          <button 
            onClick={() => setView("users")}
            className={`flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${view === 'users' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
          >
            <User className="w-3 h-3" />
            <span>Usuarios</span>
          </button>
          <button 
            onClick={() => setView("payments")}
            className={`flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${view === 'payments' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
          >
            <CreditCard className="w-3 h-3" />
            <span>Pagos</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center space-x-2 text-red-500 italic bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span className="font-bold uppercase text-[8px] md:text-[10px] tracking-widest leading-tight">Borrado omitido por seguridad</span>
          </div>
          <button 
            onClick={onExport}
            className="flex items-center justify-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-bold uppercase text-[10px] hover:bg-black transition-all shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Data</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {view === "users" ? (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Participante</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Grupo</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {registrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {editingId === reg.id && editType === "registration" ? (
                        <div className="space-y-2 max-w-xs">
                          <input 
                            className="w-full px-2 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-primary uppercase font-bold"
                            value={editValues.firstName} 
                            onChange={e => setEditValues({...editValues, firstName: e.target.value})}
                          />
                          <input 
                            className="w-full px-2 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-primary uppercase font-bold"
                            value={editValues.lastName} 
                            onChange={e => setEditValues({...editValues, lastName: e.target.value})}
                          />
                          <input 
                            className="w-full px-2 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-primary font-mono"
                            value={editValues.idNumber} 
                            onChange={e => setEditValues({...editValues, idNumber: e.target.value})}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-gray-900 uppercase text-sm">{reg.firstName} {reg.lastName}</p>
                              <p className="text-xs text-gray-500 font-mono">V-{reg.idNumber}</p>
                            </div>
                            {reg.validatedBy && (
                              <span className="text-[8px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter self-start mt-0.5">
                                Val: {reg.validatedBy.replace("Sistema (Leindenz)", "Sistema Admin").replace("Sistema (Andres)", "Sistema Ops")}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4">
                       {editingId === reg.id && editType === "registration" ? (
                         <select 
                          className="w-full px-2 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-primary uppercase font-bold bg-white"
                          value={editValues.scoutGroup}
                          onChange={e => setEditValues({...editValues, scoutGroup: e.target.value})}
                         >
                           {["ARISTIDES ROJAS", "BICENTENARIO", "DON BOSCO 21", "HENRI PITTIER", "LA SALLE LA COLINA", "NEPTUNO"].map(g => (
                             <option key={g} value={g}>{g}</option>
                           ))}
                         </select>
                       ) : (
                         <p className="text-xs font-bold text-gray-800 uppercase">{reg.scoutGroup}</p>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                         {editingId === reg.id && editType === "registration" ? (
                           <>
                            <button onClick={handleSave} className="p-2 text-green-600 hover:bg-green-50 rounded-xl" title="Guardar"><Save className="w-5 h-5" /></button>
                            <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl" title="Cancelar"><X className="w-5 h-5" /></button>
                           </>
                         ) : (
                           <>
                            <button onClick={() => startEditRegistration(reg)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all" title="Editar"><Edit3 className="w-5 h-5" /></button>
                            <button onClick={() => handleDeleteRegistration(reg.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Eliminar"><Trash2 className="w-5 h-5" /></button>
                           </>
                         )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Cédula</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Monto</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Tasa</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Fecha</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono font-bold">
                      {p.idNumber}
                      {p.approvedBy && (
                        <div className="text-[8px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">
                           Admin: {p.approvedBy.replace("Sistema (Leindenz)", "Sistema Admin").replace("Sistema (Andres)", "Sistema Ops")}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === p.id && editType === "payment" ? (
                        <input 
                          type="number"
                          className="w-24 px-2 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-primary font-mono"
                          value={editValues.amount} 
                          onChange={e => setEditValues({...editValues, amount: parseFloat(e.target.value)})}
                        />
                      ) : (
                        <p className="text-xs font-bold">{p.amount} {p.paymentMethod === PaymentMethod.TRANSFER ? "Bs" : "$"}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === p.id && editType === "payment" ? (
                        <input 
                          type="number"
                          className="w-24 px-2 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-primary font-mono"
                          value={editValues.exchangeRate} 
                          onChange={e => setEditValues({...editValues, exchangeRate: parseFloat(e.target.value)})}
                        />
                      ) : (
                        <p className="text-xs text-gray-500">{p.exchangeRate || "-"}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                       {editingId === p.id && editType === "payment" ? (
                        <input 
                          type="date"
                          className="w-32 px-2 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-primary"
                          value={editValues.paymentDate} 
                          onChange={e => setEditValues({...editValues, paymentDate: e.target.value})}
                        />
                      ) : (
                        <p className="text-xs">{p.paymentDate}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                         {editingId === p.id && editType === "payment" ? (
                           <>
                            <button onClick={handleSave} className="p-2 text-green-600 hover:bg-green-50 rounded-xl" title="Guardar"><Save className="w-5 h-5" /></button>
                            <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl" title="Cancelar"><X className="w-5 h-5" /></button>
                           </>
                         ) : (
                           <>
                            {p.proofUrl && <button onClick={() => setViewProof(p)} className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all" title="Ver Comprobante"><Eye className="w-5 h-5" /></button>}
                            <button onClick={() => startEditPayment(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all" title="Editar"><Edit3 className="w-5 h-5" /></button>
                            <button onClick={() => handleDeletePayment(p.id!)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Eliminar"><Trash2 className="w-5 h-5" /></button>
                           </>
                         )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
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
