import React from "react";
import { Payment, Status, PaymentMethod } from "../types";
import { Download, XCircle, Eye } from "lucide-react";

interface Props {
  payment: Payment;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export default function ProofViewer({ payment, onClose, onApprove, onReject }: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] p-2 sm:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gray-50 border-b flex justify-between items-center sticky top-0 z-10">
          <div>
            <h4 className="font-bold uppercase italic text-primary text-sm sm:text-base">Visualización de Pago</h4>
            <p className="text-[10px] sm:text-xs text-gray-500">Documento: {payment.idNumber}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            aria-label="Cerrar"
          >
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 flex-1">
          {/* Details Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-gray-100 p-3 sm:p-4 rounded-2xl">
              <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {payment.paymentMethod === PaymentMethod.TRANSFER ? 'Referencia' : 'Número de Recibo'}
              </p>
              <p className="font-mono font-bold text-base sm:text-lg truncate">
                {payment.paymentMethod === PaymentMethod.TRANSFER ? payment.bankReference : payment.receiptNumber}
              </p>
            </div>
            <div className={`${payment.paymentMethod === PaymentMethod.TRANSFER ? 'bg-primary/5' : 'bg-green-50'} p-3 sm:p-4 rounded-2xl`}>
              <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${payment.paymentMethod === PaymentMethod.TRANSFER ? 'text-primary/60' : 'text-green-400'}`}>
                Equivalente USD
              </p>
              <p className={`font-mono font-bold text-base sm:text-lg ${payment.paymentMethod === PaymentMethod.TRANSFER ? 'text-primary' : 'text-green-600'}`}>
                ${payment.amountUSD.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Conversion Row for Transfers */}
          {payment.paymentMethod === PaymentMethod.TRANSFER && payment.exchangeRate && (
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
              <p className="text-[9px] sm:text-[10px] font-bold text-amber-500 uppercase tracking-widest">Detalle de Reporte</p>
              <p className="font-mono text-xs text-amber-700">Monto: Bs {payment.amount.toFixed(2)} | Tasa: {payment.exchangeRate}</p>
            </div>
          )}
          
          {/* File Preview */}
          <div className="border border-gray-200 rounded-3xl overflow-hidden bg-gray-50 flex items-center justify-center min-h-[300px] max-h-[500px] overflow-y-auto shadow-inner group">
            {payment.proofUrl && payment.proofUrl.startsWith('data:image/') ? (
              <img 
                src={payment.proofUrl} 
                alt="Comprobante" 
                className="max-w-full h-auto"
              />
            ) : (
              <div className="p-8 sm:p-12 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Download className="text-blue-600 w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-900 text-xs sm:text-sm">{payment.proofName || "Archivo adjunto"}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Este formato no es previsualizable directamente</p>
                </div>
              </div>
            )}
          </div>

          {/* Download Button */}
          <div className="flex justify-center pb-2">
            <button 
              onClick={() => {
                if (!payment.proofUrl) return;
                const link = document.createElement('a');
                link.href = payment.proofUrl;
                link.download = payment.proofName || "comprobante_pago";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="bg-blue-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl font-bold uppercase text-[10px] sm:text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 inline-flex items-center space-x-2"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Descargar Archivo Original</span>
            </button>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 sm:p-6 bg-gray-50 border-t flex gap-2 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => onReject(payment.id!)}
            className="flex-1 py-3 bg-red-100 text-red-600 rounded-2xl font-bold uppercase text-[10px] sm:text-xs hover:bg-red-200 transition-all font-black tracking-widest"
          >
            RECHAZAR
          </button>
          <button 
            onClick={() => onApprove(payment.id!)}
            className="flex-1 py-3 bg-green-600 text-white rounded-2xl font-bold uppercase text-[10px] sm:text-xs hover:bg-green-700 transition-all shadow-lg shadow-green-200 font-black tracking-widest"
          >
            APROBAR
          </button>
        </div>
      </div>
    </div>
  );
}
