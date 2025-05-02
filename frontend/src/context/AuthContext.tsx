// frontend/src/context/AuthContext.tsx
import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    useCallback,
    useRef,
    ReactNode
} from "react";
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { API_BASE_URL, AUTH_CONFIG } from "../config"; // Assuming config.js exports these

// --- Interfaces ---
interface User {
    id: number | string;
    username: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    // Add other relevant user fields
}

interface DecodedJwtPayload {
    id: number | string;
    username: string;
    role: string;
    iat: number;
    exp: number;
}

interface AuthTokens {
    token: string;
    refreshToken: string;
    user: User;
}

interface LoginResponse extends AuthTokens {}
interface RegisterResponse extends AuthTokens {}
interface RefreshTokenResponse {
    token: string;
    refreshToken: string;
}
interface ProfileResponse {
    success: boolean; // Expect success flag from backend
    user: User;
}

interface FailedRequest {
    resolve: (value: string | PromiseLike<string>) => void;
    reject: (reason?: any) => void;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    token: string | null;
    authAxios: AxiosInstance;
    login: (username: string, password: string) => Promise<{ success: boolean; user: User }>;
    register: (userData: any) => Promise<{ success: boolean; user: User }>; // TODO: Define specific type
    logout: () => Promise<void>;
    isAuthenticated: () => boolean;
    updateProfile: (userData: Partial<User>) => Promise<{ success: boolean; user: User }>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
    sessionExpired: boolean;
    handleSessionExpired: () => void;
}

interface AuthProviderProps {
    children: ReactNode;
}

// --- Constants ---
const TOKEN_REFRESH_THRESHOLD_MS = AUTH_CONFIG.tokenRefreshThresholdMs || 5 * 60 * 1000;

// --- Context Creation ---
const defaultAuthContextValue: AuthContextType = {
    user: null,
    isLoading: true,
    token: null,
    authAxios: axios.create(), // Placeholder, will be configured
    login: async () => { throw new Error("AuthProvider not initialized"); },
    register: async () => { throw new Error("AuthProvider not initialized"); },
    logout: async () => { throw new Error("AuthProvider not initialized"); },
    isAuthenticated: () => false,
    updateProfile: async () => { throw new Error("AuthProvider not initialized"); },
    changePassword: async () => { throw new Error("AuthProvider not initialized"); },
    sessionExpired: false,
    handleSessionExpired: () => { throw new Error("AuthProvider not initialized"); },
};

const AuthContext = createContext<AuthContextType>(defaultAuthContextValue);

// --- Helper Functions ---
const parseJwt = (token: string | null): DecodedJwtPayload | null => {
    try {
        if (!token || typeof token !== 'string') return null;
        const parts = token.split('.');
        if (parts.length !== 3 || !parts[1]) return null;
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64;
        const decodedData = atob(paddedBase64);
        const jsonPayload = decodeURIComponent(
            decodedData.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        );
        return JSON.parse(jsonPayload) as DecodedJwtPayload;
    } catch (error) {
        // Only log in development to avoid console noise in production
        if (import.meta.env.DEV) console.error("Error parsing JWT:", error);
        return null;
    }
};

const logAuthAction = (action: string, details: Record<string, any> = {}) => {
     // Log more verbosely in development
     if (import.meta.env.DEV) {
        console.log(`Auth: ${action}`, { timestamp: new Date().toISOString(), ...details });
    } else if (action.includes('error') || action.includes('failed') || action.includes('expired')) {
        // Log only critical actions in production
        console.log(`Auth: ${action}`, { timestamp: new Date().toISOString(), ...details });
    }
};

