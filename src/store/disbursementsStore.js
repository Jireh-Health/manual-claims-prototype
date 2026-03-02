import { create } from 'zustand'
import { getDisbursements, addDisbursement, initializeDisbursements } from '../lib/disbursementsData'

initializeDisbursements()

export const useDisbursementsStore = create((set) => ({
  disbursements: getDisbursements(),

  refreshDisbursements: () => set({ disbursements: getDisbursements() }),

  addDisbursementRecord: (record) => {
    addDisbursement(record)
    set({ disbursements: getDisbursements() })
  },
}))
