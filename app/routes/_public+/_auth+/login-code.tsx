import { conform, useForm } from '@conform-to/react';
import { parse } from '@conform-to/zod';
import { json, type ActionArgs, type LoaderArgs } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { z } from 'zod';
import type { Account } from '~/model/Account';
import { db, modelConverter } from '~/utils/server/db.server';
import { verifyTOTP } from '~/utils/server/totp.server';

const loginCodeSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/),
});

export async function loader({ request }: LoaderArgs) {
  const params = new URL(request.url).searchParams;
  if (!params.has('otp')) {
    // we don't want to show an error message on page load if the otp hasn't be
    // prefilled in yet, so we'll send a response with an empty submission.
    return json({
      status: 'idle',
      submission: {
        intent: '',
        payload: Object.fromEntries(params),
        error: {},
      },
    } as const);
  }
  return validate(request, params);
}

export async function action({ request }: ActionArgs) {
  return validate(request, await request.formData());
}

async function validate(request: Request, body: URLSearchParams | FormData) {
  const submission = await parse(body, {
    schema: () =>
      loginCodeSchema.superRefine(async (data, ctx) => {
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
            message: `Unbekannte Email-Adresse.`,
          });
          return;
        }

        let account = qs.docs[0].data();

        if (!account.secretExpiresAt || !account.otpSecret) {
          ctx.addIssue({
            path: ['email'],
            code: z.ZodIssueCode.custom,
            message: `Es liegt kein Anmeldeversuch vor.`,
          });
          return;
        }

        if (new Date().toISOString() > account.secretExpiresAt) {
          ctx.addIssue({
            path: ['email'],
            code: z.ZodIssueCode.custom,
            message: `Der Code ist schon abgelaufen.`,
          });
        }

        const result = verifyTOTP({
          otp: data.otp,
          secret: account.otpSecret,
          algorithm: 'SHA256',
          period: 10 * 30,
          window: 0,
        });

        if (!result) {
          ctx.addIssue({
            path: ['otp'],
            code: z.ZodIssueCode.custom,
            message: `Ungültiger Code`,
          });
          return;
        }
      }),
    async: true,
  });

  if (submission.intent !== 'submit') {
    return json({ status: 'idle', submission } as const);
  }

  if (!submission.value) {
    return json(
      {
        status: 'error',
        submission,
      } as const,
      { status: 400 }
    );
  }

  return json({ status: 'success', submission } as const);
}

export default function LoginCodeRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  console.log(loaderData.submission);
  const [form, { email, otp }] = useForm({
    lastSubmission: actionData?.submission ?? loaderData.submission,
    onValidate({ formData }) {
      return parse(formData, { schema: loginCodeSchema });
    },
  });

  return (
    <div className="container mx-auto mt-8">
      <h1 className="text-3xl font-semibold">Anmeldung</h1>

      <Form method="post" {...form.props}>
        <div>
          <label htmlFor="email">Email:</label>
          <input id="email" {...conform.input(email)} />
          <div>{email.error}</div>
        </div>
        <div>
          <label htmlFor="otp">Code:</label>
          <input id="otp" type="text" {...conform.input(otp)} />
          <div>{otp.error}</div>
        </div>
        <button type="submit">Prüfen</button>
      </Form>
    </div>
  );
}
