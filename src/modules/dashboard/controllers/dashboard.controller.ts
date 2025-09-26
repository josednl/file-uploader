import { Request, Response } from 'express';
import { PrismaClient, User as PrismaUser } from '@prisma/client';
const prisma = new PrismaClient();

export async function renderDashboard(req: Request, res: Response) {
  try {
    const ownerId = (req.user as PrismaUser)?.id;

    const folders = await prisma.folder.findMany({
      where: { ownerId: ownerId },
      orderBy: { createdAt: 'desc' },
    });

    res.render('dashboard/index', {
      folders,
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Error loading dashboard');
    res.redirect('/');
  }
}
