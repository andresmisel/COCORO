import React, { useState, useEffect } from "react";
import { doc, getDoc, getDocs, collection, setDoc, addDoc, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Vote, CheckCircle2, ShieldCheck, AlertCircle, Loader2, Award, Calendar } from "lucide-react";
import { Config, Candidate, Status } from "../types";

interface Props {
  onBack: () => void;
}

export default function VotingPlatform({ onBack }: Props) {
  const [config, setConfig] = useState<Config | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [idNumber, setIdNumber] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verifiedVoter, setVerifiedVoter] = useState<any>(null);
  const [hasVoted, setHasVoted] = useState(false);
  
  // Voting flow state
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [isCastingVote, setIsCastingVote] = useState(false);
  const [votingSuccess, setVotingSuccess] = useState(false);

  // Results display
  const [isElectionClosed, setIsElectionClosed] = useState(false);
  const [totalVotes, setTotalVotes] = useState(0);
  const [voteCountMap, setVoteCountMap] = useState<{ [candId: string]: number }>({});
  const [voterAuditList, setVoterAuditList] = useState<any[]>([]);

  useEffect(() => {
    // Fetch global configuration
    const fetchConfigAndCandidates = async () => {
      try {
        const configDoc = await getDoc(doc(db, "config", "global"));
        if (configDoc.exists()) {
          const cfg = configDoc.data() as Config;
          setConfig(cfg);

          // Check if election closed
          if (cfg.votingDeadline) {
            const now = new Date();
            const dl = new Date(cfg.votingDeadline);
            if (now > dl) {
              setIsElectionClosed(true);
            }
          }
        }

        // Fetch candidates
        const candSnap = await getDocs(collection(db, "candidates"));
        const candList = candSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate));
        setCandidates(candList);
      } catch (e) {
        console.error("Error loading voting data:", e);
      }
    };

    fetchConfigAndCandidates();
  }, []);

  // Fetch live results and audit lists if closed or success or voted
  useEffect(() => {
    if (isElectionClosed || votingSuccess || hasVoted) {
      const fetchResultsAndAudit = async () => {
        try {
          const ballotSnap = await getDocs(collection(db, "votes_ballot"));
          const ballots = ballotSnap.docs.map(doc => doc.data());
          setTotalVotes(ballots.length);

          const counts: { [id: string]: number } = {};
          ballots.forEach(b => {
            counts[b.candidateId] = (counts[b.candidateId] || 0) + 1;
          });
          setVoteCountMap(counts);

          // Get audit list
          const auditSnap = await getDocs(collection(db, "votes_audit"));
          const audits = auditSnap.docs.map(doc => doc.data());
          setVoterAuditList(audits);
        } catch (e) {
          console.error("Error loading election results & audit:", e);
        }
      };
      fetchResultsAndAudit();
    }
  }, [isElectionClosed, votingSuccess, hasVoted]);

  const verifyVoterEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumber.trim()) return;

    setIsVerifying(true);
    setVerificationError("");
    setVerifiedVoter(null);
    setHasVoted(false);

    try {
      // 1. Check if they have already voted in this election
      const auditDoc = await getDoc(doc(db, "votes_audit", idNumber.trim()));
      if (auditDoc.exists()) {
        const auditData = auditDoc.data();
        setHasVoted(true);
        setVerifiedVoter(auditData);
        setIsVerifying(false);
        return;
      }

      // 2. Fetch voter registration status
      const regQuery = query(collection(db, "registrations"), where("idNumber", "==", idNumber.trim()));
      const regSnap = await getDocs(regQuery);
      if (regSnap.empty) {
        setVerificationError("Cédula no encontrada. Por favor, asegúrese de registrarse primero en el evento.");
        setIsVerifying(false);
        return;
      }

      const regDoc = regSnap.docs[0];
      const voter = regDoc.data();

      // 3. Must be APPROVED registration status
      if (voter.opsStatus !== Status.APPROVED) {
        setVerificationError("Su registro no se encuentra verificado por el equipo de Operaciones todavía.");
        setIsVerifying(false);
        return;
      }

      // 4. Must be a DELEGADO to vote
      if (voter.votingRole !== "Delegado") {
        setVerificationError(`Su rol asignado es "${voter.votingRole || "Observador"}". Únicamente los Delegados autorizados por el Staff de Operaciones pueden votar.`);
        setIsVerifying(false);
        return;
      }

      // 5. Check Target Unit (Joven / Adulto / Ambos)
      if (config?.votingTargetUnit && config.votingTargetUnit !== "Ambos") {
        if (voter.membershipType !== config.votingTargetUnit) {
          setVerificationError(`Esta votación está habilitada únicamente para la membresía tipo "${config.votingTargetUnit}". Su tipo es "${voter.membershipType}".`);
          setIsVerifying(false);
          return;
        }
      }

      // All checks passed!
      setVerifiedVoter(voter);
    } catch (err) {
      console.error(err);
      setVerificationError("Ocurrió un error al verificar su elegibilidad electoral.");
    } finally {
      setIsVerifying(false);
    }
  };

  const submitVote = async () => {
    if (!selectedCandidateId || !verifiedVoter) return;

    setIsCastingVote(true);
    try {
      const nowStr = new Date().toISOString();

      // 1. Audit Log: write to votes_audit (linked to idNumber to prevent double-voting)
      await setDoc(doc(db, "votes_audit", idNumber.trim()), {
        idNumber: idNumber.trim(),
        name: `${verifiedVoter.firstName} ${verifiedVoter.lastName}`,
        scoutGroup: verifiedVoter.scoutGroup,
        votedAt: nowStr
      });

      // 2. Secret Ballot: write to random doc in votes_ballot (no link to identification)
      await addDoc(collection(db, "votes_ballot"), {
        candidateId: selectedCandidateId,
        votedAt: nowStr
      });

      setVotingSuccess(true);
      // Auto-reset state for the next voter after 2 seconds
      setTimeout(() => {
        setVerifiedVoter(null);
        setHasVoted(false);
        setVerificationError("");
        setIdNumber("");
        setSelectedCandidateId("");
        setVotingSuccess(false);
      }, 2000);
    } catch (e) {
      console.error(e);
      alert("Error al enviar el voto. Inténtelo de nuevo.");
    } finally {
      setIsCastingVote(false);
    }
  };

  // Convert closing date representation
  const formatDeadline = (dlStr?: string) => {
    if (!dlStr) return "";
    return new Date(dlStr).toLocaleString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-8 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
      {/* Back button */}
      <div className="flex justify-start">
        <button 
          onClick={onBack}
          className="px-4 py-2 bg-gray-55 hover:bg-gray-100 rounded-xl text-xs font-bold uppercase text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
        >
          ← Volver
        </button>
      </div>

      <div>
        <div className="mx-auto bg-primary/10 p-4 rounded-3xl w-14 h-14 flex items-center justify-center text-primary mb-6">
          <Vote className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tighter leading-none mb-2">
          {config?.votingTitle || "Urna Electoral Digital"}
        </h2>
        <p className="text-sm text-gray-450 italic max-w-lg mx-auto">
          {config?.votingQuestion || "¿Quién deseas que sea el próximo representante?"}
        </p>
      </div>

      {config?.votingDeadline && (
        <div className="flex items-center justify-center space-x-2 text-xs bg-gray-50 text-gray-500 px-4 py-2 rounded-2xl border border-gray-100/50 max-w-md mx-auto">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="font-bold">Fin de votación:</span>
          <span>{formatDeadline(config.votingDeadline)}</span>
        </div>
      )}

      {/* Main interface card */}
      <div className="bg-gray-50/50 rounded-3xl p-6 md:p-8 border border-gray-100/55">
        
        {votingSuccess ? (
          /* SCENARIO 1: Success cast animation */
          <div className="py-12 flex flex-col items-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 animate-bounce" />
            <h3 className="text-2xl font-black text-green-700 uppercase italic tracking-tight">¡Voto Secreto Procesado!</h3>
            <p className="text-xs text-gray-500 max-w-sm">
              Tu participación electoral ha sido validada y guardada de forma segura y 100% secreta.
            </p>
          </div>
        ) : isElectionClosed ? (
          /* SCENARIO 2: CLOSED / DEADLINE PASSED -> SHOW GRAPHICAL RESULTS */
          !config?.showVotingResults ? (
            <div className="py-8 space-y-4 text-center w-full">
              <div className="mx-auto w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center border border-amber-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Proceso Electoral Cerrado</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                El tiempo para votar ha concluido formalmente. Los resultados oficiales se encuentran resguardados temporalmente y se publicarán cuando el Staff de Operaciones lo autorice.
              </p>
              <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100/50 text-amber-800 text-[11px] font-medium max-w-sm mx-auto">
                🔒 Urna electrónica sellada.
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-left w-full">
              <div className="border-b border-gray-150 pb-4 text-center">
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-[0.2em] bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                  Proceso Electoral Cerrado
                </span>
                <p className="text-xs text-gray-400 mt-3">
                  El tiempo para votar ha terminado. Consulta los resultados finales oficiales abajo:
                </p>
              </div>

              {candidates.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs font-bold uppercase">No se registraron candidatos para esta elección.</div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Total Votos Consolidados</p>
                      <p className="text-2xl font-black font-mono text-primary">{totalVotes}</p>
                    </div>
                    <ShieldCheck className="w-8 h-8 text-green-500" />
                  </div>

                  <div className="space-y-3.5">
                    {candidates.map((cand) => {
                      const votes = voteCountMap[cand.id] || 0;
                      const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                      return (
                        <div key={cand.id} className="bg-white p-4 rounded-2xl border border-gray-100/80 shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {cand.photo ? (
                                <img src={cand.photo} className="w-10 h-10 rounded-full object-cover border" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                  {cand.firstName[0]}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-bold text-gray-900 uppercase">{cand.firstName} {cand.lastName}</p>
                                <p className="text-[10px] text-gray-400">Candidato</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-gray-900 font-mono">{votes} votos</span>
                              <span className="text-xs text-gray-400 pl-2 font-mono">({pct.toFixed(1)}%)</span>
                            </div>
                          </div>
                          {/* Interactive Percent Bar */}
                          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-primary h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bitácora de Auditoría */}
              <div className="border-t border-gray-100 pt-6 mt-6">
                <h4 className="text-xs font-black uppercase text-gray-450 tracking-widest mb-1.5 font-bold">
                  Bitácora de Firma y Auditoría Electoral ({voterAuditList.length})
                </h4>
                <p className="text-[10px] text-gray-400 mb-4">
                  Listado público de electores autorizados que han ejercido su voto para garantizar que cada elector participe una única vez de forma auditable. Los votos en la urna digital permanecen 100% anónimos y desasociados de esta bitácora.
                </p>

                {voterAuditList.length === 0 ? (
                  <p className="text-center py-4 text-xs font-bold uppercase text-gray-400">Aún no hay firmas registradas en la bitácora.</p>
                ) : (
                  <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-50 max-h-52 overflow-y-auto">
                    {voterAuditList.map((audit: any, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50/30">
                        <div>
                          <p className="font-bold text-gray-900 uppercase">{audit.name}</p>
                          <p className="text-[10px] text-gray-450">Cédula: ***{audit.idNumber?.slice(-4) || audit.idNumber || ""} • Grupo: {audit.scoutGroup}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-mono text-gray-450 bg-gray-50 border border-gray-150/40 px-2 py-0.5 rounded-md">
                            {audit.votedAt ? new Date(audit.votedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        ) : verifiedVoter && !hasVoted ? (
          /* SCENARIO 4: CHOOSE CANDIDATE (Active voting booth)*/
          <div className="space-y-6 text-left animate-fade-in">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Delegado Validado</span>
                <h4 className="text-sm font-bold text-blue-900 uppercase leading-none mt-1">{verifiedVoter.firstName} {verifiedVoter.lastName}</h4>
                <p className="text-[10px] text-blue-600 font-mono mt-1">Cédula: V-{idNumber}</p>
              </div>
              <Award className="w-8 h-8 text-blue-500 animate-pulse" />
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase pl-1 tracking-widest mb-3">Cédula Electoral Oficial (Selecciona uno)</p>
              
              {candidates.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs uppercase font-medium">No se han cargado candidatos oficiales para esta elección. Contacte al Administrador.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {candidates.map((cand) => (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => setSelectedCandidateId(cand.id)}
                      className={`flex items-center space-x-4 p-4 rounded-3xl border text-left transition-all cursor-pointer ${selectedCandidateId === cand.id ? 'bg-primary/5 border-primary ring-2 ring-primary/20' : 'bg-white border-gray-100 hover:bg-gray-50/50'}`}
                    >
                      {cand.photo ? (
                        <img src={cand.photo} className="w-12 h-12 rounded-full object-cover border shadow" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase shadow">
                          {cand.firstName[0]}
                        </div>
                      )}
                      <div>
                        <h5 className="text-xs font-black uppercase text-gray-900">{cand.firstName}</h5>
                        <h5 className="text-xs font-black uppercase text-gray-900 leading-none">{cand.lastName}</h5>
                        <p className="text-[9px] text-gray-400 mt-1 uppercase italic font-bold">Candidato</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setVerifiedVoter(null);
                  setSelectedCandidateId("");
                }}
                className="flex-1 bg-gray-200 text-gray-600 font-bold py-3.5 rounded-2xl text-xs uppercase hover:bg-gray-300 text-center transition-all cursor-pointer"
              >
                Cancelar
              </button>
              
              <button
                type="button"
                disabled={!selectedCandidateId || isCastingVote}
                onClick={submitVote}
                className="flex-[2] bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-2xl text-xs uppercase tracking-widest text-center shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isCastingVote ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4" />
                    <span>Enviando Papeleta...</span>
                  </>
                ) : (
                  <>
                    <Vote className="w-4 h-4" />
                    <span>Someter Voto Secreto 🗳️</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD STATE: PROMPT FOR ID NUMBER + ALREADY VOTED MSG BELOW */
          <div className="space-y-6">
            <form onSubmit={verifyVoterEligibility} className="space-y-4 max-w-sm mx-auto text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Introduzca su Cédula de Identidad</label>
                <input 
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  required
                  value={idNumber}
                  onChange={e => {
                    setIdNumber(e.target.value.replace(/\D/g, ""));
                    if (hasVoted) {
                      setHasVoted(false);
                      setVerifiedVoter(null);
                    }
                    if (verificationError) {
                      setVerificationError("");
                    }
                  }}
                  placeholder="Ej. 12345678"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-150 text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white transition-all text-center tracking-widest"
                />
              </div>

              {verificationError && (
                <div className="bg-red-50 text-red-900 p-4 rounded-2xl border border-red-100 text-xs flex items-start space-x-2 animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <span>{verificationError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4" />
                    <span>Validando en el Registro...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verificar Credencial Electoral</span>
                  </>
                )}
              </button>
            </form>

            {hasVoted && (
              <div className="border-t border-gray-100 pt-6 mt-6 text-left w-full animate-fade-in">
                {!config?.showVotingResults ? (
                  <div className="py-6 space-y-4 text-center bg-amber-50/50 p-6 rounded-3xl border border-amber-100/50 mx-auto max-w-md">
                    <div className="mx-auto w-12 h-12 bg-amber-100/70 text-amber-700 rounded-full flex items-center justify-center border border-amber-200">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-805">¡Tu participación ha sido registrada!</h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                      El voto ha sido depositado de forma secreta en la urna electrónica. Los resultados y la bitácora de auditoría se encuentran resguardados temporalmente y se publicarán cuando el Staff de Operaciones lo autorice.
                    </p>
                    <div className="bg-amber-100/40 p-2.5 rounded-2xl text-amber-900 text-[11px] font-bold max-w-xs mx-auto">
                      🔒 Voto secreto encriptado y contabilizado.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="border-b border-gray-150 pb-4 text-center">
                      <span className="text-[10px] font-black uppercase text-amber-600 tracking-[0.2em] bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                        Papeleta Entregada - Resultados
                      </span>
                      <p className="text-xs text-gray-500 mt-2">
                        Ya has ejercido tu voto. A continuación se presentan los resultados consolidados de la urna electrónica:
                      </p>
                    </div>

                    {candidates.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-xs font-bold uppercase">No se registraron candidatos para esta elección.</div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Total Votos Consolidados</p>
                            <p className="text-2xl font-black font-mono text-primary">{totalVotes}</p>
                          </div>
                          <ShieldCheck className="w-8 h-8 text-green-500" />
                        </div>

                        <div className="space-y-3.5">
                          {candidates.map((cand) => {
                            const votes = voteCountMap[cand.id] || 0;
                            const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                            return (
                              <div key={cand.id} className="bg-white p-4 rounded-2xl border border-gray-100/80 shadow-sm space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    {cand.photo ? (
                                      <img src={cand.photo} className="w-10 h-10 rounded-full object-cover border" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                        {cand.firstName[0]}
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-sm font-bold text-gray-900 uppercase">{cand.firstName} {cand.lastName}</p>
                                      <p className="text-[10px] text-gray-400">Candidato</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm font-black text-gray-900 font-mono">{votes} votos</span>
                                    <span className="text-xs text-gray-400 pl-2 font-mono">({pct.toFixed(1)}%)</span>
                                  </div>
                                </div>
                                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-primary h-full rounded-full transition-all duration-700"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Bitácora de Auditoría */}
                    <div className="border-t border-gray-100 pt-6">
                      <h4 className="text-xs font-black uppercase text-gray-450 tracking-widest mb-1.5 font-bold">
                        Bitácora de Firma y Auditoría Electoral ({voterAuditList.length})
                      </h4>
                      <p className="text-[10px] text-gray-400 mb-4">
                        Listado público de electores autorizados que han ejercido su voto para garantizar que cada elector participe una única vez de forma auditable. Los votos en la urna digital permanecen 100% anónimos y desasociados de esta bitácora.
                      </p>

                      {voterAuditList.length === 0 ? (
                        <p className="text-center py-4 text-xs font-bold uppercase text-gray-400">Aún no hay firmas registradas en la bitácora.</p>
                      ) : (
                        <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-50 max-h-52 overflow-y-auto">
                          {voterAuditList.map((audit: any, idx) => (
                            <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50/30">
                              <div>
                                <p className="font-bold text-gray-900 uppercase">{audit.name}</p>
                                <p className="text-[10px] text-gray-450">Cédula: ***{audit.idNumber?.slice(-4) || audit.idNumber || ""} • Grupo: {audit.scoutGroup}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] font-mono text-gray-450 bg-gray-50 border border-gray-150/40 px-2 py-0.5 rounded-md">
                                  {audit.votedAt ? new Date(audit.votedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ""}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      <p className="text-[10px] text-gray-400 mt-6 mx-auto max-w-sm uppercase italic tracking-wider leading-relaxed">
        Todos los votos emitidos son encriptados en la urna electrónica en absoluto anonimato. La bitácora de firmas previene usurpaciones y doble voto de forma auditable.
      </p>
    </div>
  );
}
