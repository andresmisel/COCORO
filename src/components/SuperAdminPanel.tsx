import { useState, useEffect } from "react";
import { Registration, MembershipType, Status } from "../types";
import { updateDoc, doc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Trash2, Edit3, Save, X, Download, AlertTriangle, Settings, Loader2 } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/error-handler";

interface Props {
  registrations: Registration[];
  onExport: () => void;
}

export default function SuperAdminPanel({ registrations, onExport }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Registration>>({});
  
  const [config, setConfig] = useState({ bankDetails: "", cashDetails: "" });
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, "config", "global"));
        if (configDoc.exists()) {
          setConfig({
            bankDetails: configDoc.data().bankDetails || "",
            cashDetails: configDoc.data().cashDetails || ""
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

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "registrations", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `registrations/${id}`);
    }
  };

  const startEdit = (reg: Registration) => {
    setEditingId(reg.id);
    setEditValues({
      firstName: reg.firstName,
      lastName: reg.lastName,
      idNumber: reg.idNumber,
      email: reg.email,
      scoutGroup: reg.scoutGroup,
      membershipType: reg.membershipType,
    });
  };

  const handleSave = async (id: string) => {
    try {
      await updateDoc(doc(db, "registrations", id), editValues);
      setEditingId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `registrations/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Config Sections */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-primary">
            <Settings className="w-5 h-5" />
            <h3 className="font-bold uppercase text-xs tracking-widest">Configuración del Formulario</h3>
          </div>
          <button 
            onClick={() => isEditingConfig ? saveConfig() : setIsEditingConfig(true)}
            disabled={configLoading}
            className="flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-xl font-bold uppercase text-[10px] hover:bg-primary/20 transition-all"
          >
            {configLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isEditingConfig ? <Save className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
            <span>{isEditingConfig ? "Guardar Cambios" : "Editar Instrucciones"}</span>
          </button>
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

      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 italic">
        <div className="flex items-center space-x-2 text-red-500">
          <AlertTriangle className="w-4 h-4" />
          <h3 className="font-bold uppercase text-xs tracking-widest pl-2">Acceso de Control Total (PELIGRO)</h3>
        </div>
        <button 
          onClick={onExport}
          className="flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-bold uppercase text-xs hover:bg-black transition-all shadow-lg"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Base de Datos</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
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
                    {editingId === reg.id ? (
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
                        <p className="font-bold text-gray-900 uppercase text-sm">{reg.firstName} {reg.lastName}</p>
                        <p className="text-xs text-gray-500 font-mono">V-{reg.idNumber}</p>
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4">
                     {editingId === reg.id ? (
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
                       {editingId === reg.id ? (
                         <>
                          <button onClick={() => handleSave(reg.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-xl" title="Guardar"><Save className="w-5 h-5" /></button>
                          <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl" title="Cancelar"><X className="w-5 h-5" /></button>
                         </>
                       ) : (
                         <>
                          <button onClick={() => startEdit(reg)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all" title="Editar"><Edit3 className="w-5 h-5" /></button>
                          <button onClick={() => handleDelete(reg.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Eliminar"><Trash2 className="w-5 h-5" /></button>
                         </>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
