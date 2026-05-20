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
}

export type StaffRole = "admin" | "ops" | "superadmin" | "risk" | null;

export interface StaffMember {
  id: string;
  name: string;
  password: string;
  role: "admin" | "ops" | "superadmin" | "risk";
  createdAt: string;
}
