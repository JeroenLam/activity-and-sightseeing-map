import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import * as userService from '../services/userService';

export function configurePassport(dataDir: string): void {
    // Local strategy
    passport.use(
        new LocalStrategy(
            { usernameField: 'email' },
            async (email, password, done) => {
                try {
                    const user = await userService.findByEmail(dataDir, email);
                    if (!user) return done(null, false, { message: 'Invalid credentials' });
                    const valid = await userService.verifyPassword(user, password);
                    if (!valid) return done(null, false, { message: 'Invalid credentials' });
                    return done(null, user);
                } catch (err) {
                    return done(err);
                }
            }
        )
    );

    // Google OAuth (only if configured)
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        passport.use(
            new GoogleStrategy(
                {
                    clientID: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    callbackURL: `${process.env.OAUTH_CALLBACK_URL || 'http://localhost:3000'}/api/auth/google/callback`,
                },
                async (_accessToken, _refreshToken, profile, done) => {
                    try {
                        const email =
                            profile.emails?.[0]?.value ?? `${profile.id}@google.oauth`;
                        let user = await userService.findByOAuth(
                            dataDir,
                            'google',
                            profile.id
                        );
                        if (!user) {
                            user = await userService.createOAuthUser(
                                dataDir,
                                'google',
                                profile.id,
                                email,
                                profile.displayName || email
                            );
                        }
                        return done(null, user);
                    } catch (err) {
                        return done(err as Error);
                    }
                }
            )
        );
    }

    // GitHub OAuth (only if configured)
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
        passport.use(
            new GitHubStrategy(
                {
                    clientID: process.env.GITHUB_CLIENT_ID,
                    clientSecret: process.env.GITHUB_CLIENT_SECRET,
                    callbackURL: `${process.env.OAUTH_CALLBACK_URL || 'http://localhost:3000'}/api/auth/github/callback`,
                },
                async (
                    _accessToken: string,
                    _refreshToken: string,
                    profile: any,
                    done: any
                ) => {
                    try {
                        const email =
                            profile.emails?.[0]?.value ?? `${profile.id}@github.oauth`;
                        let user = await userService.findByOAuth(
                            dataDir,
                            'github',
                            profile.id
                        );
                        if (!user) {
                            user = await userService.createOAuthUser(
                                dataDir,
                                'github',
                                profile.id,
                                email,
                                profile.displayName || profile.username || email
                            );
                        }
                        return done(null, user);
                    } catch (err) {
                        return done(err as Error);
                    }
                }
            )
        );
    }
}
