export interface Newcomer {
  id: number;
  name: string | null;
  picture: string | null;
  jobTitle: string | null;
  /** Civil date of the first day. */
  hireDate: string | null;
  /** Still on trial today. */
  probation: boolean;
  /** The caller has already said welcome. */
  greeted: boolean;
}

export interface WelcomeGreeter {
  id: number;
  name: string | null;
  picture: string | null;
  jobTitle: string | null;
}

/** The caller's own card, while they are the newcomer. */
export interface MyWelcome {
  userId: number;
  firstName: string | null;
  hireDate: string | null;
  probationEndDate: string | null;
  greeters: WelcomeGreeter[];
}

export interface WelcomeData {
  newcomers: Newcomer[];
  mine: MyWelcome | null;
}
