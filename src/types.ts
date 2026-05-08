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

export interface Registration {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  email: string;
  membershipType: MembershipType;
  scoutGroup: string;
  bankReference: string;
  receiptNumber?: string;
  paymentMethod: PaymentMethod;
  exchangeRate?: number;
  amount: number;
  paymentDate: string;
  proofUrl?: string;
  proofName?: string;
  adminStatus: Status;
  opsStatus: Status;
  adminObservations?: string;
  opsObservations?: string;
  checkedIn: boolean;
  checkInTime?: string;
  createdAt: string;
}

export interface Config {
  bankDetails: string;
  eventDate: string;
  eventLocation: string;
}

export type StaffRole = "admin" | "ops" | "superadmin" | null;
