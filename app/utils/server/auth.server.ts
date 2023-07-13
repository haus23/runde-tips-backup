import type { SessionStorage, SessionData } from '@remix-run/node';
import { Authenticator, Strategy, type AuthenticateOptions } from 'remix-auth';
import { type User } from '~/model/User';
import { sessionStorage } from './session.server';
import { invariant } from '../misc';
import { db, modelConverter } from './db.server';
import type { Account } from '~/model/Account';
import { generateTOTP, verifyTOTP } from './totp.server';

type OtpStrategyVerifyParams = {
  email: string;
  otp: string;
};

const authenticator = new Authenticator<User>(sessionStorage, {
  sessionKey: 'user',
});

export async function getUser(request: Request) {
  return await authenticator.isAuthenticated(request);
}

export async function findAccountByEmail(email: string) {
  const qs = await db
    .collection('accounts')
    .where('email', '==', email)
    .limit(1)
    .withConverter(modelConverter<Account>())
    .get();

  return qs.size === 1 ? qs.docs[0].data() : undefined;
}

export async function ensureCodeRequest(email: string) {
  const qs = await db
    .collection('accounts')
    .where('email', '==', email)
    .limit(1)
    .withConverter(modelConverter<Account>())
    .get();

  if (qs.size !== 1) {
    return false;
  }

  const account = qs.docs[0].data();
  if (!account.otpSecret || !account.secretExpiresAt) {
    return false;
  }

  return true;
}

export async function createLoginCode(account: Account) {
  const { otp, secret, period } = generateTOTP({
    algorithm: 'SHA256',
    period: 10 * 30,
  });

  account.otpSecret = secret;
  account.secretExpiresAt = new Date(Date.now() + period * 1000).toISOString();
  await db.doc(`accounts/${account.id}`).set(account);

  return otp;
}

class OtpStrategy extends Strategy<User, OtpStrategyVerifyParams> {
  name = 'otp';

  async authenticate(
    request: Request,
    sessionStorage: SessionStorage<SessionData, SessionData>,
    options: AuthenticateOptions,
  ): Promise<User> {
    const form = await request.formData();
    const email = form.get('email');
    const otp = form.get('otp');

    invariant(typeof email === 'string', 'email must be a string');
    invariant(typeof otp === 'string', 'email must be a string');

    try {
      let user = await this.verify({ email, otp });
      return this.success(user, request, sessionStorage, options);
    } catch (error) {
      if (error instanceof Error) {
        return await this.failure(
          error.message,
          request,
          sessionStorage,
          options,
          error,
        );
      }
      return await this.failure(
        'Unknown error',
        request,
        sessionStorage,
        options,
        new Error(JSON.stringify(error, null, 2)),
      );
    }
  }
}

authenticator.use(
  new OtpStrategy(async ({ email, otp }) => {
    const qs = await db
      .collection('accounts')
      .where('email', '==', email)
      .limit(1)
      .withConverter(modelConverter<Account>())
      .get();

    let account = qs.docs[0].data();

    // Clear secret from account (if any)
    // Due to security issues only one try is allowed
    const { otpSecret, secretExpiresAt, ...clearedAccount } = account;
    await db.doc(`accounts/${account.id}`).set(clearedAccount);

    if (!account.secretExpiresAt || !account.otpSecret) {
      throw new Error('Es liegt kein Anmeldeversuch vor.');
    }

    if (new Date().toISOString() > account.secretExpiresAt) {
      throw new Error(
        'Dieser Code ist abgelaufen. Du musst einen neuen anfordern.',
      );
    }

    const result = verifyTOTP({
      otp,
      secret: account.otpSecret,
      algorithm: 'SHA256',
      period: 10 * 30,
      window: 1,
    });

    if (!result) {
      throw new Error('Ungültiger Code. Du musst einen neuen anfordern.');
    }

    const user = { id: account.id, name: account.name, email: account.email };

    return user;
  }),
  OtpStrategy.name,
);

export { authenticator, OtpStrategy, type User, type OtpStrategyVerifyParams };
