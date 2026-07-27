import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { registerSchema, loginSchema, updateProfileSchema } from '@orbito/shared';
import { prisma } from '../../lib/prisma';
import { AppError, asyncHandler, validateBody } from '../../lib/errors';
import {
  requireAuth,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../lib/auth';

const router = Router();

const DEFAULT_COLUMNS = [
  { name: 'Backlog', color: '#64748B' },
  { name: 'To Do', color: '#6366F1' },
  { name: 'Development', color: '#6366F1' },
  { name: 'Code Review', color: '#8B5CF6' },
  { name: 'Testing', color: '#F97316' },
  { name: 'Done', color: '#22C55E' },
];

router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, workspaceName } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash },
      });
      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          ownerId: user.id,
          members: { create: { userId: user.id, role: 'OWNER' } },
        },
      });
      return { user, workspace };
    });

    const authUser = { id: result.user.id, email: result.user.email, name: result.user.name };
    const accessToken = signAccessToken(authUser);
    const refreshToken = signRefreshToken(result.user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { userId: result.user.id, token: refreshToken, expiresAt },
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      user: authUser,
      accessToken,
      workspace: result.workspace,
    });
  })
);

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

    const authUser = { id: user.id, email: user.email, name: user.name };
    const accessToken = signAccessToken(authUser);
    const refreshToken = signRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt },
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: true },
    });

    res.json({
      user: authUser,
      accessToken,
      workspaces: memberships.map((m) => ({ ...m.workspace, role: m.role })),
    });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = (req.cookies?.refreshToken as string) || (req.body.refreshToken as string);
    if (!token) throw new AppError('Refresh token required', 401, 'UNAUTHORIZED');

    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED');
    }

    try {
      verifyRefreshToken(token);
    } catch {
      throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED');
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

    const authUser = { id: user.id, email: user.email, name: user.name };
    const accessToken = signAccessToken(authUser);
    res.json({ accessToken, user: authUser });
  })
);

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken as string | undefined;
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }
    res.clearCookie('refreshToken');
    res.json({ ok: true });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
    });
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.user!.id },
      include: { workspace: true },
    });
    res.json({
      user,
      workspaces: memberships.map((m) => ({ ...m.workspace, role: m.role })),
    });
  })
);

router.patch(
  '/me',
  requireAuth,
  validateBody(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name: req.body.name },
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
    });
    res.json({ user });
  })
);

export { DEFAULT_COLUMNS };
export default router;
