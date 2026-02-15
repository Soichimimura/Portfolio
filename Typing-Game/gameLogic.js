import { BonusType } from "./bonusType.js";
import { RandomJS } from "./random.js";

export class GameLogic {
  constructor() {
    this.random = new RandomJS();
    this.reset();
  }

  reset() {
    this.score = 0;
    this.streak = 0;
    this.bonusPending = false;
    this.bonusType = null;
    this.scoreBonusLevel = 0;
    this.scoreBonusChainActive = false;
  }

  getScore() { return this.score; }
  getStreak() { return this.streak; }
  isBonusPending() { return this.bonusPending; }
  getBonusType() { return this.bonusType; }
  getScoreBonusLevel() { return this.scoreBonusLevel; }

  registerCorrect() { this.score++; this.streak++; }

  registerIncorrect() {
    if (this.score > 0) this.score--;
    if (this.score < 0) this.score = 0;
    this.streak = 0;
    this.cancelBonus();
  }

  maybeCreateBonus() {
    if (this.bonusPending) return null;
    if (this.scoreBonusChainActive) return null;

    if (this.streak >= 3 && this.streak % 3 === 0) {
      const r = this.random.nextInt(3);

      if (r === 0) {
        this.scoreBonusChainActive = true;
        this.scoreBonusLevel = 1;
        this.bonusType = BonusType.SCORE;
      } else if (r === 1) {
        this.bonusType = BonusType.TIME;
      } else {
        this.bonusType = BonusType.SIMPLE_WORDS;
      }

      this.bonusPending = true;
      return this.bonusType;
    }
    return null;
  }

  applyScoreBonus() {
    if (!this.bonusPending || this.bonusType !== BonusType.SCORE) return 0;

    let extra;
    if (this.scoreBonusLevel === 1) extra = 2;
    else if (this.scoreBonusLevel === 2) extra = 4;
    else extra = 6;

    this.score += extra;
    this.bonusPending = false;

    if (this.scoreBonusLevel >= 3) {
      this.scoreBonusChainActive = false;
      this.bonusType = null;
      this.scoreBonusLevel = 0;
    } else {
      this.scoreBonusLevel++;
      this.bonusType = BonusType.SCORE;
      this.bonusPending = true;
    }
    return extra;
  }

  cancelBonus() {
    this.bonusPending = false;
    this.bonusType = null;
    this.scoreBonusLevel = 0;
    this.scoreBonusChainActive = false;
  }

  setRandom(random) { this.random = random; }

  forceScoreBonusLevel(level) {
    this.scoreBonusChainActive = true;
    this.bonusPending = true;
    this.bonusType = BonusType.SCORE;
    this.scoreBonusLevel = level;
  }
}
