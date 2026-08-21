import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { prisma } from './prisma';
import { AppError } from './errors';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const accessSecret = () => process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

export function signAccessToken(user: AuthUser) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    accessSecret(),
    { expiresIn: (process.env.JWT_ACCESS_EXPIRES || '15m') as jwt.SignOptions['expiresIn'] }
  );
}

export function signRefreshToken(userId: string) {
  return jwt.sign(
    { sub: userId },
    refreshSecret(),
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES || '7d') as jwt.SignOptions['expiresIn'] }
  );
}

export function verifyAccessToken(token: string): AuthUser {
  const payload = jwt.verify(token, accessSecret()) as jwt.JwtPayload;
  return { id: payload.sub as string, email: payload.email as string, name: payload.name as string };
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, refreshSecret()) as jwt.JwtPayload;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
  }
  try {
    // Trust a valid JWT for request auth (avoids a DB round-trip on every API call).
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401, 'TOKEN_EXPIRED'));
  }
}

export async function requireWorkspaceMember(
  workspaceId: string,
  userId: string,
  roles?: Array<'OWNER' | 'ADMIN' | 'MEMBER'>
) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) throw new AppError('Forbidden', 403, 'FORBIDDEN');
  if (roles && !roles.includes(member.role)) {
    throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
  }
  return member;
}
