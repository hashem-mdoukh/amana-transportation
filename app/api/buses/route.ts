// app/api/buses/route.ts
export const dynamic = 'force-dynamic';

export async function GET() {
  const response = await fetch('https://www.amanabootcamp.org/api/fs-classwork-data/amana-transportation');
  const buses = await response.json();
  return Response.json(buses);
}
