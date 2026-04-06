// Cost estimation for Not The Rug brief pipeline runs.
// Calculates per-stage AI token costs and Firebase operation costs.

export interface StageCost {
  stage: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
}

export interface BriefRunCost {
  totalEstimatedUsd: number;
  aiEstimatedUsd: number;
  firebaseEstimatedUsd: number;
  stageCosts: StageCost[];
  tokenEstimates: {
    totalInputTokens: number;
    totalOutputTokens: number;
  };
  firebaseUsage: {
    firestoreWrites: number;
    firestoreReads: number;
    storageUploads: number;
    storageBytes: number;
  };
  currency: 'USD';
  notes: string[];
}

const AI_PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00  },
  'claude-sonnet-4-6':         { input: 3.00,  output: 15.00 },
  'claude-sonnet-4-20250514':  { input: 3.00,  output: 15.00 },
};

// Firebase cost constants (per unit, approximate)
// Firestore: $0.18/100K writes, $0.06/100K reads
// Storage:   $0.026/GB/month (amortized — essentially zero per run)
const FIREBASE_PRICING = {
  firestoreWritePerDoc: 0.0000018,
  firestoreReadPerDoc:  0.0000006,
  storagePerGb:         0.026,
};

export function computeStageCost(
  stage: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): StageCost {
  const p = AI_PRICING[model] ?? AI_PRICING['claude-sonnet-4-6'];
  const estimatedUsd = (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
  return { stage, model, inputTokens, outputTokens, estimatedUsd };
}

export function assembleRunCost(
  stageCosts: StageCost[],
  firebaseUsage: BriefRunCost['firebaseUsage'],
  notes: string[] = [],
): BriefRunCost {
  const aiEstimatedUsd = stageCosts.reduce((sum, s) => sum + s.estimatedUsd, 0);
  const firebaseEstimatedUsd =
    firebaseUsage.firestoreWrites * FIREBASE_PRICING.firestoreWritePerDoc +
    firebaseUsage.firestoreReads  * FIREBASE_PRICING.firestoreReadPerDoc  +
    (firebaseUsage.storageBytes / 1_073_741_824) * FIREBASE_PRICING.storagePerGb;

  return {
    totalEstimatedUsd:   aiEstimatedUsd + firebaseEstimatedUsd,
    aiEstimatedUsd,
    firebaseEstimatedUsd,
    stageCosts,
    tokenEstimates: {
      totalInputTokens:  stageCosts.reduce((sum, s) => sum + s.inputTokens,  0),
      totalOutputTokens: stageCosts.reduce((sum, s) => sum + s.outputTokens, 0),
    },
    firebaseUsage,
    currency: 'USD',
    notes,
  };
}
