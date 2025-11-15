import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';


passport.use(
  new LocalStrategy(
    {
      usernameField: 'name',
      passwordField: 'password',
    },
    async (name, password, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { name },
        });

        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: 'Incorrect password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
