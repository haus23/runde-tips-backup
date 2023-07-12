import { useForm } from '@conform-to/react';
import { parse } from '@conform-to/zod';
import { json, type ActionArgs, redirect } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { z } from 'zod';
import type { Account } from '~/model/Account';
import { getDomainUrl } from '~/utils/misc';
import { db, modelConverter } from '~/utils/server/db.server';
import { sendEmail } from '~/utils/server/email.server';
import { generateTOTP } from '~/utils/server/totp.server';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Die Email-Adresse fehlt')
    .email('Ungültige Email-Adresse'),
});

export async function action({ request }: ActionArgs) {
  let account: Account | undefined;

  // Form Validation
  const formData = await request.formData();
  const submission = await parse(formData, {
    schema: loginSchema.superRefine(async (data, ctx) => {
      const qs = await db
        .collection('accounts')
        .where('email', '==', data.email)
        .limit(1)
        .withConverter(modelConverter<Account>())
        .get();
      if (qs.size !== 1) {
        ctx.addIssue({
          path: ['email'],
          code: z.ZodIssueCode.custom,
          message: 'Unbekannte Email-Adresse',
        });
      } else {
        account = qs.docs[0].data();
      }
    }),
    async: true,
  });

  if (
    !submission.value ||
    submission.intent !== 'submit' ||
    account === undefined
  ) {
    return json(submission, { status: 400 });
  }

  // Prepare account onboarding

  const { otp, secret, period } = generateTOTP({
    algorithm: 'SHA256',
    period: 10 * 30,
  });

  account.otpSecret = secret;
  account.secretExpiresAt = new Date(Date.now() + period * 1000).toISOString();

  await db.doc(`accounts/${account.id}`).set(account);

  const onboardingUrl = new URL(`${getDomainUrl(request)}/login-code`);
  onboardingUrl.searchParams.set('email', account.email);
  const redirectTo = new URL(onboardingUrl.toString());

  onboardingUrl.searchParams.set('otp', otp);

  const response = await sendEmail({
    to: `${account.name} <${account.email}>`,
    subject: `Tipprunde Login`,
    html: '',
    text: `Zum Einloggen den Code ${otp} nutzen oder den Link ${onboardingUrl.toString()}`,
  });

  if (response.status === 'success') {
    return redirect(redirectTo.pathname + redirectTo.search);
  } else {
    submission.error['email'] = 'Fehler beim Email-Versand.';
    return json(submission, { status: 500 });
  }
}

export default function LoginRoute() {
  const lastSubmission = useActionData<typeof action>();

  const [form, { email }] = useForm({
    lastSubmission,
    onValidate({ formData }) {
      return parse(formData, { schema: loginSchema });
    },
  });

  return (
    <div className="container mx-auto mt-8">
      <h1 className="text-3xl font-semibold">Anmeldung</h1>

      <Form method="post" {...form.props}>
        <label htmlFor="email">Email:</label>
        <input id="email" type="email" name={email.name} />
        <div>{email.error}</div>
      </Form>
    </div>
  );
}
