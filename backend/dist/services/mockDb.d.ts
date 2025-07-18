export declare const mockDb: {
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
};
//# sourceMappingURL=mockDb.d.ts.map