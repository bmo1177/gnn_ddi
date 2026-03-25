"""
Drug Interaction Checker — Flask REST API
Serves a trained GraphSAGE GNN for drug-drug interaction prediction.
"""

import os
import json
import pickle
import difflib
from itertools import combinations

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv
from flask import Flask, request, jsonify
from flask_cors import CORS

# ---------------------------------------------------------------------------
# Model classes — must match training exactly
# ---------------------------------------------------------------------------

class DrugGNNEncoder(nn.Module):
    """GraphSAGE encoder, 2 layers, NO BatchNorm."""
    def __init__(self, in_channels, hidden_channels, out_channels,
                 num_layers=2, dropout=0.3, architecture='sage'):
        super().__init__()
        self.architecture = architecture
        self.dropout = dropout
        self.convs = nn.ModuleList()
        dims = [in_channels] + [hidden_channels] * (num_layers - 1) + [out_channels]
        for i in range(num_layers):
            in_d, out_d = dims[i], dims[i + 1]
            if architecture == 'sage':
                self.convs.append(SAGEConv(in_d, out_d))
            # Only sage is used — kept minimal
        # No BatchNorm — not needed at this scale, avoids eval/train mode issues

    def forward(self, x, edge_index):
        for i, conv in enumerate(self.convs):
            x = conv(x, edge_index)
            if i < len(self.convs) - 1:
                x = F.elu(x)
                x = F.dropout(x, p=self.dropout, training=self.training)
        return x


class LinkPredictor(nn.Module):
    """MLP scoring drug pairs."""
    def __init__(self, embedding_dim):
        super().__init__()
        self.mlp = nn.Sequential(
            nn.Linear(embedding_dim * 3, 256),
            nn.ELU(), nn.Dropout(0.2),
            nn.Linear(256, 128),
            nn.ELU(), nn.Dropout(0.1),
            nn.Linear(128, 1),
        )

    def forward(self, z_a, z_b):
        return self.mlp(torch.cat([z_a, z_b, z_a * z_b], dim=-1)).squeeze(-1)


# ---------------------------------------------------------------------------
# Load model & data
# ---------------------------------------------------------------------------

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

def load_model():
    """Load all artifacts and precompute drug embeddings."""
    # Config
    with open(os.path.join(MODEL_DIR, 'config.json')) as f:
        config = json.load(f)

    # Drug name list
    drugs_df = pd.read_csv(os.path.join(MODEL_DIR, 'drugs.csv'))
    drug_names = drugs_df['name'].tolist()

    # Name → index mapping
    with open(os.path.join(MODEL_DIR, 'name_to_idx.pkl'), 'rb') as f:
        name_to_idx = pickle.load(f)

    # Graph data
    node_features = torch.load(os.path.join(MODEL_DIR, 'node_features.pt'),
                               map_location='cpu', weights_only=False)
    edge_index = torch.load(os.path.join(MODEL_DIR, 'edge_index.pt'),
                            map_location='cpu', weights_only=False)

    # Build models
    encoder = DrugGNNEncoder(
        in_channels=node_features.shape[1],
        hidden_channels=config['hidden_dim'],
        out_channels=config['embedding_dim'],
        num_layers=config['num_gnn_layers'],
        dropout=config.get('dropout', 0.3),
        architecture=config['architecture'],
    )
    predictor = LinkPredictor(config['embedding_dim'])

    # Load weights
    checkpoint = torch.load(os.path.join(MODEL_DIR, 'best_model.pt'),
                            map_location='cpu', weights_only=False)
    encoder.load_state_dict(checkpoint['encoder'])
    predictor.load_state_dict(checkpoint['predictor'])

    encoder.eval()
    predictor.eval()

    # Precompute all drug embeddings
    with torch.no_grad():
        Z = encoder(node_features, edge_index)

    print(f"Model loaded: {len(drug_names):,} drugs, embeddings shape {list(Z.shape)}")
    return drug_names, name_to_idx, encoder, predictor, Z


# Global state
drug_names, name_to_idx, encoder, predictor, Z = load_model()
drug_names_lower = [n.lower() for n in drug_names]

# ---------------------------------------------------------------------------
# Risk helpers
# ---------------------------------------------------------------------------

ALIASES = {
    "aspirin": "Acetylsalicylic acid",
    "paracetamol": "Acetaminophen",
    "advil": "Ibuprofen",
    "tylenol": "Acetaminophen"
}

