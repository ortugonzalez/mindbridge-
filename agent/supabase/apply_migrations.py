"""
BRESO — Apply Supabase Migrations
Run this script to apply all SQL migrations to your Supabase project.

Usage:
    cd agent
    python supabase/apply_migrations.py

Requirements: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env
"""
import os
import sys
import httpx
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

MIGRATIONS_DIR = Path(__file__).parent / "migrations"

def run_migration(client: httpx.Client, sql_file: Path) -> bool:
    print(f"  Running {sql_file.name}...")
    sql = sql_file.read_text(encoding="utf-8")
    response = client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        json={"sql": sql},
    )
    if response.status_code == 200:
        print(f"  ✓ {sql_file.name} applied")
        return True
    else:
        # Try via the SQL endpoint instead
        response2 = client.post(
            f"{SUPABASE_URL}/rest/v1/",
            content=sql,
            headers={"Content-Type": "application/sql"},
        )
        if response2.status_code in (200, 201, 204):
            print(f"  ✓ {sql_file.name} applied")
            return True
        print(f"  ⚠️  {sql_file.name}: HTTP {response.status_code}")
        print(f"     Response: {response.text[:300]}")
        print(f"  → Apply manually via Supabase dashboard → SQL Editor")
        return False

def main():
    print(f"\n🚀 BRESO — Applying Supabase Migrations")
    print(f"   Project: {SUPABASE_URL}\n")

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }

    migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not migration_files:
        print("No migration files found in supabase/migrations/")
        return

    with httpx.Client(headers=headers, timeout=30) as client:
        results = []
        for f in migration_files:
            success = run_migration(client, f)
            results.append((f.name, success))

    print("\n📋 Summary:")
    for name, success in results:
        icon = "✓" if success else "✗"
        print(f"   {icon} {name}")

    failed = [n for n, s in results if not s]
    if failed:
        print(f"\n⚠️  {len(failed)} migration(s) could not be auto-applied.")
        print("   Apply them manually in Supabase dashboard → SQL Editor:")
        for name in failed:
            print(f"   → agent/supabase/migrations/{name}")
    else:
        print("\n✅ All migrations applied successfully!")

if __name__ == "__main__":
    main()
