class MemorySyncRepository {
  constructor() {
    this.documents = [];
    this.events = [];
  }

  async findEventByEventId(eventId) {
    return this.events.find((event) => event.eventId === eventId) || null;
  }

  async saveEvent(event) {
    this.events.push({ ...event });
    return event;
  }

  async findDocument({ collection, groupId, remoteId }) {
    return (
      this.documents.find(
        (document) =>
          document.collection === collection &&
          document.groupId === groupId &&
          document.remoteId === remoteId,
      ) || null
    );
  }

  async getNextServerVersion(groupId) {
    return (
      Math.max(
        0,
        ...this.documents
          .filter((document) => document.groupId === groupId)
          .map((document) => Number(document.serverVersion || 0)),
      ) + 1
    );
  }

  async upsertDocument(payload) {
    const now = new Date().toISOString();
    const index = this.documents.findIndex(
      (document) =>
        document.collection === payload.collection &&
        document.groupId === payload.groupId &&
        document.remoteId === payload.remoteId,
    );
    const nextDocument = {
      createdAt: index >= 0 ? this.documents[index].createdAt : now,
      updatedAt: now,
      ...payload,
    };

    if (index >= 0) {
      this.documents[index] = nextDocument;
    } else {
      this.documents.push(nextDocument);
    }

    return nextDocument;
  }

  async findChangesAfterCursor({ cursor = 0, groupId }) {
    return this.documents
      .filter(
        (document) =>
          document.groupId === groupId &&
          Number(document.serverVersion || 0) > Number(cursor || 0),
      )
      .sort((left, right) => left.serverVersion - right.serverVersion);
  }
}

module.exports = MemorySyncRepository;
