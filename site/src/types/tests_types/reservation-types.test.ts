/**
 * Type tests for reservation-related interfaces.
 * These tests verify TypeScript compilation correctness.
 */
import { describe, expect, it } from 'vitest';
import type { GhostSlot, ReservationState, SearchIndexEntry } from '../index';

describe('Reservation Types', () => {
  it('test_ghost_slot_type_available', () => {
    const slot: GhostSlot = {
      slotId: '1.10.001',
      status: 'available',
    };

    expect(slot.status).toBe('available');
    expect(slot.expiresAt).toBeUndefined();
  });

  it('test_ghost_slot_type_reserved', () => {
    const slot: GhostSlot = {
      slotId: '2.10.001',
      status: 'reserved',
      expiresAt: 1738900000,
    };

    expect(slot.status).toBe('reserved');
    expect(slot.expiresAt).toBe(1738900000);
  });

  it('test_reservation_state_type', () => {
    const state: ReservationState = {
      slots: {
        '1.3.001': { status: 'available' },
        '2.3.001': { status: 'reserved', expiresAt: 1738900000 },
        '3.3.001': { status: 'available' },
      },
      totalGhostSlots: 3,
      cohort: 1,
      userSlot: null,
    };

    expect(state.totalGhostSlots).toBe(3);
    expect(state.cohort).toBe(1);
    expect(state.userSlot).toBeNull();
    expect(Object.keys(state.slots)).toHaveLength(3);
  });

  it('test_ghost_slot_submitted_status', () => {
    const slot: GhostSlot = {
      slotId: '5.11.001',
      status: 'submitted',
      skillsetId: '@user/Skill',
    };

    expect(slot.status).toBe('submitted');
    expect(slot.skillsetId).toBe('@user/Skill');
    expect(slot.expiresAt).toBeUndefined();
  });

  it('test_reservation_state_cohort', () => {
    const state: ReservationState = {
      slots: {
        '1.10.001': { status: 'available' },
        '2.10.001': { status: 'reserved', expiresAt: 1738900000 },
        '3.10.001': { status: 'submitted', skillsetId: '@user/Skill' },
      },
      totalGhostSlots: 10,
      cohort: 1,
      userSlot: '2.10.001',
    };

    expect(state.cohort).toBe(1);
    expect(state.slots['3.10.001'].status).toBe('submitted');
    expect(state.slots['3.10.001'].skillsetId).toBe('@user/Skill');
  });

  it('test_search_index_entry_batch_id', () => {
    const entry: SearchIndexEntry = {
      id: '@user/Skill',
      name: 'Skill',
      description: 'Test skillset',
      tags: ['test'],
      author: {
        handle: '@user',
      },
      stars: 0,
      version: '1.0.0',
      status: 'active',
      verification: {
        production_links: [],
        audit_report: 'AUDIT_REPORT.md',
      },
      compatibility: {
        claude_code_version: '>=1.0.0',
        languages: ['any'],
      },
      entry_point: './content/CLAUDE.md',
      checksum: 'abc123',
      files: {},
      batch_id: '5.11.001',
    };

    expect(entry.batch_id).toBe('5.11.001');
  });
});
