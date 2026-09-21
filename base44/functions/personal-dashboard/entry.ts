export default async function handler(): Promise<Response> {
  return Response.json(
    { success: false, error: 'Mi tablero fue retirado de Score Fútbol.' },
    { status: 410 }
  );
}
