/**
 * Utility functions for secure cookie management
 */

// Cookie configuration
const COOKIE_CONFIG = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

/**
 * Set a secure cookie
 */
export const setCookie = (name: string, value: string, options: Partial<typeof COOKIE_CONFIG> = {}) => {
  const config = { ...COOKIE_CONFIG, ...options };
  
  let cookieString = `${name}=${value}`;
  
  if (config.maxAge) {
    cookieString += `; Max-Age=${Math.floor(config.maxAge / 1000)}`;
  }
  
  if (config.path) {
    cookieString += `; Path=${config.path}`;
  }
  
  if (config.httpOnly) {
    cookieString += '; HttpOnly';
  }
  
  if (config.secure) {
    cookieString += '; Secure';
  }
  
  if (config.sameSite) {
    cookieString += `; SameSite=${config.sameSite}`;
  }
  
  document.cookie = cookieString;
};

/**
 * Get a cookie value
 */
export const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue || null;
  }
  
  return null;
};

/**
 * Remove a cookie
 */
export const removeCookie = (name: string, path: string = '/') => {
  document.cookie = `${name}=; Path=${path}; Expires=Thu, 01 Jan 1970 00:00:01 GMT; HttpOnly; Secure; SameSite=Strict`;
};

/**
 * Clear all authentication cookies
 */
export const clearAuthCookies = () => {
  removeCookie('apphub_access_token');
  removeCookie('apphub_refresh_token');
  removeCookie('apphub_user');
  removeCookie('apphub_session_id');
};

/**
 * Set authentication cookies
 */
export const setAuthCookies = (data: {
  accessToken: string;
  refreshToken: string;
  user: any;
  sessionId: string;
  expiresIn: number;
}) => {
  // Set access token (short-lived)
  setCookie('apphub_access_token', data.accessToken, {
    maxAge: data.expiresIn * 1000, // Convert to milliseconds
  });
  
  // Set refresh token (long-lived)
  setCookie('apphub_refresh_token', data.refreshToken, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  
  // Set user data
  setCookie('apphub_user', JSON.stringify(data.user), {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  
  // Set session ID
  setCookie('apphub_session_id', data.sessionId, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * Get authentication data from cookies
 */
export const getAuthFromCookies = () => {
  const accessToken = getCookie('apphub_access_token');
  const refreshToken = getCookie('apphub_refresh_token');
  const userStr = getCookie('apphub_user');
  const sessionId = getCookie('apphub_session_id');
  
  let user = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user from cookie:', error);
    }
  }
  
  return {
    accessToken,
    refreshToken,
    user,
    sessionId,
    isAuthenticated: !!(accessToken && refreshToken && user)
  };
};

/**
 * Update access token cookie
 */
export const updateAccessToken = (accessToken: string, expiresIn: number) => {
  setCookie('apphub_access_token', accessToken, {
    maxAge: expiresIn * 1000, // Convert to milliseconds
  });
};
