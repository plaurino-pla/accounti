export interface User {
    id: string;
    googleId: string;
    email: string;
    name: string;
    picture?: string;
    subscription: 'free' | 'pro' | 'premium';
    configuration: UserConfiguration;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface UserConfiguration {
    folderTemplate: string;
    rootFolder: string;
    historicalRange: number;
    syncFrequency: 'daily' | '6h' | 'hourly';
    googleDriveFolderId?: string;
    googleSheetId?: string;
}
export declare class UserService {
    private usersCollection;
    createOrUpdateUser(userData: Partial<User>): Promise<User>;
    getUserById(id: string): Promise<User | null>;
    getUserByGoogleId(googleId: string): Promise<User | null>;
    getUserByEmail(email: string): Promise<User | null>;
    updateUserConfiguration(userId: string, configuration: Partial<UserConfiguration>): Promise<void>;
    updateSubscription(userId: string, subscription: 'free' | 'pro' | 'premium'): Promise<void>;
    updateUserProfile(userId: string, profile: {
        name?: string;
        picture?: string;
    }): Promise<void>;
    generateJWT(userId: string): string;
    verifyJWT(token: string): {
        userId: string;
        iat: number;
    };
}
//# sourceMappingURL=userService.d.ts.map