#!/usr/bin/env python3
"""POLAND2050 artifact validator.

Validates durable GitHub artifacts. It intentionally does not infer completion from chat
summaries. Incomplete scope is allowed; duplicates, malformed cards, or scope overflow fail.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "config.json"
STATUS_PATH = ROOT / "MASTER_STATUS.json"

ID_RE = re.compile(r"(?:\*\*)?CANONICAL_ID(?:\*\*)?\s*:\s*`?([A-Za-z0-9_-]+)")
MASTER_RE = re.compile(r"(?:\*\*)?MASTER_ID(?:\*\*)?\s*:\s*`?([A-Za-z0-9_-]+)")
SOURCE_RE = re.compile(r"(?:\*\*)?SOURCE_IDS\[\](?:\*\*)?\s*:\s*(.+)")
ROLE_RE = re.compile(r"(?:\*\*)?REVOLUTION_ROLE(?:\*\*)?\s*:\s*`?(T[0-4])")
PROVENANCE_RE = re.compile(r"(?:\*\*)?PROVENANCE(?:\*\*)?\s*:\s*(RECOVERED|REBUILT)", re.I)


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def card_segments(text: str):
    matches = list(ID_RE.finditer(text))
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        yield match.group(1), text[start:end]


def scan_stage(stage_dir: Path, expected_roles: dict[str, int]):
    cards = []
    errors = []
    files = []
    if not stage_dir.exists():
        return {
            "files": 0,
            "physical_cards": 0,
            "unique": 0,
            "duplicates": [],
            "roles": {"T0": 0, "T1": 0, "T2": 0},
            "errors": [],
        }

    for path in sorted(stage_dir.rglob("*.md")):
        if path.name.upper().startswith("README"):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        segments = list(card_segments(text))
        if not segments:
            errors.append(f"{path.relative_to(ROOT)}: markdown artifact contains no CANONICAL_ID")
            continue
        files.append(path)
        for canonical_id, segment in segments:
            master = MASTER_RE.search(segment)
            source = SOURCE_RE.search(segment)
            role = ROLE_RE.search(segment)
            provenance = PROVENANCE_RE.search(segment)
            missing = []
            if not master:
                missing.append("MASTER_ID")
            if not source:
                missing.append("SOURCE_IDS[]")
            if not role:
                missing.append("REVOLUTION_ROLE")
            if not provenance:
                missing.append("PROVENANCE")
            if missing:
                errors.append(
                    f"{path.relative_to(ROOT)}:{canonical_id}: missing {', '.join(missing)}"
                )
            cards.append(
                {
                    "id": canonical_id,
                    "role": role.group(1) if role else None,
                    "file": str(path.relative_to(ROOT)),
                }
            )

    counts = Counter(c["id"] for c in cards)
    duplicates = sorted(k for k, v in counts.items() if v > 1)
    role_counts = Counter(c["role"] for c in cards if c["role"])
    for role in ("T0", "T1", "T2"):
        if role_counts[role] > expected_roles[role]:
            errors.append(
                f"role overflow {role}: {role_counts[role]} > expected {expected_roles[role]}"
            )

    return {
        "files": len(files),
        "physical_cards": len(cards),
        "unique": len(counts),
        "duplicates": duplicates,
        "roles": {r: role_counts[r] for r in ("T0", "T1", "T2")},
        "errors": errors,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-status", action="store_true")
    args = parser.parse_args()

    config = load_json(CONFIG_PATH)
    status = load_json(STATUS_PATH)
    fatal = []

    for node, cfg in config["nodes"].items():
        node_dir = ROOT / "nodes" / f"NODE_{node}"
        stage1 = scan_stage(node_dir / "stage1", cfg["roles"])
        stage2 = scan_stage(node_dir / "stage2", cfg["roles"])

        if stage1["unique"] > cfg["scope"]:
            fatal.append(f"NODE {node} Stage1 scope overflow: {stage1['unique']} > {cfg['scope']}")
        if stage2["unique"] > cfg["scope"]:
            fatal.append(f"NODE {node} Stage2 scope overflow: {stage2['unique']} > {cfg['scope']}")
        if stage1["duplicates"]:
            fatal.append(f"NODE {node} Stage1 duplicate IDs: {stage1['duplicates']}")
        if stage2["duplicates"]:
            fatal.append(f"NODE {node} Stage2 duplicate IDs: {stage2['duplicates']}")
        fatal.extend(f"NODE {node} Stage1: {x}" for x in stage1["errors"])
        fatal.extend(f"NODE {node} Stage2: {x}" for x in stage2["errors"])

        snapshot = status["nodes"][node]["snapshot"]
        scan = {
            "stage1": stage1,
            "stage2": stage2,
            "storage_health": {
                "stage1_vs_snapshot": f"{stage1['unique']}/{snapshot['stage1_unique']}",
                "stage2_vs_snapshot": f"{stage2['unique']}/{snapshot['stage2_unique']}",
                "migration_complete_for_snapshot": (
                    stage1["unique"] >= snapshot["stage1_unique"]
                    and stage2["unique"] >= snapshot["stage2_unique"]
                ),
            },
        }
        status["nodes"][node]["artifact_scan"] = scan

    status["artifact_scan_updated_at_utc"] = datetime.now(timezone.utc).isoformat()
    status["validator"] = {
        "result": "FAIL" if fatal else "PASS",
        "fatal_errors": fatal,
        "rule": "Incomplete is allowed; duplicates, malformed cards and scope overflow fail.",
    }

    if args.write_status:
        STATUS_PATH.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for node, data in status["nodes"].items():
        a = data["artifact_scan"]
        print(
            f"NODE {node}: repo S1 {a['stage1']['unique']}/{data['scope']} | "
            f"S2 {a['stage2']['unique']}/{data['scope']} | "
            f"snapshot S1 {data['snapshot']['stage1_unique']} | "
            f"snapshot S2 {data['snapshot']['stage2_unique']}"
        )

    if fatal:
        print("\nVALIDATION FAILED", file=sys.stderr)
        for item in fatal:
            print(f"- {item}", file=sys.stderr)
        return 1

    print("\nVALIDATION PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
