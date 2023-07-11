import { useForm } from "@conform-to/react";
import { parse } from "@conform-to/zod";
import { json, type ActionArgs, redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { z } from "zod";
import { db, modelConverter } from "~/utils/server/db.server";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Die Email-Adresse fehlt.")
    .email("Ungültige Email-Adresse."),
});

type Account = {
  id: string;
  name: string;
  email: string;
};

export async function action({ request }: ActionArgs) {
  let account: Account | undefined;
  const formData = await request.formData();
  const submission = await parse(formData, {
    schema: loginSchema.superRefine(async (data, ctx) => {
      const qs = await db
        .collection("accounts")
        .where("email", "==", data.email)
        .limit(1)
        .withConverter(modelConverter<Account>())
        .get();
      if (qs.size !== 1) {
        ctx.addIssue({
          path: ["email"],
          code: z.ZodIssueCode.custom,
          message: "Unbekannte Email-Adresse",
        });
      } else {
        account = qs.docs[0].data();
      }
    }),
    async: true,
  });

  if (
    !submission.value ||
    submission.intent !== "submit" ||
    account === undefined
  ) {
    return json(submission, { status: 400 });
  }

  console.log(account);
  return redirect("/login-code");
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
