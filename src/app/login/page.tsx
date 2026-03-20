import { redirect } from 'next/navigation';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const params = new URLSearchParams();
  params.set('login', '1');
  if (resolvedSearchParams) {
    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (typeof value === 'string') params.set(key, value);
      else if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    }
  }
  redirect(`/?${params.toString()}`);
}