def classify_risk(prob: float):
    """Return risk_level, risk_color, advice for a given probability."""
    if prob >= 0.7:
        return (
            "HIGH", "#E05252",
            "Avoid this combination. Consult prescribing physician immediately."
        )
    elif prob >= 0.4:
        return (
            "MODERATE", "#EF9F27",
            "Monitor patient closely. Dose adjustment may be required."
        )
    else:
        return (
            "LOW", "#1D9E75",
            "Generally safe. Monitor for unusual symptoms."
        )


def resolve_drug_name(name: str):
    """
    Resolve a drug name to its canonical form.
    Returns (canonical_name, matched_as) or (None, error_string).
    """
    lower = name.strip().lower()
    
    # Alias check
    if lower in ALIASES:
        canonical = ALIASES[lower]
        return canonical, canonical

    # Exact match (case-insensitive)
    for i, n in enumerate(drug_names_lower):
        if n == lower:
            return drug_names[i], None

    # Fuzzy match
    matches = difflib.get_close_matches(name, drug_names, n=1, cutoff=0.75)
    if matches:
        return matches[0], matches[0]

    return None, f"Drug not found: {name}"


# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "n_drugs": len(drug_names),
        "model_loaded": Z is not None,
    })


@app.route('/api/search', methods=['GET'])
def search():
    q = request.args.get('q', '').strip().lower()
    limit = min(int(request.args.get('limit', 8)), 20)

    if not q:
        return jsonify({"results": []})

    # Collect matches: (is_prefix, name)
    matches = []
    
    # Check aliases
    for alias, canonical in ALIASES.items():
        if q in alias:
            # If the query matches an alias, include the canonical name
            is_prefix = alias.startswith(q)
            matches.append((not is_prefix, canonical))
            
    for name in drug_names:
        nl = name.lower()
        if q in nl:
            is_prefix = nl.startswith(q)
            matches.append((not is_prefix, name))  # False sorts before True

    # Sort: prefix matches first, then alphabetical
    matches.sort(key=lambda x: (x[0], x[1].lower()))
    
    # Remove duplicates
    seen = set()
    results = []
    for m in matches:
        if m[1] not in seen:
            seen.add(m[1])
            results.append(m[1])
            if len(results) == limit:
                break

    return jsonify({"results": results})


@app.route('/api/check', methods=['POST'])
def check():
    data = request.get_json(force=True)
    drug_list = data.get('drugs', [])

    if not drug_list:
        return jsonify({"error": "No drugs provided"}), 400
    if len(drug_list) > 8:
        return jsonify({"error": "Maximum 8 drugs allowed"}), 400

    # Resolve drug names
    resolved = {}
    errors = []
    for name in drug_list:
        canonical, matched_as = resolve_drug_name(name)
        if canonical is None:
            errors.append(matched_as)
        else:
            resolved[name] = (canonical, matched_as)

    # Predict interactions for all pairs
    interactions = []
    for (name_a, name_b) in combinations(drug_list, 2):
        if name_a not in resolved or name_b not in resolved:
            continue

        canonical_a, matched_as_a = resolved[name_a]
        canonical_b, matched_as_b = resolved[name_b]

        idx_a = name_to_idx[canonical_a]
        idx_b = name_to_idx[canonical_b]

        with torch.no_grad():
            z_a = Z[idx_a].unsqueeze(0)
            z_b = Z[idx_b].unsqueeze(0)
            score = predictor(z_a, z_b)
            prob = torch.sigmoid(score).item()

        risk_level, risk_color, advice = classify_risk(prob)

        result = {
            "drug_a": name_a,
            "drug_b": name_b,
            "probability": round(prob, 4),
            "risk_level": risk_level,
            "risk_color": risk_color,
            "advice": advice,
        }
        if matched_as_a:
            result["drug_a_matched_as"] = canonical_a
        if matched_as_b:
            result["drug_b_matched_as"] = canonical_b

        interactions.append(result)

    # Sort by probability descending
    interactions.sort(key=lambda x: x['probability'], reverse=True)

    # Summary
    high = sum(1 for i in interactions if i['risk_level'] == 'HIGH')
    moderate = sum(1 for i in interactions if i['risk_level'] == 'MODERATE')
    low = sum(1 for i in interactions if i['risk_level'] == 'LOW')
    max_prob = max((i['probability'] for i in interactions), default=0)

    if high > 0:
        overall = "HIGH"
    elif moderate > 0:
        overall = "MODERATE"
    else:
        overall = "LOW"

    return jsonify({
        "interactions": interactions,
        "summary": {
            "total_pairs": len(interactions),
            "high_risk": high,
            "moderate_risk": moderate,
            "low_risk": low,
            "overall_risk": overall,
            "max_probability": round(max_prob, 4),
        },
        "errors": errors,
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
