import { BonusType } from "./bonusType.js";
import { RandomJS } from "./random.js";
import { GameLogic } from "./gameLogic.js";
import { PlayerManager } from "./playerManager.js";

export class TypingGameApp {
  static mount({ dictionaryUrl = "words.txt" } = {}) {
    const app = new TypingGameApp(dictionaryUrl);
    app.init();
    return app;
  }

  constructor(dictionaryUrl) {
    this.DICTIONARY_FILE = dictionaryUrl;

    this.playerManager = PlayerManager.load();
    this.currentPlayer = null;
    this.logic = new GameLogic();

    this.gameRunning = false;
    this.simpleWordsMode = false;

    this.timeRemaining = 30;
    this.currentWord = "";

    this.words = [];
    this.threeLetterWords = [];

    this.wordRandom = new RandomJS();

    this.gameIntervalId = null;
    this.bonusTimeoutId = null;
    this.simpleWordsTimeoutId = null;

    this.$ = (id) => document.getElementById(id);

    this.loginPanel = this.$("tg-login");
    this.gamePanel = this.$("tg-game");

    this.loginUserField = this.$("tg-login-user");
    this.loginPasswordField = this.$("tg-login-pass");
    this.loginButton = this.$("tg-login-btn");
    this.loginStatusLabel = this.$("tg-login-status");

    this.playerLabel = this.$("tg-player");
    this.scoreLabel = this.$("tg-score");
    this.bestScoreLabel = this.$("tg-best");
    this.timerLabel = this.$("tg-timer");
    this.wordLabel = this.$("tg-word");
    this.bonusLabel = this.$("tg-bonus");
    this.inputField = this.$("tg-input");
    this.startButton = this.$("tg-start");

    this.timeCombo = this.$("tg-time");

    this.resetBtn = this.$("tg-reset");
    this.logoutBtn = this.$("tg-logout");
    this.aboutBtn = this.$("tg-about");
    this.exitBtn = this.$("tg-exit");
  }

  async init() {
    await this.initWordLists();
    this.bindUI();
    this.showLogin();
  }

  async initWordLists() {
    this.words = [];
    this.threeLetterWords = [];

    try {
      const res = await fetch(this.DICTIONARY_FILE, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const text = await res.text();
      const lines = text.split(/\r?\n/);

      for (const line of lines) {
        const w = line.trim().toLowerCase();
        if (!w) continue;
        this.words.push(w);
        if (w.length === 3) this.threeLetterWords.push(w);
      }
    } catch {
      alert("Failed to load words.txt.");
    }

    if (this.words.length === 0) alert("No words found in words.txt.");
    if (this.threeLetterWords.length === 0) alert("No 3-letter words found in words.txt.");
  }

  bindUI() {
    this.loginButton.addEventListener("click", () => this.handleLogin());

    this.loginPasswordField.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.handleLogin();
    });

    this.startButton.addEventListener("click", () => this.startGame());

