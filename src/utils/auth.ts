import { Request } from 'express';
import { User as PrismaUser } from '@prisma/client';

export const getUserId = (req: Request): string => {
  return (req.user as PrismaUser).id;
};
