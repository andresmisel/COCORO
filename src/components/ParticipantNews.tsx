import React, { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query, addDoc, deleteDoc, doc, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { NewsArticle, StaffMember } from "../types";
import { 
  Calendar, 
  ChevronLeft, 
  Image, 
  FileText, 
  ArrowRight, 
  BookOpen, 
  Sparkles, 
  Trash2, 
  Key, 
  LogOut, 
  PlusCircle, 
  AlertCircle, 
  Check, 
  Loader2,
  X 
} from "lucide-react";

interface Props {
  onBack?: () => void;
  isSection?: boolean;
  role?: string;
}

export default function ParticipantNews({ onBack, isSection, role }: Props) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);

  // Press authorization states
  const [isAuthorized, setIsAuthorized] = useState(() => {
    return sessionStorage.getItem("prensa_auth") === "true";
  });
  const [authorName, setAuthorName] = useState(() => {
    return sessionStorage.getItem("prensa_author_name") || "Prensa Oficial del Congreso";
  });
  const [showAuthInput, setShowAuthInput] = useState(false);
  const [authPass, setAuthPass] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Create news form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageType, setImageType] = useState<"upload" | "url">("upload");
  const [imageFileUrl, setImageFileUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    const q = query(collection(db, "news_articles"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as NewsArticle));
      setArticles(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching news:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handlePressLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authPass.trim()) {
      setAuthError("Debe ingresar la clave");
      return;
    }

    setAuthError("");
    setIsLoggingIn(true);

    // Hardcoded check
    if (authPass === "comunicaciones321" || authPass === "superadmin321") {
      setIsAuthorized(true);
      const name = authPass === "comunicaciones321" ? "Comunicaciones" : "Super Admin";
      setAuthorName(name);
      sessionStorage.setItem("prensa_auth", "true");
      sessionStorage.setItem("prensa_author_name", name);
      setShowAuthInput(false);
      setAuthPass("");
      setIsLoggingIn(false);
      return;
    }

    try {
      const q = query(collection(db, "staff"), where("password", "==", authPass.trim()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const staffData = querySnapshot.docs[0].data() as StaffMember;
        if (staffData.role === "comunicaciones" || staffData.role === "superadmin") {
          setIsAuthorized(true);
          const name = staffData.name || "Prensa Oficial del Congreso";
          setAuthorName(name);
          sessionStorage.setItem("prensa_auth", "true");
          sessionStorage.setItem("prensa_author_name", name);
          setShowAuthInput(false);
          setAuthPass("");
        } else {
          setAuthError("No autorizado para Prensa");
        }
      } else {
        setAuthError("Clave incorrecta");
      }
    } catch (err) {
      console.error("Error logging in:", err);
      setAuthError("Error al conectar");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 500) { // Limit to 500KB
      setFormError("La imagen de la noticia es muy pesada. El tamaño máximo es 500KB.");
      return;
    }

    setFormError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageFileUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setFormError("Debe llenar todos los campos.");
      return;
    }

    setIsPublishing(true);
    setFormError("");
    setFormSuccess("");

    const chosenImage = imageType === "upload" ? imageFileUrl : imageUrl;

    try {
      await addDoc(collection(db, "news_articles"), {
        title: title.trim(),
        description: description.trim(),
        imageUrl: chosenImage || "",
        createdAt: new Date().toISOString(),
        authorName: authorName
      });

      // Reset form
      setTitle("");
      setDescription("");
      setImageFileUrl("");
      setImageUrl("");
      setFormSuccess("¡Noticia publicada con éxito!");
      setShowCreateForm(false);
      
      setTimeout(() => {
        setFormSuccess("");
      }, 5000);
    } catch (err) {
      console.error("Error publishing article:", err);
      setFormError("Ocurrió un error al intentar publicar la noticia.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className={`max-w-5xl mx-auto animate-in fade-in duration-300 ${isSection ? "" : "py-8 px-4 md:py-12"}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-gray-150">
        <div>
          {onBack && (
            <button 
              onClick={onBack} 
              className="flex items-center space-x-1.5 text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-indigo-600 transition-colors mb-3 group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Volver al Inicio</span>
            </button>
          )}
          
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em]">Prensa & Boletines oficiales</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tight">Noticias del Evento</h1>
        </div>

        {/* Administrar Prensa Controls */}
        <div className="shrink-0">
          {isAuthorized ? (
            <div className="flex items-center gap-2.5 bg-indigo-50/70 border border-indigo-150 px-4 py-2 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">✍️ Prensa</span>
              <button
                onClick={() => {
                  setFormError("");
                  setFormSuccess("");
                  setShowCreateForm(!showCreateForm);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase px-3 py-1.5 flex items-center gap-1 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{showCreateForm ? 'Cerrar' : 'Redactar'}</span>
              </button>
              <button
                onClick={() => {
                  setIsAuthorized(false);
                  sessionStorage.removeItem("prensa_auth");
                  setShowCreateForm(false);
                }}
                className="bg-white hover:bg-red-50 hover:text-red-750 border border-indigo-150 text-gray-600 rounded-xl text-[10px] font-black uppercase px-3 py-1.5 flex items-center gap-1 transition-all"
              >
                <LogOut className="w-3.5 h-3.5 text-red-500" />
                <span>Salir</span>
              </button>
            </div>
          ) : (
            <div>
              {showAuthInput ? (
                <form onSubmit={handlePressLogin} className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="Clave Prensa..."
                    value={authPass}
                    onChange={(e) => setAuthPass(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-gray-250 text-xs focus:ring-1 focus:ring-indigo-600 outline-none text-center font-mono placeholder:font-sans"
                    autoFocus
                    required
                  />
                  <button
                    type="submit"
                    className="bg-indigo-650 text-white px-3 py-1.5 rounded-xl text-xs font-bold uppercase hover:bg-indigo-700 transition"
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAuthInput(false); setAuthError(""); setAuthPass(""); }}
                    className="text-gray-400 font-bold px-2 py-1 hover:text-gray-600 text-xs uppercase"
                  >
                    X
                  </button>
                  {authError && <span className="text-[10px] text-red-500 font-bold font-mono pl-1">{authError}</span>}
                </form>
              ) : (
                null
              )}
            </div>
          )}
        </div>
      </div>

      {formSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-150 rounded-2xl text-emerald-700 text-xs font-bold flex items-center gap-2 shadow-sm">
          <Check className="w-4 h-4 shrink-0 animate-bounce" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Create News Form */}
      {isAuthorized && showCreateForm && (
        <form onSubmit={handlePublish} className="mb-8 bg-gradient-to-br from-indigo-50/50 to-white p-6 md:p-8 rounded-[32px] border border-indigo-150/50 shadow-md space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <h3 className="font-black text-sm text-indigo-900 uppercase italic flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Redactar Boletín Informativo</span>
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Prensa Oficial</span>
          </div>

          {formError && (
            <div className="p-4 bg-rose-50 border border-rose-150 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Text inputs */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Título de la Noticia</label>
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-600/20"
                  placeholder="Ej: Gran apertura del campamento"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Contenido de la Noticia</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-40 p-4 rounded-xl border border-gray-200 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-indigo-600/20"
                  placeholder="Escribe el cuerpo de la noticia aquí..."
                  required
                />
              </div>
            </div>

            {/* Right Column: Image inputs and preview */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 block">Origen de la Imagen</label>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setImageType("upload")}
                    className={`flex-1 text-center py-2 text-xs font-black uppercase rounded-lg transition-all ${imageType === 'upload' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'}`}
                  >
                    Subir Archivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageType("url")}
                    className={`flex-1 text-center py-2 text-xs font-black uppercase rounded-lg transition-all ${imageType === 'url' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'}`}
                  >
                    Enlace URL
                  </button>
                </div>
              </div>

              {imageType === "upload" ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Seleccionar Imagen (Max 500KB)</label>
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs file:bg-indigo-50 file:border-0 file:text-indigo-700 file:px-3 file:py-1 file:rounded-lg file:font-bold file:text-[10px] file:uppercase hover:file:bg-indigo-100 file:transition-colors cursor-pointer"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Enlace URL de Imagen</label>
                  <input 
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-600/20"
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                </div>
              )}

              {/* Preview of chosen image */}
              {(imageFileUrl || imageUrl) && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 block">Vista Previa</span>
                  <div className="aspect-video max-h-28 rounded-2xl overflow-hidden border border-indigo-100 bg-gray-50 relative">
                    <img 
                      src={imageType === "upload" ? imageFileUrl : imageUrl} 
                      className="w-full h-full object-cover" 
                      alt="Preview" 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-indigo-150">
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setTitle("");
                setDescription("");
                setImageFileUrl("");
                setImageUrl("");
                setFormError("");
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold uppercase text-[10px] px-6 py-3 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPublishing}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-black uppercase text-[10px] tracking-wide px-8 py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2 cursor-pointer"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  <span>Publicando...</span>
                </>
              ) : (
                <span>Publicar Noticia</span>
              )}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cargando últimas noticias...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[32px] border border-gray-150 p-8 shadow-sm">
          <div className="bg-gray-100 p-4 rounded-3xl inline-block text-gray-400 mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 uppercase italic mb-2">No hay boletines disponibles</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            El equipo de comunicaciones aún no ha publicado noticias. Vuelve a consultar más tarde para enterarte de lo que pasa en directo.
          </p>
        </div>
      ) : selectedArticle ? (
        /* Full Article Detail Modal/View */
        <div className="bg-white rounded-[40px] border border-gray-150 shadow-md overflow-hidden animate-in zoom-in-95 duration-300">
          {selectedArticle.imageUrl ? (
            <div className="aspect-video bg-gray-50 overflow-hidden cursor-pointer">
              <img 
                src={selectedArticle.imageUrl} 
                className="w-full h-full object-cover transition-transform hover:scale-[1.02]" 
                alt={selectedArticle.title}
                onClick={() => {
                  setFullImageUrl(selectedArticle.imageUrl);
                  setShowFullImage(true);
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="aspect-video w-full flex flex-col items-center justify-center bg-gray-50 text-gray-300">
              <Image className="w-16 h-16 mb-2" />
              <span className="text-xs font-bold uppercase tracking-widest">Sin Imagen</span>
            </div>
          )}

          <div className="p-6 md:p-10 space-y-6">
            <div>
              <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-3 inline-block">Boletín Oficial</span>
              <h2 className="text-2xl md:text-3xl font-black uppercase italic leading-tight text-gray-900">{selectedArticle.title}</h2>
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-bold uppercase tracking-wider text-gray-400 pb-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Publicado el {new Date(selectedArticle.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            <p className="text-gray-700 text-base md:text-lg leading-relaxed whitespace-pre-wrap font-medium text-left">
              {selectedArticle.description}
            </p>

            <div className="pt-6 border-t border-gray-100 flex justify-start">
              <button
                onClick={() => setSelectedArticle(null)}
                className="inline-flex items-center space-x-2 bg-gray-900 hover:bg-black text-white px-6 py-3.5 rounded-2xl font-bold uppercase text-xs tracking-wider transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Volver al muro de noticias</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* News List (Bento Grid) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {articles.map((article) => (
            <div 
              key={article.id} 
              className="bg-white rounded-[32px] border border-gray-150 shadow-sm overflow-hidden flex flex-col hover:shadow-xl transition-all hover:-translate-y-1 group duration-300 relative"
            >
              {/* Card Image */}
              <div className="bg-gray-50 relative overflow-hidden shrink-0 aspect-video">
                {article.imageUrl ? (
                  <img 
                    src={article.imageUrl} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    alt={article.title} 
                    onError={(e) => { 
                      console.error("Error loading grid image:", article.imageUrl);
                      (e.target as HTMLImageElement).style.display = 'none'; 
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 min-h-[160px]">
                    <Image className="w-12 h-12 mb-1 text-gray-300" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Sin Imagen</span>
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm">
                  Prensa Rover
                </div>

                {!isSection && (role === "superadmin" || role === "comunicaciones") && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await deleteDoc(doc(db, "news_articles", article.id));
                      } catch (err) {
                        console.error("Error deleting news article:", err);
                      }
                    }}
                    className="absolute top-4 right-4 z-20 bg-red-500 hover:bg-red-700 text-white p-2 rounded-xl shadow-md transition-all cursor-pointer"
                    title="Eliminar Noticia"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                )}
              </div>

              {/* Card Content */}
              <div className="p-6 md:p-8 flex flex-col justify-between flex-1 space-y-4 text-left">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                  </div>

                  <h3 className="text-xl md:text-2xl font-black text-gray-950 uppercase italic tracking-tight leading-snug group-hover:text-indigo-600 transition-colors">
                    {article.title}
                  </h3>

                  <p className="text-gray-500 text-xs md:text-sm leading-relaxed line-clamp-3 font-medium">
                    {article.description}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      console.log("Selecting article:", article.title);
                      setSelectedArticle(article);
                    }}
                    className="inline-flex items-center space-x-2 text-indigo-600 font-black uppercase text-xs tracking-wider group/btn"
                  >
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>Leer Artículo Completo</span>
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Full Screen Image Overlay */}
      {showFullImage && fullImageUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300 cursor-zoom-out"
          onClick={() => setShowFullImage(false)}
        >
          <div 
            className="relative cursor-default max-w-[90vw] max-h-[85vh]" 
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fullImageUrl}
              className="max-w-full max-h-[80vh] object-contain"
              alt="Full view"
            />
            <button
              className="absolute -top-12 right-0 text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all cursor-pointer"
              onClick={() => setShowFullImage(false)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
