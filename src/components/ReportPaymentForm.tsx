import React from "react";
import { parse } from "date-fns";
import { PaymentMethod, Config } from "../types";
import { CreditCard, Loader2 } from "lucide-react";

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  config: Config | null;
  totalApprovedUSD: number;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ReportPaymentForm({ formData, setFormData, config, totalApprovedUSD, handleFileChange }: Props) {
  return (
    <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-primary">
          <CreditCard className="w-5 h-5" />
          <h3 className="font-bold uppercase text-sm tracking-widest">Información de Cuota</h3>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, paymentMethod: PaymentMethod.TRANSFER })}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${formData.paymentMethod === PaymentMethod.TRANSFER ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Transferencia
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, paymentMethod: PaymentMethod.CASH })}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${formData.paymentMethod === PaymentMethod.CASH ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Efectivo
          </button>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-xl border border-primary/20 text-sm font-mono whitespace-pre-wrap">
        {formData.paymentMethod === PaymentMethod.TRANSFER ? config?.bankDetails : config?.cashDetails || "Cargando..."}
      </div>

      {config && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded-xl border border-primary/10 flex flex-col items-center justify-center space-y-1">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Abonado</span>
              <span className="text-sm font-black text-green-600 font-mono">${(totalApprovedUSD || 0).toFixed(2)}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-primary/10 flex flex-col items-center justify-center space-y-1">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Pendiente</span>
              <span className="text-sm font-black text-primary font-mono">${Math.max(0, (config?.totalCostUSD || 0) - (totalApprovedUSD || 0)).toFixed(2)}</span>
            </div>
          </div>
          {(() => {
            const now = new Date();
            const parseDate = (d: string) => {
              if (!d) return null;
              // Try common formats
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
              console.log("DEBUG IS_PHASE_ACTIVE: Phase", phase.name, "Start:", startStr, "End:", endStr);
              if (!startStr || !endStr) return false;
              const sDate = parseDate(startStr);
              const eDate = parseDate(endStr);
              if (!sDate || !eDate || isNaN(sDate.getTime()) || isNaN(eDate.getTime())) return false;
              
              const [startH, startM] = (phase.startTime || phase.time || "00:00").split(':').map(Number);
              const [endH, endM] = (phase.endTime || "23:59").split(':').map(Number);
              
              sDate.setHours(startH, startM, 0, 0);
              eDate.setHours(endH, endM, 59, 999);
              
              const active = now >= sDate && now <= eDate;
              console.log("DEBUG IS_PHASE_ACTIVE: result", phase.name, "Active:", active, "Now:", now.toISOString(), "Start:", sDate.toISOString(), "End:", eDate.toISOString());
              return active;
            };

            const isPhaseUpcoming = (phase: any) => {
              const startStr = phase.startDate || phase.date || "";
              if (!startStr) return false;
              const sDate = parseDate(startStr);
              return sDate && sDate > now;
            };

            const sortedPhases = [...(config.phases || [])]
              .sort((a, b) => {
                const s1 = parseDate(a.startDate || a.date || "");
                const s2 = parseDate(b.startDate || b.date || "");
                return (s1?.getTime() || 0) - (s2?.getTime() || 0);
              });
            
            const activePhase = config.phases?.find(isPhaseActive);
            const isSolventForActive = activePhase ? (totalApprovedUSD >= (activePhase.minAmount || 0)) : true;

            const targetPhase = (!activePhase) 
              ? sortedPhases.find(phase => (totalApprovedUSD < (phase.minAmount || 0)))
              : (!isSolventForActive ? activePhase : null);

            return targetPhase ? (
              <div className="bg-white p-4 rounded-xl border border-primary/10 text-xs text-gray-600">
                <p>
                  Fase requerida para abonar: 
                  <span className="font-bold">{targetPhase.name}</span>
                </p>
                <p>
                  Monto mínimo para fase: <span className="font-bold">${targetPhase.minAmount}</span>
                </p>
              </div>
            ) : (
                <div className="bg-white p-4 rounded-xl border border-green-500/10 text-xs text-green-700">
                    <p className="font-bold">¡Estás solvente!</p>
                </div>
            );
          })()}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
        {formData.paymentMethod === PaymentMethod.TRANSFER ? (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-primary uppercase">Referencia</label>
              <input
                required
                type="text"
                value={formData.bankReference}
                onChange={(e) => setFormData({ ...formData, bankReference: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none transition-all"
                placeholder="123456"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-primary uppercase">Tasa (Bs)</label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.exchangeRate}
                onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none transition-all"
                placeholder="0.00"
              />
            </div>
          </>
        ) : (
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-bold text-primary uppercase">Número de Recibo</label>
            <input
              required
              type="text"
              value={formData.receiptNumber}
              onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none transition-all"
              placeholder="Ej. R-001"
            />
          </div>
        )}
        
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-primary uppercase">
            Monto ({formData.paymentMethod === PaymentMethod.TRANSFER ? 'Bs' : '$'})
          </label>
          <input
            required
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none transition-all"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-primary uppercase">Fecha</label>
          <input
            required
            type="date"
            value={formData.paymentDate}
            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Adjuntar Comprobante (Máximo 800KB)</label>
        <input 
          type="file"
          onChange={handleFileChange}
          className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
          accept="image/png, image/jpeg, image/jpg"
        />
      </div>
    </div>
  );
}