// --- Axios Instance Factory ---
// This instance relies on the Vite proxy for requests starting with /api
const createAxiosInstance = (baseURL: string = API_BASE_URL, timeout: number = 15000): AxiosInstance => {
    const instance = axios.create({
        baseURL, // Will be '' in dev, so paths must start with /api
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        withCredentials: true, // Important for sending/receiving cookies if needed
        timeout
    });

    // Request Interceptor (Logging - less verbose in prod)
    instance.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            if (import.meta.env.DEV) {
                const displayUrl = config.url?.startsWith('/') ? config.url : `/${config.url}`;
                console.log(`🚀 Request (via authAxios): ${config.method?.toUpperCase()} ${displayUrl}`);
            }
            // Ensure path starts with /api when using the proxied instance
            // This assumes Vite proxy is configured for '/api'
            if (config.url && !config.url.startsWith('/api')) {
                if (import.meta.env.DEV) {
                     console.warn(`AuthAxios request URL "${config.url}" missing /api prefix for proxy. Prepending '/api'.`);
                }
                config.url = `/api${config.url.startsWith('/') ? config.url : '/' + config.url}`;
            }
            return config;
        },
        (error: AxiosError) => {
            console.error("Request setup error:", error);
            return Promise.reject(error);
        }
    );

    // Response Interceptor (Logging - less verbose in prod)
    instance.interceptors.response.use(
        (response: AxiosResponse) => {
             if (import.meta.env.DEV) {
                const displayUrl = response.config.url?.startsWith('/') ? response.config.url : `/${response.config.url}`;
                console.log(`✅ Response (via authAxios): ${response.status} ${displayUrl}`);
            }
            return response;
        },
        (error: AxiosError) => {
            const displayUrl = error.config?.url?.startsWith('/') ? error.config?.url : `/${error.config?.url}`;
            console.error(`❌ Response error (via authAxios): ${displayUrl ?? 'unknown'} - ${error.message}`, {
                status: error.response?.status
            });
            return Promise.reject(error);
        }
    );

    return instance;
};

