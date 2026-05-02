import { describe, it, expect } from 'vitest'
import { buildDeck, applyJokerEffects } from '../constants'

describe('Joker deck transformations', () => {
  describe('dyslexic joker (2s become 5s)', () => {
    it('should transform all 2s to 5s in a fresh deck', () => {
      const deck = buildDeck()
      
      const transformed = applyJokerEffects(deck, ['dyslexic'])
      
      const twos = transformed.filter(c => c.rank === '2')
      const fives = transformed.filter(c => c.rank === '5')
      
      expect(twos.length).toBe(0)
      expect(fives.length).toBe(8) // 4 original 5s + 4 transformed 2s = 8 fives
    })

    it('should keep original 5s unchanged', () => {
      const deck = buildDeck()
      
      const transformed = applyJokerEffects(deck, ['dyslexic'])
      
      const originalFives = deck.filter(c => c.rank === '5')
      const transformedFives = transformed.filter(c => c.rank === '5')
      
      expect(transformedFives.length).toBe(originalFives.length + 4)
    })

    it('should not affect other ranks', () => {
      const deck = buildDeck()
      
      const transformed = applyJokerEffects(deck, ['dyslexic'])
      
      const otherRanks = ['A', '3', '4', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
      for (const rank of otherRanks) {
        const originalCount = deck.filter(c => c.rank === rank).length
        const transformedCount = transformed.filter(c => c.rank === rank).length
        expect(transformedCount).toBe(originalCount)
      }
    })
  })

  describe('sevennine joker (9s become 7s)', () => {
    it('should transform all 9s to 7s in a fresh deck', () => {
      const deck = buildDeck()
      
      const transformed = applyJokerEffects(deck, ['sevennine'])
      
      const nines = transformed.filter(c => c.rank === '9')
      const sevens = transformed.filter(c => c.rank === '7')
      
      expect(nines.length).toBe(0)
      expect(sevens.length).toBe(8) // 4 original 7s + 4 transformed 9s = 8 sevens
    })

    it('should keep original 7s unchanged', () => {
      const deck = buildDeck()
      
      const transformed = applyJokerEffects(deck, ['sevennine'])
      
      const originalSevens = deck.filter(c => c.rank === '7')
      const transformedSevens = transformed.filter(c => c.rank === '7')
      
      expect(transformedSevens.length).toBe(originalSevens.length + 4)
    })
  })

  describe('combo: smaller + dyslexic', () => {
    it('should transform all 2s (including added ones) to 5s', () => {
      const deck = buildDeck()
      
      const transformed = applyJokerEffects(deck, ['smaller', 'dyslexic'])
      
      // smaller removes 6s and adds one 5,4,3,2
      // dyslexic turns all 2s into 5s
      // So we should have: original 5s (4) + dyslexic-converted 2s (4) + smaller-added 5 (1) + smaller-added 4,3 that become 5s (2) = 10 fives
      const fives = transformed.filter(c => c.rank === '5')
      expect(fives.length).toBe(10)
      
      // No 2s should remain
      const twos = transformed.filter(c => c.rank === '2')
      expect(twos.length).toBe(0)
    })
  })

  describe('combo: dyslexic + sevennine', () => {
    it('should apply both transformations correctly', () => {
      const deck = buildDeck()
      
      const transformed = applyJokerEffects(deck, ['dyslexic', 'sevennine'])
      
      // 2s become 5s, 9s become 7s
      const twos = transformed.filter(c => c.rank === '2')
      const nines = transformed.filter(c => c.rank === '9')
      
      expect(twos.length).toBe(0)
      expect(nines.length).toBe(0)
    })
  })

  describe('no jokers', () => {
    it('should return original deck unchanged', () => {
      const deck = buildDeck()
      
      const transformed = applyJokerEffects(deck, [])
      
      expect(transformed.length).toBe(52)
      
      const rankCounts: Record<string, number> = {}
      for (const card of deck) {
        rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1
      }
      
      for (const rank of Object.keys(rankCounts)) {
        const transformedCount = transformed.filter(c => c.rank === rank).length
        expect(transformedCount).toBe(rankCounts[rank])
      }
    })
  })
})