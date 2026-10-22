import { type ReactNode } from "react";
export type AuthUser = {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
};
type AuthValue = {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (returnTo?: string) => void;
    logout: (returnTo?: string) => void;
    refresh: () => Promise<void>;
};
export declare function AuthProvider({ children }: {
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useAuth(): AuthValue;
export {};
//# sourceMappingURL=use-auth.d.ts.map