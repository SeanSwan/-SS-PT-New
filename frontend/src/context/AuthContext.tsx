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
// API_BASE_URL is 'https://swanstudios.onrender.com' in production (verified from config below)
import { API_BASE_URL, AUTH_CONFIG, DEV_BACKEND_URL } from "../config"; // Import DEV_BACKEND_URL

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
// DEV_BACKEND_URL is imported from config now

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
                const displayUrl = config.url?.startsWith('/') ? config.url : `/${config.url}`;
                console.log(`🚀 Request (via authAxios): ${config.method?.toUpperCase()} ${displayUrl}`);
            }
            // Ensure path starts with /api when using the proxied instance
            if (config.url && !config.url.startsWith('/api')) {
                console.warn(`AuthAxios request URL "${config.url}" is missing /api prefix for proxy. Prepending '/api'.`);
                config.url = `/api${config.url.startsWith('/') ? config.url : '/' + config.url}`;
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
        // Add a small buffer (e.g., 5 seconds) to account for clock skew/latency
        const bufferSeconds = 5;
        return decoded.exp * 1000 < Date.now() + (bufferSeconds * 1000);
    }, []);

    const getTimeUntilExpiry = useCallback((tokenToCheck: string | null): number => {
        if (!tokenToCheck) return 0;
        const decoded = parseJwt(tokenToCheck);
        if (!decoded?.exp) return 0;
        return Math.max(0, (decoded.exp * 1000) - Date.now()); // Ensure non-negative
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

    // --- UPDATED getDirectApiUrl ---
    // Function to determine the correct base URL for direct calls (login, register, refresh)
    const getDirectApiUrl = useCallback((path: string): string => {
        // Ensure path starts with a single slash
        if (!path.startsWith('/')) {
            path = `/${path}`;
        }

        // ALWAYS ensure path starts with /api - this is critical for proxy to work
        if (!path.startsWith('/api')) {
            logAuthAction(`Prepending /api to direct API call path "${path}"`);
            path = `/api${path}`; 
        }

        // Just return the relative path - no need for base URL anymore as we're using proxy
        logAuthAction('Using relative API path for proxy', { path });
        return path;

    }, []); // No external dependencies needed
    // --- END UPDATED getDirectApiUrl ---

    const setupTokenRefreshTimer = useCallback(() => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;

        if (!token || !refreshToken) return;

        const timeUntilExpiry = getTimeUntilExpiry(token);
        // Refresh slightly earlier than the threshold to be safe
        const safeRefreshThreshold = TOKEN_REFRESH_THRESHOLD_MS * 1.1;

        if (timeUntilExpiry <= safeRefreshThreshold) {
             logAuthAction('Token expiry near or passed, rely on interceptor');
             return;
        }
        const refreshTime = Math.max(0, timeUntilExpiry - safeRefreshThreshold); // Ensure non-negative timeout

        refreshTimerRef.current = setTimeout(async () => {
            if (token && refreshToken && !isRefreshing.current) {
                logAuthAction('Proactive token refresh attempt');
                isRefreshing.current = true;
                try {
                    // Use the relative path returned by getDirectApiUrl
                    const refreshUrl = getDirectApiUrl('/api/auth/refresh-token'); 
                    logAuthAction('Proactive refresh URL', { url: refreshUrl });

                    const response = await axios.post<RefreshTokenResponse>(
                        refreshUrl,
                        { refreshToken },
                        {
                           withCredentials: true,
                           timeout: 15000,
                           headers: {
                              'Content-Type': 'application/json',
                              'Accept': 'application/json'
                           }
                        }
                    );
                    const { token: newToken, refreshToken: newRefreshToken } = response.data;
                    localStorage.setItem(AUTH_CONFIG.tokenKey, newToken);
                    localStorage.setItem(AUTH_CONFIG.refreshTokenKey, newRefreshToken);
                    setToken(newToken);
                    setRefreshToken(newRefreshToken);
                    authAxios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
                    logAuthAction('Token proactively refreshed');
                    processQueue(null, newToken);
                    setupTokenRefreshTimer(); // Reschedule next refresh
                } catch (error) {
                    const axiosError = error as AxiosError;
                    logAuthAction('Proactive token refresh failed', { error: axiosError.message, status: axiosError.response?.status });
                    processQueue(axiosError, null);
                    // Only expire session on 401/403 during proactive refresh
                    if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
                        handleSessionExpired();
                    }
                } finally {
                    isRefreshing.current = false;
                }
            }
        }, refreshTime);
        logAuthAction('Token refresh scheduled', { minutesUntilRefresh: Math.floor(refreshTime / 60000) });
    }, [token, refreshToken, getTimeUntilExpiry, handleSessionExpired, getDirectApiUrl]);


    // Setup Axios interceptors for authAxios (the proxied instance)
    useEffect(() => {
        const requestInterceptor = authAxios.interceptors.request.use(
            (config) => {
                // The createAxiosInstance interceptor already handles prepending /api if missing
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
            async (error: AxiosError) => {
                const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

                // Check if it's a 401, not already retried, and request config exists
                if (error.response?.status !== 401 || originalRequest._retry || !originalRequest) {
                    return Promise.reject(error);
                }
                originalRequest._retry = true;

                // If already refreshing, queue the request
                if (isRefreshing.current) {
                     logAuthAction('Request queued due to ongoing refresh (authAxios)', { url: originalRequest.url });
                    return new Promise<string>((resolve, reject) => {
                        failedQueue.current.push({ resolve, reject });
                    }).then(newToken => {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return authAxios(originalRequest); // Retry with new token
                    }).catch(err => Promise.reject(err)); // If queue processing failed
                }

                // Start refreshing
                isRefreshing.current = true;
                logAuthAction('Attempting token refresh after 401 (authAxios)', { url: originalRequest.url });

                // Ensure refresh token exists
                if (!refreshToken) {
                    logAuthAction('Refresh failed: No refresh token available after 401');
                    isRefreshing.current = false;
                    handleSessionExpired(); // Log out user
                    return Promise.reject(error); // Reject original request
                }

                try {
                    // Use the relative path returned by getDirectApiUrl
                    const refreshUrl = getDirectApiUrl('/api/auth/refresh-token');
                    logAuthAction('401 refresh URL (authAxios)', { url: refreshUrl });

                    const response = await axios.post<RefreshTokenResponse>(
                         refreshUrl,
                         { refreshToken },
                         {
                            withCredentials: true,
                            timeout: 15000,
                            headers: {
                               'Content-Type': 'application/json',
                               'Accept': 'application/json'
                            }
                         }
                     );
                    const { token: newToken, refreshToken: newRefreshToken } = response.data;

                    // Update state and storage
                    localStorage.setItem(AUTH_CONFIG.tokenKey, newToken);
                    localStorage.setItem(AUTH_CONFIG.refreshTokenKey, newRefreshToken);
                    setToken(newToken);
                    setRefreshToken(newRefreshToken);
                    authAxios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

                    // Process any queued requests
                    processQueue(null, newToken);
                    // Reschedule the proactive refresh timer
                    setupTokenRefreshTimer();
                    logAuthAction('Token refresh success after 401 (authAxios)');

                    // Retry the original request with the new token
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return authAxios(originalRequest);

                } catch (refreshError) {
                    const axiosRefreshError = refreshError as AxiosError;
                    logAuthAction('Token refresh failed after 401 (authAxios)', { error: axiosRefreshError.message, status: axiosRefreshError.response?.status });
                    // Reject queued requests
                    processQueue(axiosRefreshError, null);
                    // Log out user
                    handleSessionExpired();
                    // Reject the original request that triggered the refresh
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
    }, [token, refreshToken, isTokenExpired, handleSessionExpired, setupTokenRefreshTimer, getDirectApiUrl]);


    useEffect(() => {
         setupTokenRefreshTimer();
         // Cleanup timer on unmount
         return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
    }, [setupTokenRefreshTimer]);

    // Load user data on initial mount or when token changes
    useEffect(() => {
        const loadUser = async () => {
            // Check for valid token structure before attempting to load
            if (token && typeof token === 'string' && token.split('.').length === 3 && !isTokenExpired(token)) {
                 setIsLoading(true);
                try {
                    // Use path starting with /api for proxied authAxios
                    const response = await authAxios.get<ProfileResponse>('/api/auth/profile');
                     if (response.data?.user) {
                         setUser(response.data.user);
                         // Reset sessionExpired flag if profile load succeeds
                         if (sessionExpired) setSessionExpired(false);
                         logAuthAction('User profile loaded', { userId: response.data.user.id });
                     } else {
                         logAuthAction('Profile loaded but no user data returned');
                         handleSessionExpired(); // Treat as session invalid
                     }
                } catch (error) {
                    const axiosError = error as AxiosError;
                     logAuthAction('Error loading user profile', { error: axiosError.message, status: axiosError.response?.status });
                     // If profile load fails (e.g., 401 even after potential refresh), expire session
                     // Avoid expiring if it was just a network error and token is still technically valid
                     if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
                         handleSessionExpired();
                     }
                     // If token is definitely expired and not refreshing, expire session
                     else if (isTokenExpired(token) && !isRefreshing.current) {
                         handleSessionExpired();
                     }
                } finally {
                    setIsLoading(false);
                }
            } else {
                // No valid token found, ensure user is null and loading is false
                setIsLoading(false);
                if (user) setUser(null); // Clear user if token becomes invalid
                // Don't call handleSessionExpired here unless there was a token that just became invalid
                if (token) { // If there was a token but it's now invalid/expired
                  handleSessionExpired();
                }
            }
        };
        loadUser();
        // Dependencies: Rerun if token changes, or if sessionExpired state changes
    }, [token, handleSessionExpired, isTokenExpired, sessionExpired, user]);


    // --- Auth Functions ---

    // --- UPDATED login function ---
    const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; user: User }> => {
        try {
            logAuthAction('Login attempt', { username });

            // Get relative path for login
            const loginUrl = getDirectApiUrl('/api/auth/login');
            logAuthAction('Login URL', { url: loginUrl });

            const response = await axios.post<LoginResponse>(
                loginUrl,
                { username, password },
                {
                    withCredentials: true,
                    timeout: 15000,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );
            const { token: newToken, refreshToken: newRefreshToken, user: loggedInUser } = response.data;

            setSessionExpired(false); // Reset session expired flag on successful login
            localStorage.setItem(AUTH_CONFIG.tokenKey, newToken);
            localStorage.setItem(AUTH_CONFIG.refreshTokenKey, newRefreshToken);
            setToken(newToken);
            setRefreshToken(newRefreshToken);
            setUser(loggedInUser);
            authAxios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

            logAuthAction('Login success', { userId: loggedInUser.id });
            setupTokenRefreshTimer(); // Setup timer after successful login
            return { success: true, user: loggedInUser };

        } catch (error) {
            const axiosError = error as AxiosError<{ message?: string }>;
            logAuthAction('Login error', { error: axiosError.message, status: axiosError.response?.status });
            throw new Error(axiosError.response?.data?.message || "Login failed. Please check username/password and network connection.");
        }
    }, [getDirectApiUrl, setupTokenRefreshTimer]);
    // --- END UPDATED login function ---

    // --- UPDATED register function ---
    const register = useCallback(async (userData: any): Promise<{ success: boolean; user: User }> => {
        try {
            logAuthAction('Registration attempt');
            
            // Use the relative path for registration
            const registerUrl = getDirectApiUrl('/api/auth/register');
            logAuthAction('Register URL', { url: registerUrl });

            const response = await axios.post<RegisterResponse>(
                registerUrl,
                userData,
                {
                   withCredentials: true,
                   timeout: 20000,
                   headers: {
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                   }
                }
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
            setupTokenRefreshTimer(); // Setup timer after registration
            return { success: true, user: registeredUser };
        } catch (error) {
             const axiosError = error as AxiosError<{ message?: string; errors?: { field: string, message: string }[] }>;
             logAuthAction('Registration error', { error: axiosError.message, status: axiosError.response?.status, data: axiosError.response?.data });
             
             if (axiosError.response?.data?.errors) {
                 const errorMessage = axiosError.response.data.errors.map(err => `${err.field}: ${err.message}`).join(", ");
                 throw new Error(`Registration failed: ${errorMessage}`);
             }
             
             throw new Error(axiosError.response?.data?.message || "Registration failed. Please check your input and try again.");
        }
    }, [getDirectApiUrl, setupTokenRefreshTimer]);
    // --- END UPDATED register function ---

    // --- UPDATED logout function ---
    const logout = useCallback(async (): Promise<void> => {
        logAuthAction('Logout attempt');
        const currentRefreshToken = refreshToken; // Capture refreshToken before clearing state

        // Immediately clear local state and storage regardless of API call success
        handleSessionExpired(); // Centralized cleanup
        logAuthAction('Local state cleared for logout');

        // Attempt to invalidate refresh token on backend (best effort)
        if (currentRefreshToken) {
             try {
                 // Use the relative path for logout
                 const logoutUrl = getDirectApiUrl('/api/auth/logout');
                 logAuthAction('Calling backend logout', { url: logoutUrl });
                 
                 await axios.post(
                    logoutUrl,
                    { refreshToken: currentRefreshToken },
                    { withCredentials: true, timeout: 10000 }
                 );
                 
                 logAuthAction('Backend logout successful');
             } catch (error) {
                 const axiosError = error as AxiosError;
                 logAuthAction('Backend logout API error (ignored)', { error: axiosError.message, status: axiosError.response?.status });
                 // Do not block logout if backend call fails
             }
        } else {
             logAuthAction('No refresh token, skipping backend logout call');
        }
    }, [refreshToken, handleSessionExpired, getDirectApiUrl]);
    // --- END UPDATED logout function ---

    const isAuthenticated = useCallback((): boolean => {
        // Check for token existence, basic structure, non-expiry, and user object presence
        const tokenValid = !!token && typeof token === 'string' && token.split('.').length === 3 && !isTokenExpired(token);
        return tokenValid && !!user;
    }, [token, user, isTokenExpired]);

    const updateProfile = useCallback(async (userData: Partial<User>): Promise<{ success: boolean; user: User }> => {
        try {
            // Ensure path starts with /api for proxied authAxios
            const profileUrl = "/api/auth/profile";
            logAuthAction('Update profile attempt', { url: profileUrl });
            const response = await authAxios.put<ProfileResponse>(profileUrl, userData);

            if (!response.data?.user) {
                 throw new Error("Profile update response did not contain user data.");
            }
            setUser(response.data.user); // Update local user state
            logAuthAction('Profile updated successfully', { userId: response.data.user.id });
            return { success: true, user: response.data.user };
        } catch (error) {
             const axiosError = error as AxiosError<{ message?: string; errors?: { field: string, message: string }[] }>;
             logAuthAction('Update profile error', { error: axiosError.message, status: axiosError.response?.status, data: axiosError.response?.data });
             if (axiosError.response?.data?.errors) {
                 const errorMessage = axiosError.response.data.errors.map(err => `${err.field}: ${err.message}`).join(", ");
                 throw new Error(`Validation error: ${errorMessage}`);
             }
             throw new Error(axiosError.response?.data?.message || "Failed to update profile.");
        }
    }, []);

    const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
        try {
            // Ensure path starts with /api for proxied authAxios
            const passwordUrl = "/api/auth/password";
            logAuthAction('Change password attempt', { url: passwordUrl });
            // Use authAxios for authenticated request
            await authAxios.put(passwordUrl, { currentPassword, newPassword });
            logAuthAction('Password changed successfully');
            return { success: true, message: "Password changed successfully" };
        } catch (error) {
             const axiosError = error as AxiosError<{ message?: string }>;
             logAuthAction('Change password error', { error: axiosError.message, status: axiosError.response?.status, data: axiosError.response?.data });
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