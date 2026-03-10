import { redirect } from 'next/navigation';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  params.set('login', '1');
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === 'string') params.set(key, value);
      else if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    }
  }
  redirect(`/?${params.toString()}`);
}
