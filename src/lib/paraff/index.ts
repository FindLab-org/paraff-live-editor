// Re-export from @findlab-org/paraff/browser
export * from '@findlab-org/paraff/browser';

// Re-export paraffToMEI from meiEncoder for convenience
import { meiEncoder } from '@findlab-org/paraff/browser';
export const paraffToMEI = meiEncoder.paraffToMEI;
export const parseParaff = meiEncoder.parseParaff;
export const parseParaffScore = meiEncoder.parseParaffScore;
export const toMEI = meiEncoder.toMEI;
export const scoreToMEI = meiEncoder.scoreToMEI;
