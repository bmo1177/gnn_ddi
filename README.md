# DrugGraph — Drug-Drug Interaction Prediction with Graph Neural Networks

A Graph Neural Network system that predicts dangerous drug-drug interactions (DDIs) using molecular graph embeddings. Models drugs as nodes and known interactions as edges, then learns to predict unseen interactions with **0.9933 AUC-ROC** — outperforming published baselines like DeepDDI (~0.920) and SSI-DDI (~0.961).

> **CPU-only training** — no GPU required. Full training completes in ~1 hour on an Intel i7 13th Gen.

## Key Results

| Metric | Value |
|--------|-------|
| Drugs modeled | 19,842 |
| Known interactions | 1,455,278 |
| Architecture | GraphSAGE (2-layer) + MLP Link Predictor |
| Test AUC-ROC | 0.9933 |
| Total parameters | 164,545 |

## Architecture

```
Drug SMILES → Morgan Fingerprints (256-dim)
                    ↓
         GraphSAGE Encoder (256 → 128 → 64)
                    ↓
         64-dim Drug Embeddings
                    ↓
         MLP Link Predictor (192 → 256 → 128 → 1)
                    ↓
         Interaction Probability → Risk Level (HIGH / MODERATE / LOW)
```

**Supported GNN backends:** GraphSAGE (selected), GCN, GAT — configurable via `architecture` parameter.

## Project Structure

```
gnn_ddi/
├── drug_interaction_gnn_local_cpu_final_run3.ipynb   # Full training pipeline
├── drug_gnn_artifacts/                                # Trained model + data
│   ├── best_model.pt                                  # Model weights
│   ├── embeddings.pt                                  # Precomputed 19,842×64 embeddings
│   ├── drugs.csv                                      # Drug index/IDs
│   └── ...
├── drug-interaction-app/
│   ├── backend/                                       # Flask REST API
│   │   └── app.py                                     # Model serving + inference
│   └── frontend/                                      # Next.js 16 + React 19
│       └── app/page.tsx                               # Interactive DDI checker
└── previous_notebooks_runs/                           # Earlier iterations
```

## Quick Start

### 1. Training (from scratch)

```bash
python3 -m venv .venv && source .venv/bin/activate

pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install torch-geometric rdkit scikit-learn matplotlib seaborn tqdm networkx pandas numpy jupyter

jupyter notebook drug_interaction_gnn_local_cpu_final_run3.ipynb
```

> Requires the DrugBank Full Database v5.1.15 (licensed). Update `CONFIG['drugbank_path']` in the notebook.

### 2. Run the Web App

**Backend:**

```bash
cd drug-interaction-app/backend
pip install -r requirements.txt
cp -r ../../drug_gnn_artifacts/* ./models/
python app.py                                          # http://localhost:5000
```

**Frontend:**

```bash
cd drug-interaction-app/frontend
npm install
npm run dev                                            # http://localhost:3000
```

### 3. Deploy

| Service | Platform | Config |
|---------|----------|--------|
| Backend | [Render](https://render.com) | `render.yaml` included |
| Frontend | [Vercel](https://vercel.com) | Set `NEXT_PUBLIC_API_URL` env var |

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Model status and drug count |
| `GET` | `/api/search?q=<name>&limit=8` | Fuzzy drug name search |
| `POST` | `/api/check` | Check interactions for up to 8 drugs |

**POST `/api/check` body:**

```json
{ "drugs": ["Aspirin", "Warfarin", "Ibuprofen"] }
```

**Risk thresholds:**

| Probability | Risk Level | Recommendation |
|-------------|------------|----------------|
| ≥ 0.7 | **HIGH** | Avoid combination — consult physician |
| ≥ 0.4 | **MODERATE** | Monitor closely — dose adjustment may be needed |
| < 0.4 | **LOW** | Generally safe — monitor for symptoms |

## Frontend Features

- Autocomplete drug search with debouncing
- Quick Start presets (High Risk Cardiac, Moderate, Low, Mixed)
- Check history with localStorage persistence
- Export results to clipboard
- Light/dark/system theme toggle
- Keyboard shortcuts — `Ctrl+K` (search), `Ctrl+Enter` (check)
- Responsive design, mobile-friendly

## Training Configuration

| Parameter | Value |
|-----------|-------|
| Optimizer | Adam (lr=1e-3, weight_decay=1e-5) |
| Scheduler | CosineAnnealingLR (T_max=100) |
| Batch size | 262,144 edges |
| Negative sampling | 1:1 ratio, sparse |
| Early stopping | Patience 20 epochs |
| Gradient clipping | max_norm=1.0 |
| Loss | BCEWithLogitsLoss |
| Train/Val/Test | 80% / 10% / 10% |

## Limitations

- **Binary prediction** — predicts yes/no, not interaction type
- **Pairwise only** — evaluates pairs, not multi-drug cocktails
- **No temporal modeling** — does not account for induction time or half-life
- **No dosage context** — predictions are independent of dose
- **No novel interaction types** — only learns from DrugBank-known categories

## Future Directions

- Multi-drug analysis via hypergraph convolutions
- Explainable AI with GNN attention visualization
- Protein target incorporation (drug-target interaction networks)
- Federated learning for privacy-preserving multi-institution training

## Dataset

- **Source:** DrugBank Full Database v5.1.15 (licensed)
- **Features:** Morgan fingerprints (radius 2, 256 bits) via RDKit
- **Hub drug:** Clozapine (2,637 connections — highest degree in the graph)
- **Average node degree:** 146.7

## Citation

If you use this work, please cite the DrugBank dataset:

> Wishart, D.S., et al. (2018). DrugBank 5.0: a major update to the DrugBank database for 2018. *Nucleic Acids Research*, 46(D1), D601–D612.

## License

This project uses the DrugBank dataset which requires a [free academic license](https://go.drugbank.com/releases/latest#open-data). The source code in this repository is provided for educational and research purposes.
