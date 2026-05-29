export enum MembershipType {
  JOVEN = "Joven",
  ADULTO = "Adulto",
}

export enum Status {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum PaymentMethod {
  TRANSFER = "Transferencia/Pago Movil",
  CASH = "Efectivo",
}

export interface MedicalData {
  bloodType: string;
  weight?: string;
  height?: string;
  allergies: string;
  intolerances?: string;
  disability?: {
    has: boolean;
    description: string;
  };
  antecedents: string;
  medications: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export interface EventPhase {
  id: string;
  name: string;
  location: string;
  locationUrl?: string;
  date: string;
  time: string;
  minAmount: number;
  color: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
}

export interface Payment {
  id: string;
  idNumber: string;
  paymentMethod: PaymentMethod;
  bankReference?: string;
  receiptNumber?: string;
  exchangeRate?: number;
  amount: number; // In Bs if transfer, in $ if cash
  amountUSD: number; // Calculated value
  paymentDate: string;
  proofUrl?: string;
  proofName?: string;
  status: Status;
  adminObservations?: string;
  approvedBy?: string;
  createdAt: string;
}

export interface Registration {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  email: string;
  membershipType: MembershipType;
  scoutGroup: string;
  tshirtSize?: string;
  medicalData?: MedicalData;
  opsStatus: Status;
  opsObservations?: string;
  validatedBy?: string;
  checkedIn: boolean;
  checkedInBy?: string;
  checkInTime?: string;
  phaseAttendance?: { [phaseId: string]: { attended: boolean; time: string; by: string } };
  votingRole?: "Delegado" | "Observador" | "";
  createdAt: string;
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  photo: string; // Base64 encoding of image
  createdAt: string;
}

export interface Config {
  bankDetails: string;
  cashDetails: string;
  eventDate: string;
  eventLocation: string;
  totalCostUSD: number;
  registrationDeadline: string;
  scoutUnit: string;
  eventName: string;
  eventDescription: string;
  headerTagline: string;
  locationUrl?: string;
  photoAlbumUrl?: string;
  phases?: EventPhase[];
  votingActive?: boolean;
  votingTitle?: string;
  votingQuestion?: string;
  votingDeadline?: string;
  votingTargetUnit?: "Joven" | "Adulto" | "Ambos";
  showVotingResults?: boolean;
  attachmentsActive?: boolean;
  attachmentsTitle?: string;
  attachmentsDescription?: string;
  questionnaireActive?: boolean;
  questionnaireTitle?: string;
  questionnaireInstructions?: string;
}

export type StaffRole = "admin" | "ops" | "superadmin" | "risk" | "comunicaciones" | "scanner" | null;

export interface StaffMember {
  id: string;
  name: string;
  password: string;
  role: "admin" | "ops" | "superadmin" | "risk" | "comunicaciones" | "scanner";
  createdAt: string;
}

export interface NewsArticle {
  id?: string;
  title: string;
  description: string;
  imageUrl?: string; // Optional image URL or base64
  createdAt: string;
  authorName?: string;
}

export interface GroupAttachment {
  id?: string;
  scoutGroup: string;
  fileName: string;
  fileType: string;
  fileData: string; // Base64
  createdAt: string;
}

export interface QuestionnaireResponse {
  id?: string;
  scoutGroup: string;
  ratingSchedule: number;      // q1: cumplimiento del cronograma y los horarios del evento
  ratingFood: number;          // q2: calidad y cantidad de la alimentación
  ratingCocoro: number;        // q3: proceso de inscripción y registro a través de COCORO
  ratingLocation: number;      // q4: instalaciones o espacios elegidos adecuados
  ratingCommunication: number; // q5: comunicación previa y durante el evento clara y a tiempo
  ratingChallenge: number;     // q6: actividades desafiaron capacidades y conocimientos
  ratingTeamwork: number;      // q7: actividades fomentaron trabajo en equipo e integración
  ratingMystique: number;      // q8: Mística del evento cumplió expectativas
  ratingPrice: number;         // q9: cuota de participación se justificó plenamente
  ratingDiscussions: number;   // q10: oportunidad de debatir, dar su punto de vista y ser escuchado
  whatLiked: string;
  whatImprove: string;
  createdAt: string;
}

