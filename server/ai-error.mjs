export class AIError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
