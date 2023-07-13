import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import { json, type DataFunctionArgs, redirect } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { useEffect } from 'react';
import { AuthorizationError } from 'remix-auth';
import { z } from 'zod';
import { Button } from '~/components/(ui)/button';
import { TextField } from '~/components/forms';
import type { Account } from '~/model/Account';
import { getDomainUrl } from '~/utils/misc';
import {
  OtpStrategy,
  authenticator,
  createLoginCode,
  ensureCodeRequest,
  findAccountByEmail,
} from '~/utils/server/auth.server';
import { sendEmail } from '~/utils/server/email.server';
import { commitSession, getSession } from '~/utils/server/session.server';

// Das OTP ist optional markiert, damit eine Validierung ohne OTP
// auch durchgeht. Siehe Use-case 1 in der Action
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Keine Email-Adresse angegeben.')
    .email('Ungültige Email-Adresse.'),
  otp: z
    .string()
    .regex(/^\d{6}$/, 'Ein gültiger Code hat genau 6 Ziffern.')
    .optional(),
});

// Use cases:
// 1. Componente wird direkt über den Login-Link geroutet
//    -> keine Parameter
// 2. Bookmark der Login-Seite mit gefüllter Email-Adresse
//    -> Email in der URL
// 3. Link aus der Onboarding-Mail
//    -> Email und TOTP in der URL
//    Es könnte sein, dass jmd den Link aufruft ohne vorherige Code-Anforderung.
//    Zum Beispiel weil er den Link aus der Mail ein zweites Mal benutzt oder
//    diesen als Lesezeichen gesetzt hat.
export async function loader({ request }: DataFunctionArgs) {
  const params = new URL(request.url).searchParams;

  // In jedem Fall werde ich nicht initial validieren, sondern lediglich
  // eine Submission aus den Daten erzeugen
  let { email, otp } = Object.fromEntries(params);

  // Prüfung des Sonderfalls aus Schritt 3
  let linkError = false;
  if (otp) {
    const result = await ensureCodeRequest(email);
    if (!result) {
      otp = '';
      linkError = true;
    }
  }

  return json(
    {
      intent: otp ? 'validate-code' : 'request-code',
      payload: { email, otp },
      error: {
        '': linkError
          ? 'Das ist ein veralteter Link. Du musst erst einen neuen Code anfordern.'
          : '',
      },
    },
    { status: 200 },
  );
}

// Use cases:
// 1. Anfordern des Codes: request-code
// 2. Validieren des Codes: validate-code
export async function action({ request }: DataFunctionArgs) {
  const formData = await request.clone().formData();

  let account: Account | undefined;
  const submission = await parse(formData, {
    schema: loginSchema.superRefine(async (data, ctx) => {
      account = await findAccountByEmail(data.email);
      if (!account) {
        ctx.addIssue({
          path: ['email'],
          code: z.ZodIssueCode.custom,
          message: 'Unbekannte Email-Adresse.',
        });
      }
    }),
    async: true,
  });

  // Valide Daten?
  if (!submission.value || account === undefined) {
    return json(submission, { status: 400 });
  }

  // Intent: request-code
  if (submission.intent === 'request-code') {
    const otp = await createLoginCode(account);

    const onboardingUrl = new URL(`${getDomainUrl(request)}/login`);
    onboardingUrl.searchParams.set('email', account.email);
    onboardingUrl.searchParams.set('otp', otp);

    const response = await sendEmail({
      to: `${account.name} <${account.email}>`,
      subject: `Tipprunde Login`,
      html: '',
      text: `Zum Einloggen den Code ${otp} nutzen oder den Link ${onboardingUrl.toString()}`,
    });

    if (response.status === 'error') {
      submission.error[''] = 'Fehler beim Email-Versand.';
      return json(submission, { status: 500 });
    }

    // Alles erledigt, nächster Schritt
    submission.intent = 'validate-code';
  }
  // Intent: validate-code
  else {
    // Validate OTP
    // Zunächst wird jetzt server-seitig geprüft, ob er überhaupt eingegeben wurde
    if (!submission.value.otp) {
      submission.error.otp = 'Kein Code eingeben';
      return json(submission, { status: 400 });
    }

    try {
      const user = await authenticator.authenticate(OtpStrategy.name, request, {
        throwOnError: true,
      });

      const cookieSession = await getSession(request.headers.get('cookie'));
      cookieSession.set('user', user);
      const responseInit = {
        headers: {
          'Set-Cookie': await commitSession(cookieSession, {
            // expires: remember ? session.expirationDate : undefined,
          }),
        },
      };
      return redirect('/', responseInit);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        // Fehler, zurück zum ersten Schritt
        submission.intent = 'request-code';
        submission.value.otp = undefined;
        return json(
          {
            ...submission,
            error: {
              // show authorization error as a form level error message.
              '': error.message,
            },
          },
          { status: 400 },
        );
      }
      throw error;
    }
  }

  return json(submission, { status: 200 });
}

export default function LoginRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const lastSubmission = actionData || loaderData;

  const [form, { email, otp }] = useForm({
    constraint: getFieldsetConstraint(loginSchema),
    lastSubmission,
    onValidate({ formData }) {
      return parse(formData, { schema: loginSchema });
    },
  });

  useEffect(() => {
    if (form.error) {
      const url = new URL(location.href);
      url.searchParams.delete('otp');
      history.replaceState(null, '', url.search);
    }
  }, [form]);

  return (
    <div className="container mx-auto mt-8 px-4 text-center">
      <h1 className="text-3xl font-semibold">Anmeldung</h1>
      <form
        method="post"
        className="mx-auto mt-4 max-w-md space-y-4"
        {...form.props}
      >
        <TextField
          className="text-left"
          label="Email"
          autoComplete="email"
          description={
            lastSubmission.intent === 'request-code'
              ? 'Die Email-Adresse, die bei uns registriert ist.'
              : ''
          }
          errorMessage={email.error}
          {...conform.input(email, {
            type: 'email',
            ariaAttributes: true,
          })}
        />
        {lastSubmission.intent === 'validate-code' && (
          <TextField
            className="text-left"
            label="Code"
            autoComplete="one-time-code"
            description="Der Code aus der Email."
            errorMessage={otp.error}
            inputMode="numeric"
            {...conform.input(otp, { type: 'text', ariaAttributes: true })}
          />
        )}
        <div>
          {lastSubmission.intent === 'request-code' ? (
            <Button type="submit" name={conform.INTENT} value="request-code">
              Code anfordern
            </Button>
          ) : (
            <Button type="submit" name={conform.INTENT} value="validate-code">
              Anmelden
            </Button>
          )}
        </div>
      </form>
      {form.error && <div className="mt-4 text-invalid">{form.error}</div>}
    </div>
  );
}
