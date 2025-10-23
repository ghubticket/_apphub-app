import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import Session from '../models/Session';

/**
 * Middleware para autenticação via cookies
 */
export const authenticateWithCookies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accessToken = req.cookies?.apphub_access_token;
    const refreshToken = req.cookies?.apphub_refresh_token;
    const sessionId = req.cookies?.apphub_session_id;

    if (!accessToken && !refreshToken) {
      return next(); // Continue without authentication
    }

    // Try to verify access token first
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as any;
        
        if (decoded.type === 'access') {
          const user = await User.findById(decoded.userId);
          
          if (user && user.isActive) {
            req.user = user;
            return next();
          }
        }
      } catch (error) {
        // Access token invalid, try refresh token
        console.log('Access token invalid, trying refresh token...');
      }
    }

    // Try refresh token if access token failed
    if (refreshToken && sessionId) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
        
        if (decoded.type === 'refresh') {
          // Check if session is still active
          const session = await Session.findOne({
            _id: sessionId,
            refreshToken,
            isActive: true,
            expiresAt: { $gt: new Date() }
          }).populate('userId');

          if (session) {
            const user = session.userId as any;
            
            if (user && user.isActive) {
              // Update session activity
              session.lastActivity = new Date();
              await session.save();

              // Generate new access token
              const newAccessToken = jwt.sign(
                {
                  userId: String(user._id),
                  email: user.email,
                  role: user.role,
                  type: 'access'
                },
                process.env.JWT_SECRET!,
                { expiresIn: '15m' }
              );

              // Set new access token in cookie
              res.cookie('apphub_access_token', newAccessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000, // 15 minutes
                path: '/'
              });

              req.user = user;
              return next();
            }
          }
        }
      } catch (error) {
        console.log('Refresh token invalid:', error);
      }
    }

    // Clear invalid cookies
    res.clearCookie('apphub_access_token');
    res.clearCookie('apphub_refresh_token');
    res.clearCookie('apphub_user');
    res.clearCookie('apphub_session_id');

    return next(); // Continue without authentication
  } catch (error) {
    console.error('Cookie authentication error:', error);
    return next(); // Continue without authentication
  }
};

/**
 * Middleware para requerer autenticação via cookies
 */
export const requireAuthWithCookies = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Acesso negado',
      errors: ['Token de acesso necessário']
    });
  }
  next();
};
