export default async function handler(): Promise<Response> {
  return Response.json(
    {
      success: false,
      error: 'La búsqueda de fotos con IA fue retirada. Usá una foto verificada del proveedor de datos o una carga manual.'
    },
    { status: 410 }
  );
}
