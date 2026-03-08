export interface AdminSpecial {
  id: number;
  name: string;
  description?: string;
  bonusSessions: number;
  bonusDuration: number;
  applicablePackageIds: number[];
  assignedClientIds: number[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdBy?: number;
  creator?: { firstName: string; lastName: string };
}

export interface Package {
  id: number;
  name: string;
}

export interface ClientOption {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AdminSpecialFormData {
  name: string;
  description: string;
  bonusSessions: number;
  bonusDuration: number;
  applicablePackageIds: number[];
  assignedClientIds: number[];
  startDate: string;
  endDate: string;
}
