export type ContractState = 'none' | 'active' | 'ending' | 'expired';

export interface Contract {
  id: number;
  startDate: string;
  endDate: string;
  signed: boolean;
  note: string | null;
}

export interface UserContracts {
  /** Newest first; the first one is the current term. */
  contracts: Contract[];
  current: { state: ContractState; daysLeft: number | null };
  nda: { signed: boolean; signedDate: string | null };
}

export interface ContractStatus {
  userId: number;
  endDate: string;
  signed: boolean;
  state: ContractState;
  daysLeft: number | null;
}

export interface SaveContractDto {
  startDate: string;
  endDate: string;
  signed?: boolean;
  note?: string;
}