// --- AuthProvider Component ---
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_CONFIG.tokenKey));
    const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem(AUTH_CONFIG.refreshTokenKey));
    const [sessionExpired, setSessionExpired] = useState<boolean>(false);

    // Create the authAxios instance within the provider so it has access to state/setters if needed later
    // Although primarily used for setting headers based on token state
    const authAxiosInstance = useRef(createAxiosInstance()).current;

    const isRefreshing = useRef<boolean>(false);
    const failedQueue = useRef<FailedRequest[]>([]);
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

    const processQueue = useCallback((error: Error | null, newToken: string | null = null) => {
        failedQueue.current.forEach(promise => {
            if (error) promise.reject(error);
            else if (newToken) promise.resolve(newToken);
            else promise.reject(new Error("Token refresh failed silently."));
        });
        failedQueue.current = [];
    }, []);

    const isTokenExpired = useCallback((tokenToCheck: string | null): boolean => {
        if (!tokenToCheck) return true;
        const decoded = parseJwt(tokenToCheck);
        if (!decoded?.exp) return true;
        const bufferSeconds = 5;
        return decoded.exp * 1000 < Date.now() + (bufferSeconds * 1000);
    }, []);

    const getTimeUntilExpiry = useCallback((tokenToCheck: string | null): number => {
        if (!tokenToCheck) return 0;
        const decoded = parseJwt(tokenToCheck);
        if (!decoded?.exp) return 0;
        return Math.max(0, (decoded.exp * 1000) - Date.now());
    }, []);

    const handleSessionExpired = useCallback(() => {
        logAuthAction('Session expired - logging out');
        localStorage.removeItem(AUTH_CONFIG.tokenKey);
        localStorage.removeItem(AUTH_CONFIG.refreshTokenKey);
        delete authAxiosInstance.defaults.headers.common["Authorization"]; // Use the instance ref
        setToken(null);
        setRefreshToken(null);
        setUser(null);
        setSessionExpired(true);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
    }, [authAxiosInstance]); // Include instance ref

    const getDirectApiUrl = useCallback((path: string): string => {
        if (!path.startsWith('/')) path = `/${path}`;
        if (!path.startsWith('/api')) {
            logAuthAction(`Prepending /api to direct API call path "${path}"`);
            path = `/api${path}`;
        }
        logAuthAction('Using relative API path for proxy', { path });
        return path;
    }, []);

    const setupTokenRefreshTimer = useCallback(() => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;

        if (!token || !refreshToken) return;

        const timeUntilExpiry = getTimeUntilExpiry(token);
        const safeRefreshThreshold = TOKEN_REFRESH_THRESHOLD_MS * 1.1;

        if (timeUntilExpiry <= safeRefreshThreshold) {
             logAuthAction('Token expiry near or passed, rely on interceptor');
             return;
        }
        const refreshTime = Math.max(0, timeUntilExpiry - safeRefreshThreshold);

        refreshTimerRef.current = setTimeout(async () => {
            if (token && refreshToken && !isRefreshing.current) {
                logAuthAction('Proactive token refresh attempt');
                isRefreshing.current = true;
                try {
                    const refreshUrl = getDirectApiUrl('/api/auth/refresh-token');
                    logAuthAction('Proactive refresh URL', { url: refreshUrl });

                    // Use regular axios for refresh to avoid interceptor loop if main token is already expired
                    const response = await axios.post<RefreshTokenResponse>(
                        refreshUrl,
                        { refreshToken },
                        { withCredentials: true, timeout: 15000 }
                    );

                    const { token: newToken, refreshToken: newRefreshToken } = response.data;
                    localStorage.setItem(AUTH_CONFIG.tokenKey, newToken);
                    localStorage.setItem(AUTH_CONFIG.refreshTokenKey, newRefreshToken);
                    setToken(newToken);
                    setRefreshToken(newRefreshToken);
                    authAxiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
                    logAuthAction('Token proactively refreshed');
                    processQueue(null, newToken);
                    setupTokenRefreshTimer(); // Reschedule next refresh
                } catch (error) {
                    const axiosError = error as AxiosError;
                    logAuthAction('Proactive token refresh failed', { error: axiosError.message, status: axiosError.response?.status });
                    processQueue(axiosError, null);
                    if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
                        handleSessionExpired();
                    }
                } finally {
                    isRefreshing.current = false;
                }
            }
        }, refreshTime);
        logAuthAction('Token refresh scheduled', { minutesUntilRefresh: Math.floor(refreshTime / 60000) });
    }, [token, refreshToken, getTimeUntilExpiry, handleSessionExpired, getDirectApiUrl, processQueue, authAxiosInstance]); // Added dependencies

    // Setup Axios interceptors
    useEffect(() => {
        const requestInterceptor = authAxiosInstance.interceptors.request.use(
            (config) => {
                if (token && !isTokenExpired(token)) {
                     config.headers.Authorization = `Bearer ${token}`;
                } else if (token) {
                     logAuthAction('Token expired before request (authAxios), clearing header', { url: config.url });
                     delete config.headers.Authorization;
                }
                return config;
            },
            error => Promise.reject(error)
        );

        const responseInterceptor = authAxiosInstance.interceptors.response.use(
            response => response,
            async (error: AxiosError) => {
                const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

                if (error.response?.status !== 401 || originalRequest._retry || !originalRequest) {
                    return Promise.reject(error);
                }
                originalRequest._retry = true;

                if (isRefreshing.current) {
                     logAuthAction('Request queued due to ongoing refresh (authAxios)', { url: originalRequest.url });
                    return new Promise<string>((resolve, reject) => {
                        failedQueue.current.push({ resolve, reject });
                    }).then(newToken => {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return authAxiosInstance(originalRequest); // Retry with new token
                    }).catch(err => Promise.reject(err));
                }

                isRefreshing.current = true;
                logAuthAction('Attempting token refresh after 401 (authAxios)', { url: originalRequest.url });

                const currentRefreshToken = localStorage.getItem(AUTH_CONFIG.refreshTokenKey); // Get latest from storage

                if (!currentRefreshToken) {
                    logAuthAction('Refresh failed: No refresh token available after 401');
                    isRefreshing.current = false;
                    handleSessionExpired();
                    return Promise.reject(error);
                }

                try {
                    const refreshUrl = getDirectApiUrl('/api/auth/refresh-token');
                    logAuthAction('401 refresh URL (authAxios)', { url: refreshUrl });

                    // Use regular axios for refresh
                    const response = await axios.post<RefreshTokenResponse>(
                         refreshUrl,
                         { refreshToken: currentRefreshToken },
                         { withCredentials: true, timeout: 15000 }
                     );
                    const { token: newToken, refreshToken: newRefreshToken } = response.data;

                    localStorage.setItem(AUTH_CONFIG.tokenKey, newToken);
                    localStorage.setItem(AUTH_CONFIG.refreshTokenKey, newRefreshToken);
                    setToken(newToken);
                    setRefreshToken(newRefreshToken); // Update state
                    authAxiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

                    processQueue(null, newToken);
                    setupTokenRefreshTimer();
                    logAuthAction('Token refresh success after 401 (authAxios)');

                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return authAxiosInstance(originalRequest);

                } catch (refreshError) {
                    const axiosRefreshError = refreshError as AxiosError;
                    logAuthAction('Token refresh failed after 401 (authAxios)', { error: axiosRefreshError.message, status: axiosRefreshError.response?.status });
                    processQueue(axiosRefreshError, null);
                    handleSessionExpired();
                    return Promise.reject(error);
                } finally {
                    isRefreshing.current = false;
                }
            }
        );

        return () => {
            authAxiosInstance.interceptors.request.eject(requestInterceptor);
            authAxiosInstance.interceptors.response.eject(responseInterceptor);
        };
    }, [token, isTokenExpired, handleSessionExpired, setupTokenRefreshTimer, getDirectApiUrl, processQueue, authAxiosInstance]); // Added dependencies

    // Setup proactive refresh timer
    useEffect(() => {
         setupTokenRefreshTimer();
         return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
    }, [setupTokenRefreshTimer]);

    // Load user data on initial mount or when token changes
    useEffect(() => {
        const loadUser = async () => {
            const currentToken = localStorage.getItem(AUTH_CONFIG.tokenKey); // Check storage too
            if (currentToken && typeof currentToken === 'string' && currentToken.split('.').length === 3 && !isTokenExpired(currentToken)) {
                 setIsLoading(true);
                 // Ensure token header is set correctly before making the call
                 authAxiosInstance.defaults.headers.common["Authorization"] = `Bearer ${currentToken}`;
                try {
                    const response = await authAxiosInstance.get<ProfileResponse>('/api/auth/profile');
                     if (response.data?.success && response.data?.user) {
                         setUser(response.data.user);
                         if (sessionExpired) setSessionExpired(false);
                         logAuthAction('User profile loaded', { userId: response.data.user.id });
                     } else {
                         logAuthAction('Profile loaded but success=false or no user data');
                         handleSessionExpired();
                     }
                } catch (error) {
                    const axiosError = error as AxiosError;
                     logAuthAction('Error loading user profile', { error: axiosError.message, status: axiosError.response?.status });
                     if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
                         handleSessionExpired();
                     }
                     else if (isTokenExpired(currentToken) && !isRefreshing.current) {
                         handleSessionExpired();
                     }
                } finally {
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
                if (user) setUser(null);
                if (currentToken) { // If there was an invalid/expired token in storage
                  handleSessionExpired();
                }
            }
        };
        loadUser();
        // Dependencies: Rerun only when token state changes or sessionExpired flag flips
    }, [token, sessionExpired, handleSessionExpired, isTokenExpired, authAxiosInstance]); // *** REMOVED 'user' ***

    // --- Auth Functions ---

    const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; user: User }> => {
        try {
            logAuthAction('Login attempt', { username });
            const loginUrl = getDirectApiUrl('/api/auth/login');
            logAuthAction('Login URL', { url: loginUrl });

            // Use regular axios for login
            const response = await axios.post<LoginResponse>(
                loginUrl, { username, password },
                { withCredentials: true, timeout: 15000 }
            );

            if (!response.data || !response.data.token || !response.data.refreshToken || !response.data.user) {
                throw new Error("Invalid login response from server.");
            }

            const { token: newToken, refreshToken: newRefreshToken, user: loggedInUser } = response.data;

            setSessionExpired(false);
            localStorage.setItem(AUTH_CONFIG.tokenKey, newToken);
            localStorage.setItem(AUTH_CONFIG.refreshTokenKey, newRefreshToken);
            setToken(newToken);
            setRefreshToken(newRefreshToken);
            setUser(loggedInUser);
            authAxiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

            logAuthAction('Login success', { userId: loggedInUser.id });
            setupTokenRefreshTimer();
            return { success: true, user: loggedInUser };

        } catch (error) {
            const axiosError = error as AxiosError<{ message?: string }>;
            logAuthAction('Login error', { error: axiosError.message, status: axiosError.response?.status });
            throw new Error(axiosError.response?.data?.message || "Login failed. Please check credentials.");
        }
    }, [getDirectApiUrl, setupTokenRefreshTimer, handleSessionExpired, authAxiosInstance]); // Added handleSessionExpired, authAxiosInstance

    const register = useCallback(async (userData: any): Promise<{ success: boolean; user: User }> => {
        try {
            logAuthAction('Registration attempt');
            const registerUrl = getDirectApiUrl('/api/auth/register');
            logAuthAction('Register URL', { url: registerUrl });

            // Use regular axios for register
            const response = await axios.post<RegisterResponse>(
                registerUrl, userData,
                { withCredentials: true, timeout: 20000 }
            );

             if (!response.data || !response.data.token || !response.data.refreshToken || !response.data.user) {
                throw new Error("Invalid registration response from server.");
            }

            const { token: newToken, refreshToken: newRefreshToken, user: registeredUser } = response.data;

            setSessionExpired(false);
            localStorage.setItem(AUTH_CONFIG.tokenKey, newToken);
            localStorage.setItem(AUTH_CONFIG.refreshTokenKey, newRefreshToken);
            setToken(newToken);
            setRefreshToken(newRefreshToken);
            setUser(registeredUser);
            authAxiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

            logAuthAction('Registration success', { userId: registeredUser.id });
            setupTokenRefreshTimer();
            return { success: true, user: registeredUser };
        } catch (error) {
             const axiosError = error as AxiosError<{ message?: string; errors?: { field: string, message: string }[] }>;
             logAuthAction('Registration error', { error: axiosError.message, status: axiosError.response?.status, data: axiosError.response?.data });
             if (axiosError.response?.data?.errors) {
                 const errorMessage = axiosError.response.data.errors.map(err => `${err.field}: ${err.message}`).join(", ");
                 throw new Error(`Registration failed: ${errorMessage}`);
             }
             throw new Error(axiosError.response?.data?.message || "Registration failed.");
        }
    }, [getDirectApiUrl, setupTokenRefreshTimer, handleSessionExpired, authAxiosInstance]); // Added handleSessionExpired, authAxiosInstance

    const logout = useCallback(async (): Promise<void> => {
        logAuthAction('Logout attempt');
        const currentRefreshToken = localStorage.getItem(AUTH_CONFIG.refreshTokenKey); // Get from storage before clearing state

        handleSessionExpired(); // Centralized cleanup (clears state, local storage, timer)
        logAuthAction('Local state cleared for logout');

        if (currentRefreshToken) {
             try {
                 const logoutUrl = getDirectApiUrl('/api/auth/logout');
                 logAuthAction('Calling backend logout', { url: logoutUrl });
                 // Use regular axios for logout
                 await axios.post( logoutUrl, { refreshToken: currentRefreshToken }, { withCredentials: true, timeout: 10000 } );
                 logAuthAction('Backend logout successful');
             } catch (error) {
                 const axiosError = error as AxiosError;
                 logAuthAction('Backend logout API error (ignored)', { error: axiosError.message, status: axiosError.response?.status });
             }
        } else {
             logAuthAction('No refresh token, skipping backend logout call');
        }
    }, [handleSessionExpired, getDirectApiUrl]); // Dependencies updated

    const isAuthenticated = useCallback((): boolean => {
        const currentToken = token || localStorage.getItem(AUTH_CONFIG.tokenKey);
        const tokenValid = !!currentToken && typeof currentToken === 'string' && currentToken.split('.').length === 3 && !isTokenExpired(currentToken);
        return tokenValid && !!user;
    }, [token, user, isTokenExpired]);

    const updateProfile = useCallback(async (userData: Partial<User>): Promise<{ success: boolean; user: User }> => {
        try {
            const profileUrl = "/api/auth/profile"; // Relative path uses proxy
            logAuthAction('Update profile attempt', { url: profileUrl });
            const response = await authAxiosInstance.put<ProfileResponse>(profileUrl, userData); // Use the instance

            if (!response.data?.success || !response.data?.user) {
                 throw new Error(response.data?.message || "Profile update response invalid.");
            }
            setUser(response.data.user);
            logAuthAction('Profile updated successfully', { userId: response.data.user.id });
            return { success: true, user: response.data.user };
        } catch (error) {
             const axiosError = error as AxiosError<{ success: boolean; message?: string; errors?: any }>;
             logAuthAction('Update profile error', { error: axiosError.message, status: axiosError.response?.status, data: axiosError.response?.data });
             if (axiosError.response?.data?.errors) {
                 // Handle potential validation errors array or object
                 const errorDetail = Array.isArray(axiosError.response.data.errors)
                    ? axiosError.response.data.errors.map((e:any) => `${e.field}: ${e.message}`).join(", ")
                    : JSON.stringify(axiosError.response.data.errors);
                 throw new Error(`Validation error: ${errorDetail}`);
             }
             throw new Error(axiosError.response?.data?.message || "Failed to update profile.");
        }
    }, [authAxiosInstance]); // Use instance ref

    const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
        try {
            const passwordUrl = "/api/auth/password"; // Relative path uses proxy
            logAuthAction('Change password attempt', { url: passwordUrl });
            const response = await authAxiosInstance.put<{success: boolean; message: string}>(passwordUrl, { currentPassword, newPassword }); // Use the instance

            if (!response.data?.success) {
                 throw new Error(response.data?.message || "Password change failed.");
            }
            logAuthAction('Password changed successfully');
            return { success: true, message: response.data.message };
        } catch (error) {
             const axiosError = error as AxiosError<{ success: boolean; message?: string }>;
             logAuthAction('Change password error', { error: axiosError.message, status: axiosError.response?.status, data: axiosError.response?.data });
             throw new Error(axiosError.response?.data?.message || "Failed to change password.");
        }
    }, [authAxiosInstance]); // Use instance ref

    // --- Context Value ---
    const value: AuthContextType = {
        user,
        isLoading,
        token,
        authAxios: authAxiosInstance, // Provide the configured instance
        login,
        register,
        logout,
        isAuthenticated,
        updateProfile,
        changePassword,
        sessionExpired,
        handleSessionExpired,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- Custom Hook ---
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

// Export context for potential direct usage if needed
export default AuthContext;