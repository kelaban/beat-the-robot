import { describe, it, expect } from 'vitest'
import { buildDeck, applyJokerEffects, pickJokerOptions, ROUND_TARGETS, CURSED_DECK_MOD, CURSED_GAMEPLAY, WILDCARD_COUNT } from '../constants'

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

  describe('combo: all deck modifiers', () => {
    it('should correctly apply dyslexic + sevennine + wildcard together', () => {
      const deck = buildDeck()

      const transformed = applyJokerEffects(deck, [
        'dyslexic',
        'sevennine',
        'wildcard'
      ])

      // Deck has 52 + WILDCARD_COUNT = 54 cards
      expect(transformed.length).toBe(52 + WILDCARD_COUNT)

      // dyslexic: all 2s become 5s
      const twos = transformed.filter(c => c.rank === '2')
      expect(twos.length).toBe(0)
      const fives = transformed.filter(c => c.rank === '5')
      expect(fives.length).toBe(8) // 4 original + 4 converted

      // sevennine: all 9s become 7s
      const nines = transformed.filter(c => c.rank === '9')
      expect(nines.length).toBe(0)
      const sevens = transformed.filter(c => c.rank === '7')
      expect(sevens.length).toBe(8) // 4 original + 4 converted

      // wildcard: 2 cards should be wild
      const wildcards = transformed.filter(c => c.wild === true)
      expect(wildcards.length).toBe(WILDCARD_COUNT)

      // All normal suits + wildcard suit should be represented
      const suits = new Set(transformed.map(c => c.suit))
      expect(suits.size).toBe(4 + 1) // 4 normal suits + "★" from wildcards
    })

    it('should correctly apply smaller + bigger together', () => {
      const deck = buildDeck()

      const transformed = applyJokerEffects(deck, ['smaller', 'bigger'])

      // smaller: removes 6s (4), adds one of 2,3,4,5
      // bigger: removes 8s (4), adds one of 9,10,J,Q
      // So we should have:
      // - No 6s
      // - No 8s
      // - 2s: 5 (4 original + 1 from smaller)
      // - 3s: 5 (4 original + 1 from smaller)
      // - 4s: 5 (4 original + 1 from smaller)
      // - 5s: 5 (4 original + 1 from smaller)
      // - 9s: 5 (4 original + 1 from bigger)
      // - 10s: 5 (4 original + 1 from bigger)
      // - Js: 5 (4 original + 1 from bigger)
      // - Qs: 5 (4 original + 1 from bigger)

      const sixes = transformed.filter(c => c.rank === '6')
      const eights = transformed.filter(c => c.rank === '8')
      expect(sixes.length).toBe(0)
      expect(eights.length).toBe(0)

      expect(transformed.filter(c => c.rank === '2').length).toBe(5)
      expect(transformed.filter(c => c.rank === '3').length).toBe(5)
      expect(transformed.filter(c => c.rank === '4').length).toBe(5)
      expect(transformed.filter(c => c.rank === '5').length).toBe(5)
      expect(transformed.filter(c => c.rank === '9').length).toBe(5)
      expect(transformed.filter(c => c.rank === '10').length).toBe(5)
      expect(transformed.filter(c => c.rank === 'J').length).toBe(5)
      expect(transformed.filter(c => c.rank === 'Q').length).toBe(5)

      // Deck size should still be 52
      expect(transformed.length).toBe(52)
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

  describe('wildcard joker', () => {
    it('should add exactly 2 wildcards to the deck', () => {
      const deck = buildDeck()

      const transformed = applyJokerEffects(deck, ['wildcard'])

      const wildcards = transformed.filter(c => c.wild === true)
      expect(wildcards.length).toBe(WILDCARD_COUNT)
    })

    it('should add WILDCARD_COUNT cards to deck', () => {
      const deck = buildDeck()

      const transformed = applyJokerEffects(deck, ['wildcard'])

      expect(transformed.length).toBe(52 + WILDCARD_COUNT)
    })
  })

  describe('round targets', () => {
    it('should have 12 round targets', () => {
      expect(ROUND_TARGETS.length).toBe(12)
    })

    it('should have flattened late-game progression', () => {
      expect(ROUND_TARGETS[9]).toBe(6000)
      expect(ROUND_TARGETS[10]).toBe(8500)
      expect(ROUND_TARGETS[11]).toBe(12000)
    })

    it('should start at 50 and increase monotonically', () => {
      expect(ROUND_TARGETS[0]).toBe(50)
      for (let i = 1; i < ROUND_TARGETS.length; i++) {
        expect(ROUND_TARGETS[i]).toBeGreaterThan(ROUND_TARGETS[i - 1])
      }
    })
  })

  describe('pickJokerOptions', () => {
    const owned: ReturnType<typeof pickJokerOptions> = []

    describe('uncommon joker offering', () => {
      it('should NOT offer uncommon on round 1 (first round is common-only)', () => {
        const options = pickJokerOptions(owned, 1)
        const hasUncommon = options.some(j => j.rarity === 'uncommon')
        expect(hasUncommon).toBe(false)
      })

      it('should NOT offer uncommon on round 3', () => {
        const options = pickJokerOptions(owned, 3)
        const hasUncommon = options.some(j => j.rarity === 'uncommon')
        expect(hasUncommon).toBe(false)
      })

      it('should offer uncommon on round 4', () => {
        const options = pickJokerOptions(owned, 4)
        const hasUncommon = options.some(j => j.rarity === 'uncommon')
        expect(hasUncommon).toBe(true)
      })

      it('should NOT offer uncommon on round 6', () => {
        const options = pickJokerOptions(owned, 6)
        const hasUncommon = options.some(j => j.rarity === 'uncommon')
        expect(hasUncommon).toBe(false)
      })

      it('should offer uncommon on round 7', () => {
        const options = pickJokerOptions(owned, 7)
        const hasUncommon = options.some(j => j.rarity === 'uncommon')
        expect(hasUncommon).toBe(true)
      })

      it('should NOT offer uncommon on round 9', () => {
        const options = pickJokerOptions(owned, 9)
        const hasUncommon = options.some(j => j.rarity === 'uncommon')
        expect(hasUncommon).toBe(false)
      })
    })

    describe('cursed joker rotation', () => {
      it('should offer deck-modifying curses on round 2', () => {
        const options = pickJokerOptions(owned, 2)
        const deckModIds = CURSED_DECK_MOD.map(j => j.id)
        options.forEach(opt => {
          expect(deckModIds).toContain(opt.id)
        })
      })

      it('should offer gameplay-affecting curses on round 5', () => {
        const options = pickJokerOptions(owned, 5)
        const gameplayIds = CURSED_GAMEPLAY.map(j => j.id)
        options.forEach(opt => {
          expect(gameplayIds).toContain(opt.id)
        })
      })

      it('should offer deck-modifying curses on round 8', () => {
        const options = pickJokerOptions(owned, 8)
        const deckModIds = CURSED_DECK_MOD.map(j => j.id)
        options.forEach(opt => {
          expect(deckModIds).toContain(opt.id)
        })
      })

      it('should offer gameplay-affecting curses on round 11', () => {
        const options = pickJokerOptions(owned, 11)
        const gameplayIds = CURSED_GAMEPLAY.map(j => j.id)
        options.forEach(opt => {
          expect(gameplayIds).toContain(opt.id)
        })
      })
    })

    describe('joker pool', () => {
      it('should return 3 options on non-cursed rounds', () => {
        const options = pickJokerOptions(owned, 1)
        expect(options.length).toBe(3)
      })

      it('should return 2 options on cursed rounds', () => {
        const options = pickJokerOptions(owned, 2)
        expect(options.length).toBe(2)
      })

      it('should not offer jokers already owned', () => {
        const ownedWithWildcard = [{ id: 'wildcard', name: 'WILDCARD', desc: '...', color: '#fff', rarity: 'uncommon' }] as ReturnType<typeof pickJokerOptions>
        const options = pickJokerOptions(ownedWithWildcard, 1)
        const hasWildcard = options.some(j => j.id === 'wildcard')
        expect(hasWildcard).toBe(false)
      })
    })
  })
})