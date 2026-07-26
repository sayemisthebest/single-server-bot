const SESSION_TIMEOUT = 300000;

class DeleteSessionManager {
  constructor() {
    this.sessions = new Map();
  }

  startSession(userId, channelId, guildId, state) {
    const session = {
      userId,
      messageId: state?.messageId || null,
      channelId,
      guildId,
      lastInteraction: Date.now(),
      state: 'message_management',
      followUp: state || {},
    };
    this.sessions.set(userId, session);
    this.scheduleExpiry(userId);
    return session;
  }

  getSession(userId) {
    return this.sessions.get(userId);
  }

  updateSession(userId, changes = {}) {
    const session = this.sessions.get(userId);
    if (!session) return;
    session.lastInteraction = Date.now();
    Object.assign(session.followUp, changes);
    this.sessions.set(userId, session);
  }

  endSession(userId) {
    this.sessions.delete(userId);
  }

  scheduleExpiry(userId) {
    setTimeout(() => {
      const session = this.sessions.get(userId);
      if (!session) return;
      if (Date.now() - session.lastInteraction >= SESSION_TIMEOUT) {
        this.sessions.delete(userId);
      }
    }, SESSION_TIMEOUT + 1000);
  }
}

module.exports = new DeleteSessionManager();
