import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { parse } from "date-fns";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Registration, Config } from "../types";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface Props {
  config: Config | null;
}

export default function ScanEntry({ config }: Props) {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [participant, setParticipant] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false); // Add this
  const qrCodeRef = useRef<Html5Qrcode | null>(null);

  const startScanner = async () => {
    // Ensure any existing scanner is stopped/cleared
    if (qrCodeRef.current) {
        try {
            await qrCodeRef.current.stop();
        } catch (e) {
            console.error("Error stopping scanner", e);
        }
        qrCodeRef.current = null;
    }

    setIsScanning(true);
    setResultMessage(null);
    setLoading(false);
    
    // Give the DOM a moment to remove the "hidden" class from the "reader" container
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("reader");
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onScanSuccess,
          (errorMessage) => console.log(errorMessage)
        );
        qrCodeRef.current = scanner;
      } catch (err) {
        console.error(err);
        setIsScanning(false);
        setResultMessage("No se pudo acceder a la cámara. Por favor, asegúrate de haber otorgado los permisos necesarios en la configuración de la aplicación o del navegador.");
      }
    }, 200); // Increased timeout slightly
  };

  useEffect(() => {
    return () => {
      if (qrCodeRef.current) {
        qrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const onScanSuccess = async (decodedText: string) => {
    setScanResult(decodedText);
    if (qrCodeRef.current) {
        await qrCodeRef.current.stop();
        qrCodeRef.current = null;
        setIsScanning(false); // Set false
    }
    await processScan(decodedText);
  };

  const isPhaseActive = (phase: any) => {
    // Fallback to phase.date if startDate/endDate are missing for some reason
    const startStr = phase.startDate || phase.date || "";
    const endStr = phase.endDate || phase.date || "";
    
    if (!startStr || !endStr) return false;
    
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

    const startDate = parseDate(startStr);
    const endDate = parseDate(endStr);
    
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return false;
    }
    
    const [startH, startM] = (phase.startTime || phase.time || "00:00").split(':').map(Number);
    const [endH, endM] = (phase.endTime || "23:59").split(':').map(Number);
    
    startDate.setHours(startH, startM, 0, 0);
    endDate.setHours(endH, endM, 59, 999);
    
    return now >= startDate && now <= endDate;
  };

  const processScan = async (idNumber: string) => {
    setLoading(true);
    setResultMessage(null);
    try {
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const q = query(collection(db, "registrations"), where("idNumber", "==", idNumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setResultMessage("Participante no encontrado");
      } else {
        const docRef = querySnapshot.docs[0];
        const participantData = docRef.data() as Registration;
        
        // Find active phase using the shared logic
        const activePhase = config?.phases?.find(isPhaseActive);

        if (!activePhase) {
          setResultMessage("No hay fases activas en este momento.");
        } else {
          // Update attendance
          const phaseAttendance = participantData.phaseAttendance || {};
          
          if (phaseAttendance[activePhase.id]?.attended) {
            setResultMessage(`ALERTA: ${participantData.firstName} ${participantData.lastName} (${participantData.scoutGroup || 'Sin grupo'}) YA estaba registrado en ${activePhase.name}`);
          } else {
            phaseAttendance[activePhase.id] = {
              attended: true,
              time: new Date().toISOString(),
              by: "Scanner App"
            };
            
            await updateDoc(docRef.ref, { phaseAttendance });
            setParticipant(participantData);
            setResultMessage(`ÉXITO: ${participantData.firstName} ${participantData.lastName} (${participantData.scoutGroup || 'Sin grupo'}) registrado en ${activePhase.name}`);
          }
        }
      }
    } catch (e) {
      console.error(e);
      setResultMessage("Error al marcar asistencia");
    } finally {
      setLoading(false);
    }
  };

  const activePhases = config?.phases?.filter(isPhaseActive) || [];
  const hasActivePhase = activePhases.length > 0;

  return (
    <div className="space-y-6">
      {!hasActivePhase && (
        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 text-center">
            <h3 className="font-bold text-amber-800 mb-2">No hay fases activas ahora</h3>
            <p className="text-amber-700 text-xs mb-4">Próximas fases:</p>
            <div className="space-y-2">
                {config?.phases?.map(p => (
                    <div key={p.id} className="text-xs text-amber-900 border-b border-amber-200 pb-1">
                        <span className="font-semibold">{p.name}:</span> {p.startDate} al {p.endDate}
                    </div>
                ))}
            </div>
        </div>
      )}

      {hasActivePhase && (
        <div id="reader" className={`w-full max-w-md mx-auto ${(!isScanning || resultMessage || loading) ? "hidden" : "block mb-4"}`}></div>
      )}
      
      {!isScanning && !resultMessage && !loading && hasActivePhase && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center space-y-4">
          <p className="text-gray-600 text-sm">
            Para escanear códigos QR, necesitamos que autorices el acceso a la cámara de tu dispositivo.
          </p>
          <button 
            onClick={startScanner}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-primary-dark transition-all"
          >
            Autorizar Cámara y Escanear
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center"><Loader2 className="animate-spin text-primary w-8 h-8"/></div>
      ) : (
        resultMessage && (
          <div className={`p-4 rounded-xl text-center font-bold ${resultMessage.includes("Error") || resultMessage.includes("no encontrado") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {resultMessage}
          </div>
        )
      )}
      
      {resultMessage && (
        <button 
          onClick={() => {
            setResultMessage(null);
            setScanResult(null);
            setTimeout(() => {
              startScanner();
            }, 100);
          }}
          className="block mx-auto bg-gray-100 text-gray-600 px-6 py-2 rounded-xl font-bold uppercase transition-all hover:bg-gray-200"
        >
          Escanear otro
        </button>
      )}

    </div>
  );
}
