export type R1FixtureState = 'PENDING' | 'READY_SAMPLE' | 'UNAVAILABLE'

export interface R1FixtureSnapshot {
  readonly state: R1FixtureState
  readonly revision: number
}

export interface R1FixtureSession {
  readonly getSnapshot: () => R1FixtureSnapshot
  readonly subscribe: (listener: () => void) => () => void
  readonly setState: (state: R1FixtureState) => void
}

const initialSnapshot: R1FixtureSnapshot = Object.freeze({ state: 'PENDING', revision: 0 })

/** Pure, session-keyed fixture state. It never contacts a provider or Harness host. */
export class R1FixtureStore {
  private readonly sessions = new Map<string, R1FixtureSessionImpl>()
  private disposed = false

  forSession(sessionId: string): R1FixtureSession {
    let session = this.sessions.get(sessionId)
    if (session === undefined) {
      session = new R1FixtureSessionImpl()
      this.sessions.set(sessionId, session)
    }
    return session
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const session of this.sessions.values()) session.dispose()
    this.sessions.clear()
  }
}

class R1FixtureSessionImpl implements R1FixtureSession {
  private snapshot = initialSnapshot
  private readonly listeners = new Set<() => void>()
  private disposed = false

  readonly getSnapshot = (): R1FixtureSnapshot => this.snapshot

  readonly subscribe = (listener: () => void): (() => void) => {
    if (this.disposed) return () => {}
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  readonly setState = (state: R1FixtureState): void => {
    if (this.disposed || state === this.snapshot.state) return
    this.snapshot = Object.freeze({ state, revision: this.snapshot.revision + 1 })
    for (const listener of [...this.listeners]) listener()
  }

  dispose(): void {
    this.disposed = true
    this.listeners.clear()
  }
}
