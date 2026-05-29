import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { SCOUT_GROUPS } from "../constants";
import { Config, GroupAttachment } from "../types";
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/error-handler";

interface Props {
  config: Config;
}

export default function GroupAttachmentsSection({ config }: Props) {
  const [selectedGroup, setSelectedGroup] = useState("");
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = (file: File) => {
    setError(null);
    setSuccess(false);

    // Validate size (800KB)
    if (file.size > 1024 * 800) {
      setError("El archivo es demasiado pesado. El límite máximo es 800KB.");
      return;
    }

    // Validate type
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      setError("Tipo de archivo no permitido. Solo se aceptan PDFs o Imágenes.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileData(event.target?.result as string);
      setFileName(file.name);
      setFileType(file.type);
    };
    reader.onerror = () => {
      setError("Error al leer el archivo.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) {
      setError("Por favor selecciona tu grupo scout.");
      return;
    }
    if (!fileData) {
      setError("Por favor adjunta un archivo PDF o Imagen.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const attachment: GroupAttachment = {
        scoutGroup: selectedGroup,
        fileName,
        fileType,
        fileData,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "group_attachments"), attachment);
      setSuccess(true);
      // Reset form
      setFileData(null);
      setFileName("");
      setFileType("");
      setSelectedGroup("");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "group_attachments");
      setError("Ocurrió un error al guardar el adjunto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 md:p-12 rounded-[40px] border border-gray-150 shadow-sm mt-16 max-w-3xl mx-auto text-left" id="group-attachments-section">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="bg-primary/10 p-4 rounded-3xl text-primary mb-4">
          <Upload className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter">
          {config.attachmentsTitle || "Adjuntar Documentos del Grupo Scout"}
        </h2>
        {config.attachmentsDescription && (
          <p className="text-gray-600 mt-2 text-sm md:text-base max-w-xl">
            {config.attachmentsDescription}
          </p>
        )}
      </div>

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-start space-x-3 text-sm animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">¡Archivo enviado con éxito!</p>
            <p className="text-xs text-emerald-700 mt-1">El documento ha sido cargado satisfactoriamente y está disponible para la revisión del superadministrador.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-start space-x-3 text-sm animate-in fade-in duration-300">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase text-gray-500 tracking-wider">Grupo Scout</label>
          <select
            required
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none bg-white font-bold text-sm tracking-wider"
          >
            <option value="" disabled>SELECCIONAR TU GRUPO SCOUT</option>
            {SCOUT_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase text-gray-500 tracking-wider">Archivo (PDF o Imagen, máx. 800KB)</label>
          
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 transition-all text-center flex flex-col items-center justify-center cursor-pointer min-h-[160px] ${
              isDragOver
                ? "border-primary bg-primary/5 scale-[0.99]"
                : fileData
                ? "border-emerald-400 bg-emerald-50/20"
                : "border-gray-200 hover:border-primary hover:bg-gray-50/50"
            }`}
            onClick={() => document.getElementById("attachment-file-input")?.click()}
          >
            <input
              id="attachment-file-input"
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {fileData ? (
              <div className="space-y-2">
                <FileText className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <p className="text-sm font-bold text-gray-800 break-all">{fileName}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Haz clic para cambiar archivo</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 text-gray-300 mx-auto group-hover:text-primary transition-colors" />
                <p className="text-sm font-bold text-gray-600">Arrastra tu archivo aquí o haz clic para explorar</p>
                <p className="text-xs text-gray-400">Archivos PDF, PNG, JPG de hasta 800KB</p>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !selectedGroup || !fileData}
          className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded-2xl py-4 font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-primary/20 hover:shadow-xl transition-all hover:-translate-y-0.5 flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Subiendo Documento...</span>
            </>
          ) : (
            <span>Enviar Adjunto de Grupo</span>
          )}
        </button>
      </form>
    </div>
  );
}
