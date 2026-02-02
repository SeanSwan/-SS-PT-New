export interface AdminSpecial {
  id: number;
  name: string;
  description?: string;
  bonusSessions: number;
  bonusDuration: number;
  applicablePackageIds: number[];
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

export interface AdminSpecialFormData {
  name: string;
  description: string;
  bonusSessions: number;
  bonusDuration: number;
  applicablePackageIds: number[];
  startDate: string;
  endDate: string;
}
