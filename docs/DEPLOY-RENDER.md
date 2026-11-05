# Desplegar ReadTik en Render (2 servicios, 1 repo)

Sí: **un solo repositorio en GitHub** puede levantar **dos Web Services** en Render (app Next.js + signer).

## Orden recomendado

1. **Git local** (sin subir secretos):
   ```bash
   cd readtick-app
   git init
   git add .
   git commit -m "Initial commit: ReadTik app + signer"
   ```

2. **GitHub**: crea repo vacío y:
   ```bash
   git remote add origin git@github-personal:TU_USUARIO/readtick-app.git
   git branch -M main
   git push -u origin main
   ```

3. **Render**: [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint** → conecta el repo → Render lee `render.yaml` y crea **readtik-web** y **readtik-signer**.

4. **Variables de entorno** (servicio **readtik-web**):

   | Variable | Notas |
   |----------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Igual que en `.env.local` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (pública) |
   | `ADMIN_EMAILS` | Solo cobros, ej. `a@mail.com,b@mail.com` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Opcional, solo servidor |
   | `TIKTOK_SIGN_SERVER_URL` | URL del signer en Render, ej. `https://readtik-signer.onrender.com` |

5. Tras desplegar **readtik-signer**, copia su URL pública → pégala en `TIKTOK_SIGN_SERVER_URL` de **readtik-web** → **Manual Deploy** (redeploy).

6. **Supabase** → Authentication → URL Configuration:
   - **Site URL**: `https://readtik-web.onrender.com` (tu URL real)
   - **Redirect URLs**: `https://readtik-web.onrender.com/auth/callback`

## Plan free

- Cada servicio puede **dormir** tras inactividad; el primer request tarda ~30–60 s.
- El signer y la app son **procesos separados** (2 URLs distintas).

## Local vs producción

| | Local | Render |
|---|--------|--------|
| Web | `pnpm dev` :3000 | `readtik-web` |
| Signer | `cd signer && npm start` :8080 | `readtik-signer` |
| Env | `.env.local` | Panel Render |

## Sin Blueprint (manual)

- **Web Service** raíz del repo: Build `corepack enable && pnpm install && pnpm build`, Start `pnpm start`.
- **Web Service** `Root Directory` = `signer`: Build `npm install`, Start `npm start`.
