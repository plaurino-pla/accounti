import admin from 'firebase-admin';
export declare const auth: import("firebase-admin/auth").Auth;
export declare const db: admin.firestore.Firestore;
export declare const mockAuth: {
    verifyIdToken: (token: string) => Promise<import("firebase-admin/auth").DecodedIdToken | {
        uid: string;
        email: string;
        name: string;
    }>;
    createCustomToken: (uid: string) => Promise<string>;
    getUserByEmail: (email: string) => Promise<import("firebase-admin/auth").UserRecord | {
        uid: string;
        email: string;
        displayName: string;
    }>;
};
export declare const getDb: () => {
    collection: (collectionName: string) => {
        doc: (docId: string) => {
            get: () => Promise<{
                exists: boolean;
                data: () => any;
                id: string;
            }>;
            set: (data: any) => Promise<{
                id: string;
            }>;
            update: (data: any) => Promise<{
                id: string;
            }>;
            delete: () => Promise<{
                id: string;
            }>;
            id: string;
        };
        add: (data: any) => Promise<{
            id: string;
        }>;
        where: (field: string, operator: string, value: any) => {
            orderBy: (field: string, direction: string) => {
                limit: (count: number) => {
                    offset: (count: number) => {
                        get: () => Promise<{
                            docs: {
                                id: any;
                                data: () => any;
                            }[];
                        }>;
                    };
                };
            };
        };
        orderBy: (field: string, direction: string) => {
            get: () => Promise<{
                docs: {
                    id: any;
                    data: () => any;
                }[];
            }>;
        };
        get: () => Promise<{
            docs: {
                id: any;
                data: () => any;
            }[];
        }>;
    };
} | admin.firestore.Firestore;
//# sourceMappingURL=firebase.d.ts.map