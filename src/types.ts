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
  opsStatus: Status;
  opsObservations?: string;
  checkedIn: boolean;
  checkInTime?: string;
  createdAt: string;
}

export interface Config {
  bankDetails: string;
  cashDetails: string;
  eventDate: string;
  eventLocation: string;
  totalCostUSD: number;
  registrationDeadline: string;
}

export type StaffRole = "admin" | "ops" | "superadmin" | null;
