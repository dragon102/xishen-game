/** 两步确认：第一下上膛，windowMs 内第二下才算数。 */
export class ConfirmGate {
  private armedAt: number | null = null;

  constructor(private readonly windowMs = 3000) {}

  press(now: number): boolean {
    if (this.isArmed(now)) {
      this.armedAt = null;
      return true;
    }
    this.armedAt = now;
    return false;
  }

  isArmed(now: number): boolean {
    return this.armedAt !== null && now - this.armedAt <= this.windowMs;
  }

  reset(): void {
    this.armedAt = null;
  }
}
