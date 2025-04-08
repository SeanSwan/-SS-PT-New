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
// API_BASE_URL is '' in dev, relies on proxy for paths starting with /api
// API_BASE_URL is 'https://<your-backend-url>' in production
import { API_BASE_URL, AUTH_CONFIG } from "../config";

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
// Define the explicit backend URL for development for direct axios calls
const DEV_BACKEND_URL = 'http://localhost:5000'; // Match vite proxy target

// --- Context Creation ---
const defaultAuthContextValue: AuthContextType = {
    user: null,
    isLoading: true,
    token: null,
    authAxios: axios.create(), // Placeholder
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
        if (process.env.NODE_ENV !== 'production') console.error("Error parsing JWT:", error);
        return null;
    }
};

const logAuthAction = (action: string, details: Record<string, any> = {}) => {
     if (process.env.NODE_ENV !== 'production') {
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
        withCredentials: true,
        timeout
    });

    // Request Interceptor (Logging)
    instance.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            if (process.env.NODE_ENV !== 'production') {
                const displayUrl = config.url?.startsWith('/') ? config.url : `/${config.url}`; // Ensure leading slash for clarity
                console.log(`🚀 Request (via authAxios): ${config.method?.toUpperCase()} ${displayUrl}`);
            }
            return config;
        },
        (error: AxiosError) => {
            console.error("Request setup error:", error);
            return Promise.reject(error);
        }
    );

    // Response Interceptor (Logging)
    instance.interceptors.response.use(
        (response: AxiosResponse) => {
            if (process.env.NODE_ENV !== 'production') {
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

// Create the specific instance for auth-related requests that will use the proxy
const authAxios = createAxiosInstance();

// --- AuthProvider Component ---
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_CONFIG.tokenKey));
    const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem(AUTH_CONFIG.refreshTokenKey));
    const [sessionExpired, setSessionExpired] = useState<boolean>(false);

    const isRefreshing = useRef<boolean>(false);
    const failedQueue = useRef<FailedRequest[]>([]);
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

    const processQueue = (error: Error | null, newToken: string | null = null) => {
        failedQueue.current.forEach(promise => {
            if (error) promise.reject(error);
            else if (newToken) promise.resolve(newToken);
            else promise.reject(new Error("Token refresh failed silently."));
        });
        failedQueue.current = [];
    };

    const isTokenExpired = useCallback((tokenToCheck: string | null): boolean => {
        if (!tokenToCheck) return true;
        const decoded = parseJwt(tokenToCheck);
        if (!decoded?.exp) return true;
        return decoded.exp * 1000 < Date.now();
    }, []);

    const getTimeUntilExpiry = useCallback((tokenToCheck: string | null): number => {
        if (!tokenToCheck) return 0;
        const decoded = parseJwt(tokenToCheck);
        if (!decoded?.exp) return 0;
        return (decoded.exp * 1000) - Date.now();
    }, []);

    const handleSessionExpired = useCallback(() => {
        logAuthAction('Session expired - logging out');
        localStorage.removeItem(AUTH_CONFIG.tokenKey);
        localStorage.removeItem(AUTH_CONFIG.refreshTokenKey);
        delete authAxios.defaults.headers.common["Authorization"];
        setToken(null);
        setRefreshToken(null);
        setUser(null);
        setSessionExpired(true);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
    }, []);

    // Function to determine the correct base URL for direct calls
    const getDirectApiUrl = useCallback((path: string) => {
        if (!path.startsWith('/')) {
            console.error(`Path "${path}" must start with /`);
            path = `/${path}`;
        }
        if (!path.startsWith('/api')) {
             console.error(`Direct API call path "${path}" should likely start with /api`);
             // Decide whether to auto-prefix or throw error
             path = `/api${path}`;
        }
        // Use explicit backend URL in dev, use configured API_BASE_URL (which includes /api) in prod
        const base = process.env.NODE_ENV === 'production' ? API_BASE_URL : DEV_BACKEND_URL;
        // Ensure base doesn't end with /api if path already starts with /api
        const cleanBase = base.endsWith('/api') ? base.substring(0, base.length - 4) : base;
        return `${cleanBase}${path}`;
    }, []);


    const setupTokenRefreshTimer = useCallback(() => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;

        if (!token || !refreshToken) return;

        const timeUntilExpiry = getTimeUntilExpiry(token);
        if (timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD_MS) {
             logAuthAction('Token expiry near or passed, rely on interceptor');
             return;
        }
        const refreshTime = timeUntilExpiry - TOKEN_REFRESH_THRESHOLD_MS;

        refreshTimerRef.current = setTimeout(async () => {
            if (token && refreshToken && !isRefreshing.current) {
                logAuthAction('Proactive token refresh attempt');
                isRefreshing.current = true;
                try {
                    // Corrected: Use getDirectApiUrl for the explicit backend URL
                    const refreshUrl = getDirectApiUrl('/auth/refresh-token');
                    logAuthAction('Proactive refresh URL', { url: refreshUrl });

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
                    authAxios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
                    logAuthAction('Token proactively refreshed');
                    processQueue(null, newToken);
                    setupTokenRefreshTimer();
                } catch (error) {
                    const axiosError = error as AxiosError;
                    logAuthAction('Proactive token refresh failed', { error: axiosError.message, status: axiosError.response?.status });
                    processQueue(axiosError, null);
                    if (axiosError.response?.status === 401) handleSessionExpired();
                } finally {
                    isRefreshing.current = false;
                }
            }
        }, refreshTime);
        logAuthAction('Token refresh scheduled', { minutesUntilRefresh: Math.floor(refreshTime / 60000) });
    }, [token, refreshToken, getTimeUntilExpiry, handleSessionExpired, getDirectApiUrl]); // Added getDirectApiUrl dependency


    // Setup Axios interceptors for authAxios (the proxied instance)
    useEffect(() => {
        const requestInterceptor = authAxios.interceptors.request.use(
            (config) => {
                // URLs here should start with /api/
                if (!config.url?.startsWith('/api')) {
                     console.warn(`AuthAxios request URL "${config.url}" is missing /api prefix for proxy.`);
                 }
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

        const responseInterceptor = authAxios.interceptors.response.use(
            response => response,
            async (error: AxiosError) => { // Type error
                const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

                if (error.response?.status !== 401 || originalRequest._retry || !originalRequest) {
                    return Promise.reject(error);
                }
                originalRequest._retry = true;

                if (isRefreshing.current) {
                     logAuthAction('Request queued (authAxios)', { url: originalRequest.url });
                    return new Promise<string>((resolve, reject) => {
                        failedQueue.current.push({ resolve, reject });
                    }).then(newToken => {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return authAxios(originalRequest);
                    }).catch(err => Promise.reject(err));
                }

                isRefreshing.current = true;
                logAuthAction('Attempting token refresh (authAxios)', { url: originalRequest.url });

                if (!refreshToken) {
                    logAuthAction('Refresh failed: No refresh token');
                    isRefreshing.current = false;
                    handleSessionExpired();
                    return Promise.reject(error);
                }

                try {
                    // Corrected: Use getDirectApiUrl for the explicit backend URL
                    const refreshUrl = getDirectApiUrl('/auth/refresh-token');
                    logAuthAction('401 refresh URL (authAxios)', { url: refreshUrl });

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
                    authAxios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

                    processQueue(null, newToken);
                    setupTokenRefreshTimer();
                    logAuthAction('Token refresh success after 401 (authAxios)');

                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return authAxios(originalRequest);

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
            authAxios.interceptors.request.eject(requestInterceptor);
            authAxios.interceptors.response.eject(responseInterceptor);
        };
    }, [token, refreshToken, isTokenExpired, handleSessionExpired, setupTokenRefreshTimer, getDirectApiUrl]); // Added getDirectApiUrl


    useEffect(() => {
         setupTokenRefreshTimer();
         return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
    }, [setupTokenRefreshTimer]);

    // Load user data
    useEffect(() => {
        const loadUser = async () => {
            if (token && typeof token === 'string' && token.split('.').length === 3) {
                 setIsLoading(true);
                try {
                    // Corrected: Use path starting with /api for proxied authAxios
                    const response = await authAxios.get<ProfileResponse>('/api/auth/profile');
                     if (response.data?.user) {
                         setUser(response.data.user);
                         if (sessionExpired) setSessionExpired(false);
                         logAuthAction('User profile loaded', { userId: response.data.user.id });
                     } else {
                         logAuthAction('Profile loaded but no user data');
                         handleSessionExpired();
                     }
                } catch (error) {
                    const axiosError = error as AxiosError;
                     logAuthAction('Error loading user', { error: axiosError.message, status: axiosError.response?.status });
                     if (isTokenExpired(token) && !isRefreshing.current) {
                         handleSessionExpired();
                     }
                } finally {
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
                setUser(null);
            }
        };
        loadUser();
    }, [token, handleSessionExpired, isTokenExpired, sessionExpired]); // Rerun if token changes


    // --- Auth Functions ---
    const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; user: User }> => {
        try {
            logAuthAction('Login attempt', { username });
            // Corrected: Use getDirectApiUrl for direct axios call
            const loginUrl = getDirectApiUrl('/auth/login');
            const response = await axios.post<LoginResponse>(
                loginUrl,
                { username, password },
                { withCredentials: true, timeout: 15000 }
            );
            const { token: newToken, refreshToken: newRefreshToken, user: loggedInUser } = response.data;

            setSessionExpired(false);
            localStorage.setItem(AUTH_CONFIG.tokenKey, newToken);
            localStorage.setItem(AUTH_CONFIG.refreshTokenKey, newRefreshToken);
            setToken(newToken);
            setRefreshToken(newRefreshToken);
            setUser(loggedInUser);
            authAxios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

            logAuthAction('Login success', { userId: loggedInUser.id });
            return { success: true, user: loggedInUser };
        } catch (error) {
            const axiosError = error as AxiosError<{ message?: string }>;
            logAuthAction('Login error', { error: axiosError.message, status: axiosError.response?.status });
            throw new Error(axiosError.response?.data?.message || "Login failed. Check credentials/network.");
        }
    }, [getDirectApiUrl]); // Added getDirectApiUrl

    const register = useCallback(async (userData: any): Promise<{ success: boolean; user: User }> => {
        try {
            logAuthAction('Registration attempt');
            // Corrected: Use getDirectApiUrl for direct axios call
            const registerUrl = getDirectApiUrl('/auth/register');
            const response = await axios.post<RegisterResponse>(
                registerUrl,
                userData,
                { withCredentials: true, timeout: 15000 }
            );
            const { token: newToken, refreshToken: newRefreshToken, user: registeredUser } = response.data;

            setSessionExpired(false);
            localStorage.setItem(AUTH_CONFIG.tokenKey, newToken);
            localStorage.setItem(AUTH_CONFIG.refreshTokenKey, newRefreshToken);
            setToken(newToken);
            setRefreshToken(newRefreshToken);
            setUser(registeredUser);
            authAxios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

            logAuthAction('Registration success', { userId: registeredUser.id });
            return { success: true, user: registeredUser };
        } catch (error) {
             const axiosError = error as AxiosError<{ message?: string; errors?: { field: string, message: string }[] }>;
             logAuthAction('Registration error', { error: axiosError.message, status: axiosError.response?.status });
              if (axiosError.response?.data?.errors) {
                 const errorMessage = axiosError.response.data.errors.map(err => `${err.field}: ${err.message}`).join(", ");
                 throw new Error(`Validation error: ${errorMessage}`);
             }
             throw new Error(axiosError.response?.data?.message || "Registration failed.");
        }
    }, [getDirectApiUrl]); // Added getDirectApiUrl

    const logout = useCallback(async (): Promise<void> => {
        logAuthAction('Logout attempt');
        try {
             if (token && refreshToken) {
                 // Corrected: Use path starting with /api for proxied authAxios
                 await authAxios.post("/api/auth/logout");
             }
        } catch (error) {
            const axiosError = error as AxiosError;
            logAuthAction('Logout API error', { error: axiosError.message, status: axiosError.response?.status });
        } finally {
            // Ensure local state is always cleared
            handleSessionExpired(); // Use handleSessionExpired to centralize cleanup
            logAuthAction('Logout completed');
        }
    }, [token, refreshToken, handleSessionExpired]); // Use handleSessionExpired

    const isAuthenticated = useCallback((): boolean => {
        return !!token && typeof token === 'string' && token.split('.').length === 3 && !isTokenExpired(token) && !!user;
    }, [token, user, isTokenExpired]);

    const updateProfile = useCallback(async (userData: Partial<User>): Promise<{ success: boolean; user: User }> => {
        try {
            // Corrected: Use path starting with /api for proxied authAxios
            const response = await authAxios.put<ProfileResponse>("/api/auth/profile", userData);
            setUser(response.data.user);
            logAuthAction('Profile updated', { userId: response.data.user.id });
            return { success: true, user: response.data.user };
        } catch (error) {
             const axiosError = error as AxiosError<{ message?: string; errors?: { field: string, message: string }[] }>;
             logAuthAction('Update profile error', { error: axiosError.message, status: axiosError.response?.status });
             if (axiosError.response?.data?.errors) {
                 const errorMessage = axiosError.response.data.errors.map(err => `${err.field}: ${err.message}`).join(", ");
                 throw new Error(`Validation error: ${errorMessage}`);
             }
             throw new Error(axiosError.response?.data?.message || "Failed to update profile.");
        }
    }, []);

    const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
        try {
            // Corrected: Use path starting with /api for proxied authAxios
            await authAxios.put("/api/auth/password", { currentPassword, newPassword });
            logAuthAction('Password changed successfully');
            return { success: true, message: "Password changed successfully" };
        } catch (error) {
             const axiosError = error as AxiosError<{ message?: string }>;
             logAuthAction('Change password error', { error: axiosError.message, status: axiosError.response?.status });
             throw new Error(axiosError.response?.data?.message || "Failed to change password.");
        }
    }, []);


    // --- Context Value ---
    const value: AuthContextType = {
        user,
        isLoading,
        token,
        authAxios, // Provide the configured instance
        login,
        register,
        logout,
        isAuthenticated,
        updateProfile,
        changePassword,
        sessionExpired,
        handleSessionExpired, // Expose centralized cleanup
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