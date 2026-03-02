import { create } from 'zustand'
import { getClaims, saveClaims, addClaim, addClaims, updateClaim, initializeStorage, resetToSeedFile } from '../lib/seedData'

// Seed localStorage on first load
initializeStorage()

export const useClaimsStore = create((set) => ({
  claims:       getClaims(),
  isResetting:  false,

  refreshClaims: () => set({ claims: getClaims() }),

  addSubmittedClaim: (claim) => { addClaim(claim); set({ claims: getClaims() }) },

  addSubmittedClaims: (newClaims) => { addClaims(newClaims); set({ claims: getClaims() }) },

  updateClaim: (id, updates) => { updateClaim(id, updates); set({ claims: getClaims() }) },

  setClaims: (claims) => { saveClaims(claims); set({ claims }) },

  resetDemo: () => {
    set({ isResetting: true })
    try {
      const claims = resetToSeedFile()
      set({ claims, isResetting: false })
    } catch (err) {
      console.error('Reset failed:', err)
      set({ isResetting: false })
    }
  },
}))
