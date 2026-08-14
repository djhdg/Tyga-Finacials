"""
Tyga Financials -> Weltrade MT5 Bridge
========================================

WHAT THIS DOES
--------------
Tyga Financials (the web app) generates signals and writes them to Firestore
(the same backend the app already uses). This script runs on a Windows
machine/VPS with your MetaTrader 5 terminal open and logged into Weltrade.
It polls Firestore for your open positions, and:

  - When a NEW forex signal appears in the app -> opens a matching market
    order on MT5, sized from the app's risk %, with SL set and TP4 as the
    far backstop target.
  - While that position is open, it watches the app's own `tpHit` counter
    (0-4) for that symbol — the app already tracks this from live candles.
    Each time tpHit increases, this bridge closes 25% of the ORIGINAL
    position size on MT5, mirroring a TP1-4 scale-out even though MT5
    positions only support a single native take-profit.
  - When a signal disappears from the app (closed by SL/TP4/session cutoff)
    -> closes whatever's left of the MT5 position too.

It does NOT run any trading logic itself — the app is still the only thing
deciding when/what to trade. This script is purely the "hands" that carry
out what the app already decided, on a broker (Weltrade) that has no API
of its own.

REQUIREMENTS
------------
1. Windows machine or Windows VPS (the MetaTrader5 python package only
   works with a real MT5 terminal running on Windows — it cannot run on
   Linux/Mac, and cannot run headless without the terminal installed).
2. MetaTrader 5 terminal installed, logged into your Weltrade account
   (demo account first — test thoroughly before ever using a real one).
3. Python 3.9+ installed on that same machine.
4. pip install MetaTrader5 requests

SETUP
-----
1. Fill in the CONFIG section below with your details.
2. In MT5, check Tools -> Options -> Expert Advisors -> "Allow algorithmic
   trading" is enabled, and that AutoTrading (top toolbar button) is ON.
3. Run: python weltrade_bridge.py
4. Leave it running. It polls every POLL_SECONDS.

SYMBOL MAPPING
--------------
Weltrade's MT5 symbol names might differ slightly from the plain names
below (e.g. "EURUSD" vs "EURUSDm" vs "EURUSD.m"), depending on your
account type. Check your MT5 "Market Watch" panel for the exact names
and adjust SYMBOL_MAP if needed — the script will tell you clearly if a
symbol isn't found rather than failing silently.

HONESTY NOTE
------------
I can't test this against a live MT5 terminal or your actual Firestore
data from where I'm building it — there is no Windows/MT5 environment
available to me. Test on a demo account first, watch its behavior for a
while, and treat this as a v1 you may need to debug/tune on your end.
"""

import time
import json
import math
import sys
from datetime import datetime, timezone

import requests

try:
    import MetaTrader5 as mt5
except ImportError:
    print("MetaTrader5 package not found. On your Windows machine, run:")
    print("    pip install MetaTrader5 requests")
    sys.exit(1)


# ============================== CONFIG ==============================

# --- Firebase (same project Tyga Financials already uses) ---
FIREBASE_API_KEY = "AIzaSyD_WcsV7Gpe-tVmsuwyXIIOCw37WP3fDFE"   # from the app's firebaseConfig
FIREBASE_PROJECT_ID = "tyga-financials"

# --- Your Tyga Financials login (the SAME username/password you use in the app) ---
TYGA_USERNAME = "your_tyga_username"
TYGA_PASSWORD = "your_tyga_password"

# --- Your Weltrade MT5 account ---
MT5_LOGIN = 12345678            # your Weltrade account number
MT5_PASSWORD = "your_mt5_password"
MT5_SERVER = "Weltrade-Demo"    # exact server name shown in MT5 login screen
MT5_PATH = None                 # optional: r"C:\Program Files\Weltrade MT5\terminal64.exe"

# --- Risk / behaviour ---
POLL_SECONDS = 15               # how often to check Firestore for new/closed signals
DEFAULT_LOT = 0.01              # fallback lot size if risk-based sizing can't be computed
MAX_LOT = 1.0                   # hard safety cap — never send an order bigger than this
MAGIC_NUMBER = 990141           # tag so we can identify trades this bridge opened

# --- Symbol mapping: Tyga Financials symbol -> your MT5 symbol name ---
# Check your MT5 Market Watch panel for the exact spelling Weltrade uses.
SYMBOL_MAP = {
    "frxEURUSD": "EURUSD", "frxGBPUSD": "GBPUSD", "frxUSDJPY": "USDJPY",
    "frxUSDCHF": "USDCHF", "frxUSDCAD": "USDCAD", "frxAUDUSD": "AUDUSD",
    "frxNZDUSD": "NZDUSD", "frxEURGBP": "EURGBP", "frxEURJPY": "EURJPY",
    "frxEURCHF": "EURCHF", "frxEURCAD": "EURCAD", "frxEURAUD": "EURAUD",
    "frxEURNZD": "EURNZD", "frxGBPJPY": "GBPJPY", "frxGBPCHF": "GBPCHF",
    "frxGBPCAD": "GBPCAD", "frxGBPAUD": "GBPAUD", "frxGBPNZD": "GBPNZD",
    "frxAUDJPY": "AUDJPY", "frxAUDCHF": "AUDCHF", "frxAUDCAD": "AUDCAD",
    "frxAUDNZD": "AUDNZD", "frxCADJPY": "CADJPY", "frxCADCHF": "CADCHF",
    "frxCHFJPY": "CHFJPY", "frxNZDJPY": "NZDJPY", "frxNZDCAD": "NZDCAD",
    "frxNZDCHF": "NZDCHF", "frxXAUUSD": "XAUUSD", "frxXAGUSD": "XAGUSD",
}

