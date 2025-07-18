"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockDb = void 0;
const mockData = {
    users: new Map(),
    invoices: new Map(),
    subscriptions: new Map()
};
exports.mockDb = {
    collection: (collectionName) => ({
        doc: (docId) => ({
            get: async () => {
                const data = mockData[collectionName]?.get(docId);
                return {
                    exists: !!data,
                    data: () => data,
                    id: docId
                };
            },
            set: async (data) => {
                if (!mockData[collectionName]) {
                    mockData[collectionName] = new Map();
                }
                mockData[collectionName].set(docId, data);
                return { id: docId };
            },
            update: async (data) => {
                const existing = mockData[collectionName]?.get(docId) || {};
                mockData[collectionName]?.set(docId, { ...existing, ...data });
                return { id: docId };
            },
            delete: async () => {
                mockData[collectionName]?.delete(docId);
                return { id: docId };
            },
            id: docId
        }),
        add: async (data) => {
            const docId = Math.random().toString(36).substr(2, 9);
            if (!mockData[collectionName]) {
                mockData[collectionName] = new Map();
            }
            mockData[collectionName].set(docId, data);
            return { id: docId };
        },
        where: (field, operator, value) => ({
            orderBy: (field, direction) => ({
                limit: (count) => ({
                    offset: (count) => ({
                        get: async () => {
                            const collection = mockData[collectionName];
                            if (!collection)
                                return { docs: [] };
                            const docs = Array.from(collection.entries())
                                .filter(([_, data]) => {
                                if (field === 'userId' && operator === '==' && data.userId === value)
                                    return true;
                                if (field === 'status' && operator === '==' && data.status === value)
                                    return true;
                                if (field === 'vendor' && operator === '==' && data.vendor === value)
                                    return true;
                                if (field === 'createdAt' && operator === '>=' && new Date(data.createdAt) >= new Date(value))
                                    return true;
                                if (field === 'createdAt' && operator === '<=' && new Date(data.createdAt) <= new Date(value))
                                    return true;
                                return false;
                            })
                                .slice(count, count + 10)
                                .map(([id, data]) => ({
                                id,
                                data: () => data
                            }));
                            return { docs };
                        }
                    })
                })
            })
        }),
        orderBy: (field, direction) => ({
            get: async () => {
                const collection = mockData[collectionName];
                if (!collection)
                    return { docs: [] };
                const docs = Array.from(collection.entries())
                    .sort(([_, a], [__, b]) => {
                    if (direction === 'desc') {
                        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                    }
                    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                })
                    .map(([id, data]) => ({
                    id,
                    data: () => data
                }));
                return { docs };
            }
        }),
        get: async () => {
            const collection = mockData[collectionName];
            if (!collection)
                return { docs: [] };
            const docs = Array.from(collection.entries()).map(([id, data]) => ({
                id,
                data: () => data
            }));
            return { docs };
        }
    })
};
//# sourceMappingURL=mockDb.js.map