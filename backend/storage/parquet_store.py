"""Parquet and DuckDB storage layer for GoldRaft market data."""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Dict, List, Optional

import duckdb
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
PARQUET_DIR = DATA_DIR / "parquet"
PARQUET_FILE = PARQUET_DIR / "gold_futures.parquet"


def sanitize_record(record: Dict[str, Any]) -> Dict[str, Any]:
    cleaned = {}
    for k, v in record.items():
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            cleaned[k] = None
        elif pd.isna(v):
            cleaned[k] = None
        else:
            cleaned[k] = v
    return cleaned


class ParquetStore:
    def __init__(self, parquet_path: Optional[Path] = None):
        self.parquet_path = parquet_path or PARQUET_FILE
        self.parquet_path.parent.mkdir(parents=True, exist_ok=True)

    def write_records(self, records: List[Dict[str, Any]]) -> int:
        """Write records to parquet table, replacing or appending."""
        if not records:
            return 0

        df_new = pd.DataFrame(records)

        if self.parquet_path.exists():
            try:
                df_existing = pd.read_parquet(self.parquet_path)
                df_combined = pd.concat([df_existing, df_new], ignore_index=True)
                df_combined = df_combined.drop_duplicates(
                    subset=["trade_date", "symbol", "expiry_date"],
                    keep="last",
                )
            except Exception:
                df_combined = df_new
        else:
            df_combined = df_new

        df_combined = df_combined.sort_values(by=["trade_date", "symbol", "expiry_date"])
        df_combined.to_parquet(self.parquet_path, index=False)
        return len(df_combined)

    def read_all(self) -> pd.DataFrame:
        if not self.parquet_path.exists():
            return pd.DataFrame()
        return pd.read_parquet(self.parquet_path)

    def query(
        self,
        symbol: Optional[str] = None,
        expiry: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Query stored records using DuckDB."""
        if not self.parquet_path.exists():
            return []

        con = duckdb.connect(":memory:")
        file_path_str = str(self.parquet_path).replace("\\", "/")
        query = f"SELECT * FROM read_parquet('{file_path_str}') WHERE 1=1"
        params: List[Any] = []

        if symbol:
            query += " AND symbol = ?"
            params.append(symbol.strip().upper())
        if expiry:
            query += " AND expiry_date = ?"
            params.append(expiry.strip())
        if from_date:
            query += " AND trade_date >= ?"
            params.append(from_date)
        if to_date:
            query += " AND trade_date <= ?"
            params.append(to_date)

        query += " ORDER BY trade_date ASC, symbol ASC, expiry_date ASC"

        try:
            rel = con.execute(query, params)
            df = rel.df()
            con.close()
            raw_dicts = df.to_dict(orient="records")
            return [sanitize_record(r) for r in raw_dicts]
        except Exception:
            con.close()
            return []


# Global store instance
_default_store: Optional[ParquetStore] = None


def get_parquet_store() -> ParquetStore:
    global _default_store
    if _default_store is None:
        _default_store = ParquetStore()
    return _default_store
