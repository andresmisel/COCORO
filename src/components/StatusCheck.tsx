import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Registration, Status } from "../types";
import { QRCodeSVG } from "qrcode.react";
import { Search, Loader2, ChevronLeft, QrCode, AlertTriangle, CheckCircle, MessageSquare } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/error-handler";

interface Props {
  onBack: () => void;
}

export default function StatusCheck({ onBack }: Props) {
  const [idNumber, setIdNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!idNumber || !searched) return;

    const q = query(collection(db, "registrations"), where("idNumber", "==", idNumber));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        setRegistration({ id: docData.id, ...docData.data() } as Registration);
      } else {
        setRegistration(null);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "registrations");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [idNumber, searched]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumber) return;
    setLoading(true);
    setSearched(true);
  };
// ... rest of the file

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

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-gray-400" />
        </button>
        <h2 className="text-3xl font-bold text-gray-900 uppercase italic tracking-tight">Consultar Status</h2>
      </div>

      <form onSubmit={handleSearch} className="flex gap-4">
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
          className="bg-primary text-white px-8 rounded-2xl font-bold uppercase hover:bg-primary-dark transition-all disabled:opacity-70 flex items-center justify-center min-w-[120px]"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Buscar"}
        </button>
      </form>

      {searched && !registration && (
        <div className="bg-red-50 p-8 rounded-3xl text-center space-y-4 border border-red-100">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
          <h3 className="text-xl font-bold text-red-900">No se encontró registro</h3>
          <p className="text-red-700">Asegúrese de haber completado el formulario de inscripción correctamente.</p>
        </div>
      )}

      {registration && (
        <div className="bg-white p-8 rounded-3xl shadow-xl space-y-8 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-8">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Participante</h3>
              <p className="text-2xl font-bold text-gray-900 uppercase">{registration.firstName} {registration.lastName}</p>
              <p className="text-gray-500 font-mono">V-{registration.idNumber}</p>
            </div>
            <div className="flex gap-3">
              <div className={`px-4 py-2 rounded-xl text-center ${getStatusColor(registration.adminStatus)}`}>
                <p className="text-[10px] font-bold uppercase opacity-70">Administración</p>
                <p className="font-bold">{getStatusLabel(registration.adminStatus)}</p>
              </div>
              <div className={`px-4 py-2 rounded-xl text-center ${getStatusColor(registration.opsStatus)}`}>
                <p className="text-[10px] font-bold uppercase opacity-70">Operaciones</p>
                <p className="font-bold">{getStatusLabel(registration.opsStatus)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h4 className="font-bold text-gray-900 uppercase italic">Información Institucional</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex justify-between border-b border-gray-50 pb-2">
                  <span>Grupo Scout:</span>
                  <span className="font-bold text-gray-900">{registration.scoutGroup}</span>
                </li>
                <li className="flex justify-between border-b border-gray-50 pb-2">
                  <span>Membresía:</span>
                  <span className="font-bold text-gray-900">{registration.membershipType}</span>
                </li>
                <li className="flex justify-between border-b border-gray-50 pb-2">
                  <span>Status de Asistencia:</span>
                  <span className={`font-bold ${registration.checkedIn ? 'text-green-600' : 'text-gray-400'}`}>
                    {registration.checkedIn ? 'PRESENTE' : 'AUSENTE'}
                  </span>
                </li>
              </ul>

              {registration.adminStatus === Status.APPROVED && registration.opsStatus === Status.APPROVED ? (
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-start space-x-3">
                  <CheckCircle className="text-green-500 w-5 h-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-green-900 font-bold text-sm">Inscripción Completada</p>
                    <p className="text-green-700 text-xs text-balance">Presente su código QR al ingresar al evento para validación final.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start space-x-3">
                  <Loader2 className="text-amber-500 w-5 h-5 mt-0.5 animate-spin shrink-0" />
                  <div>
                    <p className="text-amber-900 font-bold text-sm">Verificación en Proceso</p>
                    <p className="text-amber-700 text-xs text-balance">Su código de acceso se generará una vez que ambas áreas completen la validación.</p>
                  </div>
                </div>
              )}

              {(registration.adminObservations || registration.opsObservations) && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                  <div className="flex items-center space-x-2 text-gray-500 mb-1">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Observaciones de Staff</span>
                  </div>
                  {registration.adminObservations && (
                    <div className="text-xs">
                      <span className="font-bold text-primary uppercase">Adm: </span>
                      <span className="text-gray-600">{registration.adminObservations}</span>
                    </div>
                  )}
                  {registration.opsObservations && (
                    <div className="text-xs">
                      <span className="font-bold text-blue-600 uppercase">Ops: </span>
                      <span className="text-gray-600">{registration.opsObservations}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              {registration.adminStatus === Status.APPROVED && registration.opsStatus === Status.APPROVED ? (
                <div className="text-center space-y-4">
                  <div className="bg-white p-4 rounded-2xl shadow-sm inline-block">
                    <QRCodeSVG 
                      value={registration.idNumber} 
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="mt-4 flex items-center space-x-2 text-primary font-bold text-xs uppercase tracking-widest">
                    <QrCode className="w-4 h-4" />
                    <span>Pase Digital de Acceso</span>
                  </div>
                </div>
              ) : (
                <div className="text-center opacity-30 select-none pointer-events-none">
                  <QrCode className="w-32 h-32 text-gray-400 mb-2 mx-auto" />
                  <p className="font-bold text-sm uppercase">QR bloqueado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
