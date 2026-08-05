'use client';

import { ApiError } from '@/libs/api/api.types.error';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthResponse, useProfile, useRequestOtpMutation, useVerifyOtpMutation } from './auth.api.client';
import { InvitationStatus, Role, RoleType } from './auth.constants.roles';
import { logout as logoutUtil, storeAuthTokens } from './auth.utils.tokens';

interface AuthContextType {
    user: AuthResponse['user'] | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    needsOnboarding: boolean;
    sendOtp: (phoneNumber: string) => Promise<{ message: string; isNewUser?: boolean }>;
    verifyOtpAndLogin: (phoneNumber: string, otp: string, firstName?: string, lastName?: string) => Promise<void>;
    logout: () => void;
    error: string | null;
    clearError: () => void;
    refreshProfile: () => void;
    hasRole: (role: Role, organizationId?: number) => boolean;
    hasAnyRole: (roles: Role[], organizationId?: number) => boolean;
    getRoleByInvitationStatus: (status: InvitationStatus) => RoleType | null;
    selectedRole: RoleType | null;
    setSelectedRole: (role: RoleType | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [error, setError] = useState<string | null>(null);
    const [profileChecked, setProfileChecked] = useState(false);
    const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);

    const { requestOtp: requestOtpMutation, isLoading: isOtpLoading } = useRequestOtpMutation();
    const { verifyOtp: verifyOtpMutation, isLoading: isVerifyLoading } = useVerifyOtpMutation();
    const { data: profileData, isLoading: isProfileLoading, error: profileError, mutate, reset } = useProfile();

    const isLoading = isOtpLoading || isVerifyLoading || isProfileLoading || !profileChecked;
    const isAuthenticated = profileChecked && !!profileData && !!selectedRole;
    const needsOnboarding = isAuthenticated && !profileData?.firstName;

    // Set the default selected role when user data is loaded, checking local storage first.
    useEffect(() => {
        if (!profileData && !profileError) return;
        if (profileData?.roles && profileData.roles.length > 0) {
            let defaultRole = profileData.roles[0];
            const storedRole = localStorage.getItem('selected-role');
            if (storedRole) {
                const matchingRole = profileData.roles.find((role) => role.id === +storedRole);
                if (matchingRole) {
                    defaultRole = matchingRole;
                }
            }
            setSelectedRole(defaultRole);
        }
        // If user has no roles at all, redirect to home.
        if (profileData && profileData.roles && profileData.roles.length === 0) {
            router.push('/');
            return;
        }
        setProfileChecked(true);
    }, [profileData, profileError, router]);

    // Persist selectedRole changes to local storage.
    useEffect(() => {
        if (selectedRole) {
            localStorage.setItem('selected-role', selectedRole.id.toString());
        }
    }, [selectedRole]);

    const hasRole = useCallback((role: Role, organizationId?: number): boolean => {
        if (!profileData || !profileData.roles) return false;

        if (organizationId !== undefined) {
            // Check for role in specific organization
            return profileData.roles.some(
                (userRole) => userRole.role === role && userRole.organization === organizationId
            );
        }

        // Check for role in any context (global or any organization)
        return profileData.roles.some((userRole) => userRole.role === role);
    }, [profileData]);

    const hasAnyRole = useCallback((roles: Role[], organizationId?: number): boolean => {
        if (!profileData || !profileData.roles) return false;

        if (organizationId !== undefined) {
            // Check for any role in specific organization
            return profileData.roles.some(
                (userRole) => roles.includes(userRole.role) && userRole.organization === organizationId
            );
        }

        // Check for any role in any context
        return profileData.roles.some((userRole) => roles.includes(userRole.role));
    }, [profileData]);

    // get role by specific invitation status
    const getRoleByInvitationStatus = useCallback((status: InvitationStatus): RoleType | null => {
        if (!profileData || !profileData.roles) return null;
        return profileData.roles.find((userRole) => userRole.invitationStatus === status) || null;
    }, [profileData]);

    const sendOtp = async (phoneNumber: string) => {
        try {
            setError(null);
            const response = await requestOtpMutation({ phoneNumber });
            return response;
        } catch (error: unknown) {
            setError((error as ApiError).message || 'Failed to send OTP');
            throw error;
        }
    };

    const verifyOtpAndLogin = async (phoneNumber: string, otp: string, firstName?: string, lastName?: string) => {
        try {
            setError(null);
            const response = await verifyOtpMutation({ phoneNumber, otp, firstName, lastName });
            if (response) {
                storeAuthTokens(response);
                mutate();
            }
        } catch (error: unknown) {
            setError((error as ApiError).message || 'Invalid OTP');
            throw error;
        }
    };

    const clearError = () => setError(null);

    const logout = () => {
        setSelectedRole(null);
        localStorage.removeItem('selected-role');
        setError(null);
        logoutUtil();
        reset();
    }

    useEffect(() => {
        if (isAuthenticated) {
            const currentPath = pathname.split('/')[1];

            // Skip redirect if the user is already authenticated and on a different path
            if (!['dashboard'].includes(currentPath)) {
                return;
            }
        }
    }, [isAuthenticated, router, pathname, getRoleByInvitationStatus]);

    const contextValue = useMemo(() => ({
        user: profileData || null,
        isLoading,
        isAuthenticated,
        needsOnboarding,
        sendOtp,
        verifyOtpAndLogin,
        logout,
        refreshProfile: mutate,
        hasRole,
        hasAnyRole,
        getRoleByInvitationStatus,
        error,
        clearError,
        selectedRole,
        setSelectedRole,
    }), [
        profileData,
        isLoading,
        mutate,
        isAuthenticated,
        needsOnboarding,
        error,
        hasRole,
        hasAnyRole,
        getRoleByInvitationStatus,
        selectedRole,
    ]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}