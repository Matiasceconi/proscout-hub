# Base44 Project

## Score Fútbol: estado actual

- `/agency` redirige a `/agency/operations`, que funciona como entrada operativa para agenda y partidos.
- `/agency/intelligence` conserva únicamente prioridades, seguimientos y evolución de servicios. El antiguo informe/asistente de IA fue retirado.
- El antiguo `personal-dashboard` quedó deshabilitado con respuesta `410`; su interfaz fue eliminada. La entidad histórica de preferencias se conserva temporalmente para rollback, sin acceso desde la navegación.
- `sportmonks-player` permite al administrador consultar y confirmar una identidad antes de vincularla. La sincronización usa esa identidad verificada y conserva la última información si falla el proveedor.
- Configurar `SPORTMONKS_API_TOKEN` como secreto del servidor y verificar que el plan incluya las ligas requeridas. Nunca colocar el token en variables VITE ni en el navegador.
- Las estadísticas se agregan por temporada/competición y equipo. Un valor ausente permanece sin dato; no se convierte en cero.
- `score-ai` es el backend nuevo y separado para la futura integración con OpenAI. Requiere `OPENAI_API_KEY`, admite `OPENAI_MODEL` y en esta primera etapa es estrictamente de solo lectura: cartera, ficha, partidos, agenda, próximos partidos y resumen de cartera según permisos.
- La búsqueda de fotos mediante un LLM externo fue retirada. Las fotos deben provenir de un proveedor verificado o de carga manual.
- Validación local recomendada: `npm run lint`, `npm run build` y `npm test`. El chequeo `npm run typecheck` todavía expone deuda de tipado heredada en componentes JavaScript y debe tratarse por separado de los errores de compilación.
- Pendiente de validación operativa: credenciales reales de proveedores, prueba con al menos dos roles de usuario, revisión visual autenticada y publicación desde Base44.

Referencia: [Sportmonks Player by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/players/get-player-by-id).


Use this repository to run and edit the app locally, then publish changes back through Base44.

Any change pushed to the repo will also be reflected in the Base44 Builder.

## Prerequisites

1. Clone the repository using the project's Git URL.
2. Navigate to the project directory.
3. Install dependencies: `npm install`.
4. Install the Base44 CLI: `npm install -g base44@latest`.

See the [Base44 CLI docs](https://docs.base44.com/developers/references/cli/get-started/overview) if you want to run Base44 commands directly.

## Run Locally

Run the full local development environment from the project root:

```bash
base44 dev
```

`base44 dev` starts the local Base44 development backend and, when this app is configured for it, also starts the frontend dev server for you. Use the frontend URL printed by the command.

For example, when the Base44 project config includes a `serveCommand`, `base44 dev` can launch the frontend too:

```json5
{
  "site": {
    "serveCommand": "npm run dev"
  }
}
```

In a Base44 project this lives in `base44/config.jsonc`.

## Run Only The Frontend

If you only want to work on the frontend against the hosted Base44 backend, run:

```bash
npm run dev
```

Open the local URL printed by Vite.

## Use The Hosted Backend

For frontend-only development, create or update `.env.local` in the project root:

```bash
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
```

`VITE_BASE44_APP_ID` identifies the Base44 app.

`VITE_BASE44_APP_BASE_URL` tells the Base44 Vite plugin where to send local `/api` requests. Point it at your deployed Base44 app URL when you want the local frontend to use the hosted backend.

When you use `base44 dev`, the command injects the local Base44 values for you, so `.env.local` is mainly needed for frontend-only workflows.

## Publish Your Changes

After pushing your changes to git, open the Base44 dashboard and publish the app:

```bash
base44 dashboard open
```

## Docs & Support

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Base44 CLI command reference: [https://docs.base44.com/developers/references/cli/commands/introduction](https://docs.base44.com/developers/references/cli/commands/introduction)

Support: [https://app.base44.com/support](https://app.base44.com/support)
