/**
 * Type tests for reservation-related interfaces.
 * These tests verify TypeScript compilation correctness.
 */
import { describe, expect, it } from 'vitest';
import type { GhostSlot, ReservationState } from '../index';

describe('Reservation Types', () => {
  it('test_ghost_slot_type_available', () => {
    const slot: GhostSlot = {
      slotId: 'ghost-1',
      status: 'available',
    };

    expect(slot.status).toBe('available');
    expect(slot.expiresAt).toBeUndefined();
  });

  it('test_ghost_slot_type_reserved', () => {
    const slot: GhostSlot = {
      slotId: 'ghost-2',
      status: 'reserved',
      expiresAt: 1738900000,
    };

    expect(slot.status).toBe('reserved');
    expect(slot.expiresAt).toBe(1738900000);
  });

  it('test_reservation_state_type', () => {
    const state: ReservationState = {
      slots: {
        'ghost-1': { status: 'available' },
        'ghost-2': { status: 'reserved', expiresAt: 1738900000 },
        'ghost-3': { status: 'available' },
      },
      totalGhostSlots: 3,
      userSlot: null,
    };

    expect(state.totalGhostSlots).toBe(3);
    expect(state.userSlot).toBeNull();
    expect(Object.keys(state.slots)).toHaveLength(3);
  });
});
