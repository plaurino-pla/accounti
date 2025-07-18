// Mock database for development
const mockData = {
  users: new Map(),
  invoices: new Map(),
  subscriptions: new Map()
};

export const mockDb = {
  collection: (collectionName: string) => ({
    doc: (docId: string) => ({
      get: async () => {
        const data = mockData[collectionName as keyof typeof mockData]?.get(docId);
        return {
          exists: !!data,
          data: () => data,
          id: docId
        };
      },
      set: async (data: any) => {
        if (!mockData[collectionName as keyof typeof mockData]) {
          mockData[collectionName as keyof typeof mockData] = new Map();
        }
        mockData[collectionName as keyof typeof mockData].set(docId, data);
        return { id: docId };
      },
      update: async (data: any) => {
        const existing = mockData[collectionName as keyof typeof mockData]?.get(docId) || {};
        mockData[collectionName as keyof typeof mockData]?.set(docId, { ...existing, ...data });
        return { id: docId };
      },
      delete: async () => {
        mockData[collectionName as keyof typeof mockData]?.delete(docId);
        return { id: docId };
      },
      id: docId
    }),
    add: async (data: any) => {
      const docId = Math.random().toString(36).substr(2, 9);
      if (!mockData[collectionName as keyof typeof mockData]) {
        mockData[collectionName as keyof typeof mockData] = new Map();
      }
      mockData[collectionName as keyof typeof mockData].set(docId, data);
      return { id: docId };
    },
    where: (field: string, operator: string, value: any) => ({
      orderBy: (field: string, direction: string) => ({
        limit: (count: number) => ({
          offset: (count: number) => ({
            get: async () => {
              const collection = mockData[collectionName as keyof typeof mockData];
              if (!collection) return { docs: [] };
              
              const docs = Array.from(collection.entries())
                .filter(([_, data]) => {
                  if (field === 'userId' && operator === '==' && data.userId === value) return true;
                  if (field === 'status' && operator === '==' && data.status === value) return true;
                  if (field === 'vendor' && operator === '==' && data.vendor === value) return true;
                  if (field === 'createdAt' && operator === '>=' && new Date(data.createdAt) >= new Date(value)) return true;
                  if (field === 'createdAt' && operator === '<=' && new Date(data.createdAt) <= new Date(value)) return true;
                  return false;
                })
                .slice(count, count + 10) // Simple pagination
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
    orderBy: (field: string, direction: string) => ({
      get: async () => {
        const collection = mockData[collectionName as keyof typeof mockData];
        if (!collection) return { docs: [] };
        
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
      const collection = mockData[collectionName as keyof typeof mockData];
      if (!collection) return { docs: [] };
      
      const docs = Array.from(collection.entries()).map(([id, data]) => ({
        id,
        data: () => data
      }));
      
      return { docs };
    }
  })
}; 