# =====================================================================


def email_for(username: str) -> str:
    """Mirrors the app's emailFor() — must produce the exact same fake email."""
    clean = "".join(ch for ch in username.lower() if ch.isalnum() or ch in "._-")
    return f"{clean}@tygafinancials.app"


class FirebaseSession:
    """Signs in with the same Firebase Auth email/password scheme the app uses,
    and reads the user's private position data from Firestore over REST."""

    def __init__(self, api_key, project_id, username, password):
        self.api_key = api_key
        self.project_id = project_id
        self.username = username
        self.password = password
        self.id_token = None
        self.uid = None
        self.token_expiry = 0
        self._sign_in()

    def _sign_in(self):
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={self.api_key}"
        payload = {"email": email_for(self.username), "password": self.password, "returnSecureToken": True}
        res = requests.post(url, json=payload, timeout=15)
        if not res.ok:
            raise RuntimeError(f"Firebase sign-in failed: {res.status_code} {res.text[:300]}")
        data = res.json()
        self.id_token = data["idToken"]
        self.uid = data["localId"]
        self.token_expiry = time.time() + int(data.get("expiresIn", 3600)) - 120
        print(f"[auth] Signed in as {self.username} (uid={self.uid[:8]}...)")

    def _ensure_fresh(self):
        if time.time() >= self.token_expiry:
            self._sign_in()

    def get_positions(self):
        """Reads users/{uid}/private/positions:{username} — same doc the app writes to."""
        self._ensure_fresh()
        doc_id = f"positions:{self.username}"
        url = (f"https://firestore.googleapis.com/v1/projects/{self.project_id}"
               f"/databases/(default)/documents/users/{self.uid}/private/{doc_id}")
        res = requests.get(url, headers={"Authorization": f"Bearer {self.id_token}"}, timeout=15)
        if res.status_code == 404:
            return {}
        if not res.ok:
            print(f"[firestore] read failed: {res.status_code} {res.text[:200]}")
            return None
        fields = res.json().get("fields", {})
        raw = fields.get("value", {}).get("stringValue")
        if not raw:
            return {}
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            print("[firestore] could not parse positions JSON")
            return None


def mt5_connect():
    ok = mt5.initialize(path=MT5_PATH) if MT5_PATH else mt5.initialize()
    if not ok:
        raise RuntimeError(f"MT5 initialize() failed: {mt5.last_error()}")
    if not mt5.login(MT5_LOGIN, password=MT5_PASSWORD, server=MT5_SERVER):
        raise RuntimeError(f"MT5 login failed: {mt5.last_error()}")
    info = mt5.account_info()
    print(f"[mt5] Connected — account {info.login} on {info.server}, balance ${info.balance:.2f}")


def compute_lot_size(symbol, risk_usd, sl_price, entry_price):
    """Rough risk-based lot sizing using MT5's own symbol info. Falls back to
    DEFAULT_LOT if anything about the calculation looks off — safer than
    guessing and sending a wrong-sized order."""
    info = mt5.symbol_info(symbol)
    if not info or not risk_usd or not sl_price or not entry_price:
        return DEFAULT_LOT
    point = info.point
    sl_points = abs(entry_price - sl_price) / point if point else 0
    if sl_points <= 0:
        return DEFAULT_LOT
    tick_value = info.trade_tick_value or 1.0
    tick_size = info.trade_tick_size or point
    value_per_point = (tick_value / tick_size) * point if tick_size else tick_value
    if value_per_point <= 0:
        return DEFAULT_LOT
    lots = risk_usd / (sl_points * value_per_point)
    lots = max(info.volume_min, min(lots, MAX_LOT, info.volume_max))
    step = info.volume_step or 0.01
    lots = math.floor(lots / step) * step
    return round(max(lots, info.volume_min), 2)


