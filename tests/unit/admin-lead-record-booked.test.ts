import { describe, it, expect } from 'vitest';
import { leadQualityLabel, type AdminLeadRecord } from '@/components/admin/leads/adminLeadRecord';

describe('leadQualityLabel booked hint', () => {
  it("reads a converted meetgreet lead's own bookedSelfReported", () => {
    const booked = { type: 'meetgreet', ownerName: 'A', bookedSelfReported: true } as Partial<AdminLeadRecord>;
    const notBooked = { type: 'meetgreet', ownerName: 'A' } as Partial<AdminLeadRecord>;
    expect(leadQualityLabel(booked)).toMatch(/^Booked/);
    expect(leadQualityLabel(notBooked)).not.toMatch(/^Booked/);
  });

  it('still falls back to the capture row itself when it is unconverted', () => {
    const capture = { type: 'capture', status: 'partial', bookedSelfReported: true } as Partial<AdminLeadRecord>;
    expect(leadQualityLabel(capture)).toMatch(/^Booked/);
  });
});
