# AGENTS.md — gnn_ddi

## Project at a Glance

DrugGraph — predicts drug-drug interactions using GraphSAGE on a DrugBank molecular graph. Three components:

| Component | Path | Stack |
|-----------|------|-------|
| Training | `drug_interaction_gnn_local_cpu_final_run3.ipynb` (root) | PyTorch + PyG + RDKit |
| Backend | `drug-interaction-app/backend/app.py` (single file, 329 lines) | Flask + PyTorch inference |
| Frontend | `drug-interaction-app/frontend/` | Next.js 16 + React 19 + Tailwind 4 |

## Critical Gotchas

### Model artifacts live in two places

- `drug_gnn_artifacts/` — training output (source of truth)
- `drug-interaction-app/backend/models/` — copy used by backend at runtime

The backend hardcodes `MODEL_DIR = ./models/` relative to `app.py`. If you retrain, you **must** copy artifacts:

```bash
cp -r drug_gnn_artifacts/* drug-interaction-app/backend/models/
```

### Dual API proxy strategy (easy to miss)

The frontend proxies `/api/*` to Flask via **two independent mechanisms**:

1. **`next.config.ts` rewrites** — client-side fetch → `NEXT_PUBLIC_API_URL` (default `http://localhost:5000`)
2. **Next.js API route handlers** (`app/api/`) — server-side proxy → `BACKEND_URL` (default `http://localhost:5000`), with **mock fallback** if backend is unreachable

The frontend works without the backend running (returns mock data).

### Backend env vars are mostly unused in code

`render.yaml` defines `MODEL_PATH` and `CORS_ORIGINS`, but `app.py` does **not** read them. The model path is hardcoded. Don't rely on those env vars for local development.

## Commands

### Frontend

```bash
cd drug-interaction-app/frontend
npm run dev       # dev server on http://localhost:3000
npm run build     # production build
npm run lint      # ESLint 9 (flat config, eslint-config-next)
```

No `npm test` — the project has **zero tests** (no pytest, no jest, no vitest).

### Backend

```bash
cd drug-interaction-app/backend
python app.py                              # dev server on :5000
gunicorn app:app --bind 0.0.0.0:5000       # production
```

Requires Python 3.11.0 (see `runtime.txt`). Install deps: `pip install -r requirements.txt`.

### Training (Jupyter)

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install torch-geometric rdkit scikit-learn matplotlib seaborn tqdm networkx pandas numpy jupyter
jupyter notebook drug_interaction_gnn_local_cpu_final_run3.ipynb
```

Requires DrugBank XML (licensed). Update `CONFIG['drugbank_path']` in notebook. ~1 hour on i7 CPU.

### GitNexus

```bash
npx gitnexus analyze          # rebuild knowledge graph
npx gitnexus status           # check if index is stale
```

## Architecture Notes

- **Backend is a single file** (`app.py`) — no modules, no blueprints, no `__init__.py`
- **7 frontend components** under `components/` — all in TypeScript
- **No CI/CD pipelines** — deploys via Render (backend) and Vercel (frontend)
- **No pre-commit hooks**, no formatter, no typecheck beyond ESLint
- **Notebooks follow pattern:** `drug_interaction_gnn_<variant>.ipynb` — active one at root, old ones in `previous_notebooks_runs/`
- **GitNexus** indexes 295 symbols, 351 relationships, 3 flows — run `npx gitnexus analyze` if tools report stale index