def open_trade(sym_key, pos):
    mt5_symbol = SYMBOL_MAP.get(sym_key)
    if not mt5_symbol:
        print(f"[skip] No MT5 symbol mapping for {sym_key} — add it to SYMBOL_MAP")
        return None
    if not mt5.symbol_select(mt5_symbol, True):
        print(f"[skip] MT5 doesn't recognise symbol '{mt5_symbol}' — check the exact name in Market Watch")
        return None

    tick = mt5.symbol_info_tick(mt5_symbol)
    if not tick:
        print(f"[skip] No live tick for {mt5_symbol}")
        return None

    is_buy = pos["call"] == "BUY"
    price = tick.ask if is_buy else tick.bid
    sl = pos.get("sl")
    tp4 = pos.get("tp4")  # far backstop — the app's own tpHit tracking drives the real 1-4 scale-out

    lot = compute_lot_size(mt5_symbol, pos.get("_riskUsd"), sl, pos.get("entry"))

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": mt5_symbol,
        "volume": lot,
        "type": mt5.ORDER_TYPE_BUY if is_buy else mt5.ORDER_TYPE_SELL,
        "price": price,
        "sl": sl if sl else 0.0,
        "tp": tp4 if tp4 else 0.0,   # backstop only — TP1-3 are handled as partial closes below
        "deviation": 20,
        "magic": MAGIC_NUMBER,
        "comment": f"TygaFin {sym_key}",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    result = mt5.order_send(request)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        print(f"[error] Order failed for {mt5_symbol}: {result.retcode} {result.comment}")
        return None
    print(f"[opened] {pos['call']} {mt5_symbol} lot={lot} @ {price} SL={sl} TP4-backstop={tp4} ticket={result.order}")
    return {"ticket": result.order, "symbol": mt5_symbol, "original_volume": lot, "tp_hit_mirrored": 0}


def close_trade(ticket, volume=None):
    """Closes a position fully, or partially if `volume` is given (less than the full size)."""
    positions = mt5.positions_get(ticket=ticket)
    if not positions:
        return False
    p = positions[0]
    close_volume = min(volume, p.volume) if volume else p.volume
    if close_volume <= 0:
        return False
    info = mt5.symbol_info(p.symbol)
    step = info.volume_step if info else 0.01
    close_volume = math.floor(close_volume / step) * step
    if close_volume < (info.volume_min if info else 0.01):
        return False  # remaining slice too small for the broker's minimum — leave it for the final close

    tick = mt5.symbol_info_tick(p.symbol)
    is_buy = p.type == mt5.ORDER_TYPE_BUY
    price = tick.bid if is_buy else tick.ask
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": p.symbol,
        "volume": round(close_volume, 2),
        "type": mt5.ORDER_TYPE_SELL if is_buy else mt5.ORDER_TYPE_BUY,
        "position": ticket,
        "price": price,
        "deviation": 20,
        "magic": MAGIC_NUMBER,
        "comment": "TygaFin close",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    result = mt5.order_send(request)
    if result.retcode == mt5.TRADE_RETCODE_DONE:
        full = volume is None or close_volume >= p.volume
        print(f"[{'closed' if full else 'partial-closed'}] ticket={ticket} volume={close_volume}")
        return True
    else:
        print(f"[error] Close failed for ticket={ticket}: {result.retcode} {result.comment}")
        return False


def mirror_tp_progress(sym_key, entry, pos):
    """Compares the app's tpHit (0-4) against what we've already mirrored, and partial-closes
    25% of the original volume for each newly-hit TP level."""
    app_tp_hit = pos.get("tpHit", 0) or 0
    while entry["tp_hit_mirrored"] < app_tp_hit and entry["tp_hit_mirrored"] < 4:
        slice_size = entry["original_volume"] * 0.25
        closed = close_trade(entry["ticket"], volume=slice_size)
        entry["tp_hit_mirrored"] += 1
        if closed:
            print(f"[tp-mirror] {sym_key} reached TP{entry['tp_hit_mirrored']} in the app — partial-closed 25%")


def main():
    print("=== Tyga Financials -> Weltrade MT5 Bridge ===")
    mt5_connect()
    fb = FirebaseSession(FIREBASE_API_KEY, FIREBASE_PROJECT_ID, TYGA_USERNAME, TYGA_PASSWORD)

    known_open = {}   # sym_key -> {"ticket","symbol","original_volume","tp_hit_mirrored"}

    while True:
        try:
            app_positions = fb.get_positions()
            if app_positions is None:
                time.sleep(POLL_SECONDS)
                continue

            app_symbols = set(app_positions.keys())

            # New signals in the app that we haven't opened yet
            for sym_key, pos in app_positions.items():
                if sym_key not in SYMBOL_MAP:
                    continue  # not a Weltrade-forex symbol (e.g. synthetics) — nothing to mirror
                if sym_key not in known_open and pos.get("status") == "open":
                    entry = open_trade(sym_key, pos)
                    if entry:
                        known_open[sym_key] = entry
                elif sym_key in known_open:
                    # Already open — mirror any new TP1-4 progress the app has recorded
                    mirror_tp_progress(sym_key, known_open[sym_key], pos)

            # Signals that disappeared from the app (closed there) — close whatever's left here too
            for sym_key in list(known_open.keys()):
                if sym_key not in app_symbols:
                    close_trade(known_open[sym_key]["ticket"])
                    del known_open[sym_key]

        except Exception as e:
            print(f"[loop error] {e}")

        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
