import { Player } from "./player.js";

const STORAGE_KEY = "players.ser"; // Javaの名前をそのままキーに使う

export class PlayerManager {
  constructor() {
    this.players = new Map();
  }

  static load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new PlayerManager();
      const data = JSON.parse(raw);

      const pm = new PlayerManager();
      const playersObj = data && data.players ? data.players : {};
      for (const [username, pobj] of Object.entries(playersObj)) {
        const p = Player.fromJSON(pobj);
        pm.players.set(username, p);
      }
      return pm;
    } catch {
      return new PlayerManager();
    }
  }

  save() {
    const playersObj = {};
    for (const [username, p] of this.players.entries()) {
      playersObj[username] = p;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ players: playersObj }));
  }

  findPlayer(username) {
    return this.players.get(username) || null;
  }

  register(username, password) {
    const p = new Player(username, password);
    this.players.set(username, p);
    this.save();
    return p;
  }

  authenticate(username, password) {
    const p = this.players.get(username);
    if (!p) return null;
    if (p.getPassword() === password) return p;
    return null;
  }

  updateBestScore(p, score) {
    if (score > p.getBestScore()) {
      p.setBestScore(score);
      this.save();
    }
  }

  getTopPlayers(n) {
    const list = Array.from(this.players.values());
    list.sort((a, b) => (b.getBestScore() - a.getBestScore()));
    return list.length > n ? list.slice(0, n) : list;
  }
}
