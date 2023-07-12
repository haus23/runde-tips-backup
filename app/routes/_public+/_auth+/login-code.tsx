import { conform, useForm } from '@conform-to/react';
import { parse } from '@conform-to/zod';
import {
  json,
  type ActionArgs,
  type LoaderArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { AuthorizationError } from 'remix-auth';
import { z } from 'zod';
import { OtpStrategy, authenticator } from '~/utils/server/auth.server';
import { commitSession, getSession } from '~/utils/server/session.server';

const loginCodeSchema = z.object({
  email: z
    .string()
    .min(1, 'Die Email-Adresse fehlt')
    .email('Ungültige Email-Adresse'),
  otp: z.string().regex(/^\d{6}$/, 'Code hat 6 Ziffern'),
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
  return json(validate(params));
}

export async function action({ request }: ActionArgs) {
  const result = validate(await request.clone().formData());

  if (result.status !== 'success') {
    return json(result);
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
      return json(
        {
          status: 'error',
          submission: {
            ...result.submission,
            error: {
              // show authorization error as a form level error message.
              '': error.message,
            },
          },
        } as const,
        { status: 400 }
      );
    }
    throw error;
  }
}

function validate(body: URLSearchParams | FormData) {
  const submission = parse(body, { schema: loginCodeSchema });

  if (submission.intent !== 'submit') {
    return { status: 'idle', submission } as const;
  }

  if (!submission.value) {
    return {
      status: 'error',
      submission,
    } as const;
  }

  return { status: 'success', submission } as const;
}

export default function LoginCodeRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [form, { email, otp }] = useForm({
    lastSubmission: actionData?.submission ?? loaderData.submission,
    onValidate({ formData }) {
      return parse(formData, { schema: loginCodeSchema });
    },
  });
  // TODO: FromConstraints??

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
        <div>{form.error}</div>
        <button type="submit">Prüfen</button>
      </Form>
    </div>
  );
}
