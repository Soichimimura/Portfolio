export class Player {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.bestScore = 0;
  }
  getUsername() { return this.username; }
  getPassword() { return this.password; }
  getBestScore() { return this.bestScore; }
  setBestScore(bestScore) { this.bestScore = bestScore; }

  toJSON() {
    return { username: this.username, password: this.password, bestScore: this.bestScore };
  }

  static fromJSON(obj) {
    const p = new Player(obj.username, obj.password);
    p.bestScore = Number(obj.bestScore || 0);
    return p;
  }
}
