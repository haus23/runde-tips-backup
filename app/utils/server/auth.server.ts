import type { SessionStorage, SessionData } from '@remix-run/node';
import { Authenticator, Strategy, type AuthenticateOptions } from 'remix-auth';
import { type User } from '~/model/User';
import { sessionStorage } from './session.server';
import { invariant } from '../misc';
import { db, modelConverter } from './db.server';
import type { Account } from '~/model/Account';
import { verifyTOTP } from './totp.server';

type OtpStrategyVerifyParams = {
  email: string;
  otp: string;
};

const authenticator = new Authenticator<User>(sessionStorage, {
  sessionKey: 'user',
});

const emailParam = 'email';
const otpParam = 'otp';

export async function getUser(request: Request) {
  return await authenticator.isAuthenticated(request);
}

class OtpStrategy extends Strategy<User, OtpStrategyVerifyParams> {
  name = 'otp';

  async authenticate(
    request: Request,
    sessionStorage: SessionStorage<SessionData, SessionData>,
    options: AuthenticateOptions
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
          error
        );
      }
      return await this.failure(
        'Unknown error',
        request,
        sessionStorage,
        options,
        new Error(JSON.stringify(error, null, 2))
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

    if (qs.size !== 1) {
      throw new Error('Unbekannte Email-Adresse');
    }

    let account = qs.docs[0].data();

    if (!account.secretExpiresAt || !account.otpSecret) {
      clearSecretFromAccount(account);
      throw new Error('Es liegt kein Anmeldeversuch vor');
    }

    if (new Date().toISOString() > account.secretExpiresAt) {
      clearSecretFromAccount(account);
      throw new Error('Code ist abgelaufen');
    }

    const result = verifyTOTP({
      otp: otp,
      secret: account.otpSecret,
      algorithm: 'SHA256',
      period: 10 * 30,
      window: 0,
    });

    if (!result) {
      throw new Error('Ungültiger Code');
    }

    clearSecretFromAccount(account);
    const user = { id: account.id, name: account.name, email: account.email };

    return user;
  }),
  OtpStrategy.name
);

async function clearSecretFromAccount(account: Account) {
  const { otpSecret, secretExpiresAt, ...clearedAccount } = account;
  await db.doc(`accounts/${account.id}`).set(clearedAccount);
}

export {
  authenticator,
  emailParam,
  otpParam,
  OtpStrategy,
  type User,
  type OtpStrategyVerifyParams,
};
