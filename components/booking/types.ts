export type BookingFormValues = {
  ownerName: string;
  phone: string;
  email: string;
  neighborhood: string;
  dogName: string;
  breedAge: string;
  serviceInterest: string;
  vaccinations: string;
  walkFrequency: string;
  notes: string;
};

export type BookingStepKey = 'you' | 'dog' | 'care' | 'quirks' | 'wrap';

export type BookingStepDef = {
  key: BookingStepKey;
  label: string;
  title: string;
};

export type BookingFieldErrors = Record<string, string | undefined>;

/**
 * Snapshot of what was actually submitted, held separately from the form
 * draft so resetting the draft after a successful submit (R15) never changes
 * what the success UI or the scheduling branch reports back to the visitor.
 */
export type BookingSubmittedSummary = {
  dogName: string;
  phoneConsult: boolean;
};

export type RegisterField = (name: string) => (el: HTMLElement | null) => void;
