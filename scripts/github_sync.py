#!/usr/bin/env python3
"""
GitHub and Metrics Sync Utility for Multi-Agent Software Factory
Handles GitHub comments, token logging, and fallback management.
"""
import os
import sys
import json
import csv
import urllib.request
import urllib.error
from datetime import datetime, timezone

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CONFIG_PATH = os.path.join(BASE_DIR, 'config', 'mcp_config.json')
FALLBACK_LOG = os.path.join(BASE_DIR, 'logs', 'github_sync_errors.log')
TOKEN_CSV = os.path.join(BASE_DIR, 'logs', 'token_usage.csv')

def get_github_pat():
    try:
        with open(CONFIG_PATH, 'r') as f:
            data = json.load(f)
            return data.get('mcpServers', {}).get('github', {}).get('env', {}).get('GITHUB_PERSONAL_ACCESS_TOKEN', '')
    except Exception as e:
        log_sync_error(f"Failed to read PAT from {CONFIG_PATH}: {e}")
        return None

def log_sync_error(msg):
    os.makedirs(os.path.dirname(FALLBACK_LOG), exist_ok=True)
    with open(FALLBACK_LOG, 'a') as f:
        f.write(f"[{datetime.now(timezone.utc).isoformat()}] {msg}\n")
    print(f"[WARN] GitHub Sync Error: {msg}", file=sys.stderr)

def log_token_usage(ticket_id, subagent_name, prompt_tokens, completion_tokens, estimated_cost):
    os.makedirs(os.path.dirname(TOKEN_CSV), exist_ok=True)
    file_exists = os.path.exists(TOKEN_CSV)
    
    with open(TOKEN_CSV, 'a', newline='') as f:
        writer = csv.writer(f)
        if not file_exists or os.path.getsize(TOKEN_CSV) == 0:
            writer.writerow(['timestamp', 'ticket_id', 'subagent_name', 'prompt_tokens', 'completion_tokens', 'estimated_cost'])
        writer.writerow([
            datetime.now(timezone.utc).isoformat(),
            ticket_id,
            subagent_name,
            prompt_tokens,
            completion_tokens,
            f"{estimated_cost:.6f}"
        ])

def post_github_comment(ticket_id, body, subagent_name=None, prompt_tokens=0, completion_tokens=0, estimated_cost=0.0, retries=2):
    # Log token usage if provided
    if subagent_name and (prompt_tokens > 0 or completion_tokens > 0):
        log_token_usage(ticket_id, subagent_name, prompt_tokens, completion_tokens, estimated_cost)
        token_remark = f"\n\n---\n**LLM Metrics ({subagent_name}):** Prompt: {prompt_tokens:,} tokens | Completion: {completion_tokens:,} tokens | Est. Cost: ${estimated_cost:.4f}"
        if token_remark not in body:
            body = body + token_remark

    pat = get_github_pat()
    if not pat:
        log_sync_error("No GitHub PAT available.")
        return False

    url = f"https://api.github.com/repos/melsabrouty88/SWDevFactory/issues/{ticket_id}/comments"
    payload = json.dumps({"body": body}).encode("utf-8")

    for attempt in range(1, retries + 2):
        try:
            req = urllib.request.Request(url, data=payload, headers={
                "Authorization": f"token {pat}",
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json",
                "User-Agent": "SWDevFactory-Orchestrator"
            })
            with urllib.request.urlopen(req) as resp:
                if resp.status in (200, 201):
                    return True
        except Exception as e:
            log_sync_error(f"Attempt {attempt} failed to post comment to ticket #{ticket_id}: {e}")
            if attempt > retries:
                return False
    return False

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--ticket", type=int, required=True)
    parser.add_argument("--body", type=str, required=True)
    parser.add_argument("--subagent", type=str, default="")
    parser.add_argument("--prompt-tokens", type=int, default=0)
    parser.add_argument("--completion-tokens", type=int, default=0)
    parser.add_argument("--cost", type=float, default=0.0)
    args = parser.parse_args()

    success = post_github_comment(
        ticket_id=args.ticket,
        body=args.body,
        subagent_name=args.subagent,
        prompt_tokens=args.prompt_tokens,
        completion_tokens=args.completion_tokens,
        estimated_cost=args.cost
    )
    if not success:
        sys.exit(1)