    this.inputField.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      if (!this.gameRunning) this.startGame();
      else this.handleInput();
    });

    this.timeCombo.addEventListener("change", () => {
      if (!this.gameRunning) {
        const selectedTime = (this.timeCombo.selectedIndex === 0) ? 30 : 60;
        this.timerLabel.textContent = `Time: ${selectedTime}`;
      }
    });

    if (this.resetBtn) this.resetBtn.addEventListener("click", () => this.startGame());
    if (this.logoutBtn) this.logoutBtn.addEventListener("click", () => this.logout());
    if (this.exitBtn) this.exitBtn.addEventListener("click", () => this.exitGame());
    if (this.aboutBtn) this.aboutBtn.addEventListener("click", () => this.showAbout());
  }

  showLogin() {
    this.loginPanel.style.display = "";
    this.gamePanel.style.display = "none";
  }

  showGame() {
    this.loginPanel.style.display = "none";
    this.gamePanel.style.display = "";
  }

  handleLogin() {
    const username = (this.loginUserField.value || "").trim();
    const password = (this.loginPasswordField.value || "");

    if (username === "" || password === "") {
      this.loginStatusLabel.textContent = "Enter username and password";
      return;
    }

    let p = this.playerManager.findPlayer(username);
    if (p === null) {
      p = this.playerManager.register(username, password);
      this.loginStatusLabel.textContent = "Registered and logged in";
    } else {
      if (p.getPassword() !== password) {
        this.loginStatusLabel.textContent = "Wrong password";
        return;
      } else {
        this.loginStatusLabel.textContent = "Logged in";
      }
    }

    this.currentPlayer = p;
    this.playerLabel.textContent = `Player: ${this.currentPlayer.getUsername()}`;
    this.bestScoreLabel.textContent = `Best: ${this.currentPlayer.getBestScore()}`;
    this.scoreLabel.textContent = "Score: 0";

    const selectedTime = (this.timeCombo.selectedIndex === 0) ? 30 : 60;
    this.timerLabel.textContent = `Time: ${selectedTime}`;

    this.bonusLabel.textContent = "";
    this.wordLabel.textContent = "Press Start";
    this.inputField.value = "";
    this.inputField.disabled = true;

    if (this.logoutBtn) this.logoutBtn.disabled = false;

    this.showGame();
  }

  logout() {
    this.stopGameInterval();
    this.stopBonusTimeout();
    this.stopSimpleWordsTimeout();

    this.logic.reset();
    this.gameRunning = false;
    this.currentPlayer = null;

    this.inputField.disabled = true;
    this.inputField.value = "";
    this.wordLabel.textContent = "Press Start";
    this.scoreLabel.textContent = "Score: 0";
    this.bestScoreLabel.textContent = "Best: 0";
    this.timerLabel.textContent = "Time: 30";
    this.bonusLabel.textContent = "";

    this.loginUserField.value = "";
    this.loginPasswordField.value = "";
    this.loginStatusLabel.textContent = "Logged out";

    if (this.timeCombo) this.timeCombo.selectedIndex = 0;
    if (this.logoutBtn) this.logoutBtn.disabled = true;

    this.showLogin();
  }

  nextWord() {
    const source = this.simpleWordsMode ? this.threeLetterWords : this.words;
    if (!source || source.length === 0) return "";
    return source[this.wordRandom.nextInt(source.length)];
  }

  handleInput() {
    if (!this.gameRunning) return;

    const typed = (this.inputField.value || "").trim().toLowerCase();
    if (typed === "") return;

    const target = (this.currentWord || "").toLowerCase();
    const wasBonusPending = this.logic.isBonusPending();
    const currentBonusType = this.logic.getBonusType();

    if (typed === target) {
      if (wasBonusPending && currentBonusType !== null) {
        if (currentBonusType === BonusType.SCORE) {
          const extra = this.logic.applyScoreBonus();
          this.bonusLabel.textContent = `Score bonus +${extra}`;
          this.stopBonusTimeout();
        } else if (currentBonusType === BonusType.TIME) {
          this.timeRemaining += 7;        // Javaと同じ
          this.timerLabel.textContent = `Time: ${this.timeRemaining}`;
          this.bonusLabel.textContent = "Time bonus +5s"; // 表示もJavaと同じ
          this.logic.cancelBonus();
          this.stopBonusTimeout();
        } else if (currentBonusType === BonusType.SIMPLE_WORDS) {
          this.simpleWordsMode = true;
          this.bonusLabel.textContent = "3-letter words for 10s";
          this.logic.cancelBonus();
          this.stopBonusTimeout();
          this.restartSimpleWordsTimeout();
        }
      }

      this.logic.registerCorrect();
      this.scoreLabel.textContent = `Score: ${this.logic.getScore()}`;
      this.inputField.value = "";

      this.currentWord = this.nextWord();
      this.wordLabel.textContent = this.currentWord;

      if (!wasBonusPending) {
        const newBonus = this.logic.maybeCreateBonus();
        if (newBonus !== null) {
          let text;
          if (newBonus === BonusType.SCORE) text = "Score bonus ready";
          else if (newBonus === BonusType.TIME) text = "Time bonus ready";
          else text = "Simple words bonus ready";

          this.bonusLabel.textContent = text;
          this.restartBonusTimeout();
        }
      }
    } else {
      const hadPending = this.logic.isBonusPending();
      this.logic.registerIncorrect();
      this.scoreLabel.textContent = `Score: ${this.logic.getScore()}`;
      this.inputField.value = "";
      if (hadPending) {
        this.bonusLabel.textContent = "";
        this.stopBonusTimeout();
      }
    }
  }

  startGame() {
    if (this.currentPlayer === null) {
      alert("Please login first");
      return;
    }

    this.logic.reset();
    this.simpleWordsMode = false;
    this.gameRunning = true;

    this.timeRemaining = (this.timeCombo.selectedIndex === 0) ? 30 : 60;

    this.timerLabel.textContent = `Time: ${this.timeRemaining}`;
    this.currentWord = this.nextWord();
    this.scoreLabel.textContent = `Score: ${this.logic.getScore()}`;
    this.wordLabel.textContent = this.currentWord;
    this.bonusLabel.textContent = "";
    this.inputField.value = "";
    this.inputField.disabled = false;
    this.inputField.focus();

    this.stopGameInterval();
    this.stopBonusTimeout();
    this.stopSimpleWordsTimeout();

    this.gameIntervalId = setInterval(() => {
      this.timeRemaining--;
      if (this.timeRemaining < 0) this.timeRemaining = 0;
      this.timerLabel.textContent = `Time: ${this.timeRemaining}`;
      if (this.timeRemaining <= 0) {
        this.stopGameInterval();
        this.endGame();
      }
    }, 1000);
  }

  endGame() {
    this.gameRunning = false;
    this.inputField.disabled = true;

    this.stopBonusTimeout();
    this.stopSimpleWordsTimeout();

    if (this.currentPlayer !== null) {
      this.playerManager.updateBestScore(this.currentPlayer, this.logic.getScore());
      this.bestScoreLabel.textContent = `Best: ${this.currentPlayer.getBestScore()}`;
    }

    const top = this.playerManager.getTopPlayers(3);
    let text = `Final Score: ${this.logic.getScore()}\n\nTop 3 Players:\n`;
    let index = 1;
    for (const p of top) {
      text += `${index}. ${p.getUsername()} - ${p.getBestScore()}\n`;
      index++;
    }

    const restart = confirm(`${text}\nRestart?`);
    if (restart) this.startGame();
    else this.exitGame();
  }

  exitGame() { location.reload(); }

  restartBonusTimeout() {
    this.stopBonusTimeout();
    this.bonusTimeoutId = setTimeout(() => {
      this.logic.cancelBonus();
      this.bonusLabel.textContent = "";
      this.bonusTimeoutId = null;
    }, 7000);
  }

  stopBonusTimeout() {
    if (this.bonusTimeoutId !== null) {
      clearTimeout(this.bonusTimeoutId);
      this.bonusTimeoutId = null;
    }
  }

  restartSimpleWordsTimeout() {
    this.stopSimpleWordsTimeout();
    this.simpleWordsTimeoutId = setTimeout(() => {
      this.simpleWordsMode = false;
      this.bonusLabel.textContent = "";
      this.simpleWordsTimeoutId = null;
    }, 10000);
  }

  stopSimpleWordsTimeout() {
    if (this.simpleWordsTimeoutId !== null) {
      clearTimeout(this.simpleWordsTimeoutId);
      this.simpleWordsTimeoutId = null;
    }
  }

  stopGameInterval() {
    if (this.gameIntervalId !== null) {
      clearInterval(this.gameIntervalId);
      this.gameIntervalId = null;
    }
  }

  showAbout() {
    alert(
      "When the game starts, you see a login screen.\n" +
      "You type your username and password, then click \"Login / Register\".\n" +
      "\n" +
      "After logging in, the game screen appears.\n" +
      "Select a time limit (30s or 60s) from the dropdown.\n" +
      "At the top, you can see your player name, current score, best score, and time.\n" +
      "\n" +
      "When you press the \"Start\" button, the game begins.\n" +
      "A word appears in the middle of the screen, and you type it into the text box below.\n" +
      "\n" +
      "If you type the word correctly, your score increases, and a new word appears.\n" +
      "Sometimes you receive a bonus, like extra points, extra time, or easier words.\n" +
      "\n" +
      "When the timer reaches zero, the game ends.\n" +
      "A window shows your final score and the top 3 players.\n" +
      "You can choose to restart or exit.\n" +
      "\n" +
      "You can also use the menu at the top.\n" +
      "It has options like Reset, Logout, and Exit.\n" +
      "Logout is only active after you log in."
    );
  }
}

