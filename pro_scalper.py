"""
ProScalper — Kalman-filtered mean-reversion scalping indicator.

Plots adaptive volatility bands around a Kalman-filtered baseline price.
Generates contrarian BUY signals at the lower band and SELL signals at the
upper band. Designed for 30m-Daily timeframes on futures/crypto/forex.
"""

import numpy as np
import pandas as pd


class ProScalper:
    def __init__(
        self,
        atr_period: int = 10,
        band_mult: float = 2.0,
        kalman_q: float = 0.03,
        kalman_r: float = 1.5,
        use_trend_bias: bool = False,
        use_adx_filter: bool = False,
        use_volume_filter: bool = False,
        cooldown_bars: int = 0,
    ):
        self.atr_period = atr_period
        self.band_mult = band_mult
        self.kalman_q = kalman_q
        self.kalman_r = kalman_r
        self.use_trend_bias = use_trend_bias
        self.use_adx_filter = use_adx_filter
        self.use_volume_filter = use_volume_filter
        self.cooldown_bars = cooldown_bars

    # ---------------------------------------------------------------- #
    # Core math
    # ---------------------------------------------------------------- #
    def _kalman_baseline(self, price: np.ndarray) -> np.ndarray:
        n = len(price)
        x = np.zeros(n)
        P = np.zeros(n)
        x[0] = price[0]
        P[0] = 1.0
        for i in range(1, n):
            x_pred = x[i - 1]
            P_pred = P[i - 1] + self.kalman_q
            K = P_pred / (P_pred + self.kalman_r)
            x[i] = x_pred + K * (price[i] - x_pred)
            P[i] = (1 - K) * P_pred
        return x

    @staticmethod
    def _true_range(high: np.ndarray, low: np.ndarray, close: np.ndarray) -> np.ndarray:
        n = len(close)
        tr = np.zeros(n)
        tr[0] = high[0] - low[0]
        for i in range(1, n):
            tr[i] = max(
                high[i] - low[i],
                abs(high[i] - close[i - 1]),
                abs(low[i] - close[i - 1]),
            )
        return tr

    def _atr(self, high: np.ndarray, low: np.ndarray, close: np.ndarray) -> np.ndarray:
        tr = self._true_range(high, low, close)
        n = len(tr)
        atr = np.zeros(n)
        p = self.atr_period
        if n == 0:
            return atr
        atr[: min(p, n)] = np.nan
        if n >= p:
            atr[p - 1] = tr[:p].mean()
            for i in range(p, n):
                atr[i] = (atr[i - 1] * (p - 1) + tr[i]) / p
        return atr

    @staticmethod
    def _ema(values: np.ndarray, period: int) -> np.ndarray:
        n = len(values)
        out = np.full(n, np.nan)
        if n < period:
            return out
        k = 2 / (period + 1)
        out[period - 1] = values[:period].mean()
        for i in range(period, n):
            out[i] = values[i] * k + out[i - 1] * (1 - k)
        return out

    def _adx(self, high: np.ndarray, low: np.ndarray, close: np.ndarray, period: int = 14) -> np.ndarray:
        n = len(close)
        if n < period * 2 + 1:
            return np.full(n, np.nan)
        plus_dm = np.zeros(n)
        minus_dm = np.zeros(n)
        tr = self._true_range(high, low, close)
        for i in range(1, n):
            up = high[i] - high[i - 1]
            down = low[i - 1] - low[i]
            plus_dm[i] = up if (up > down and up > 0) else 0
            minus_dm[i] = down if (down > up and down > 0) else 0

        def wilder_smooth(arr):
            out = np.zeros(n)
            out[period] = arr[1:period + 1].sum()
            for i in range(period + 1, n):
                out[i] = out[i - 1] - (out[i - 1] / period) + arr[i]
            return out

        s_tr = wilder_smooth(tr)
        s_plus = wilder_smooth(plus_dm)
        s_minus = wilder_smooth(minus_dm)
        plus_di = 100 * np.divide(s_plus, s_tr, out=np.zeros(n), where=s_tr != 0)
        minus_di = 100 * np.divide(s_minus, s_tr, out=np.zeros(n), where=s_tr != 0)
        dx = 100 * np.abs(plus_di - minus_di) / np.where((plus_di + minus_di) == 0, 1, plus_di + minus_di)
        adx = np.full(n, np.nan)
        if n >= period * 2:
            adx[period * 2 - 1] = dx[period:period * 2].mean()
            for i in range(period * 2, n):
                adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period
        return adx

    # ---------------------------------------------------------------- #
    # Public API
    # ---------------------------------------------------------------- #
    def calculate(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Input df columns: open, high, low, close, volume (optional)
        Returns df with added columns:
          baseline, upper, lower, atr,
          buy_signal (bool), sell_signal (bool),
          buy_sl, buy_tp, sell_sl, sell_tp,
          entry_zone_top, entry_zone_bottom
        """
        out = df.copy().reset_index(drop=True)
        close = out["close"].to_numpy(dtype=float)
        high = out["high"].to_numpy(dtype=float)
        low = out["low"].to_numpy(dtype=float)
        n = len(out)

        baseline = self._kalman_baseline(close)
        atr = self._atr(high, low, close)
        upper = baseline + atr * self.band_mult
        lower = baseline - atr * self.band_mult

        out["baseline"] = baseline
        out["upper"] = upper
        out["lower"] = lower
        out["atr"] = atr

        buy_signal = np.zeros(n, dtype=bool)
        sell_signal = np.zeros(n, dtype=bool)
        buy_sl = np.full(n, np.nan)
        buy_tp = np.full(n, np.nan)
        sell_sl = np.full(n, np.nan)
        sell_tp = np.full(n, np.nan)
        ez_top = np.full(n, np.nan)
        ez_bot = np.full(n, np.nan)

        ema50 = self._ema(close, 50) if self.use_trend_bias else None
        adx = self._adx(high, low, close, 14) if self.use_adx_filter else None
        vol_ok = np.ones(n, dtype=bool)
        if self.use_volume_filter and "volume" in out.columns:
            volume = out["volume"].to_numpy(dtype=float)
            vol_sma = pd.Series(volume).rolling(20).mean().to_numpy()
            vol_ok = volume >= vol_sma * 1.2

        last_buy_bar = -10 ** 9
        last_sell_bar = -10 ** 9

        for i in range(5, n):
            if np.isnan(atr[i]) or atr[i] == 0:
                continue

            buy_cond = (low[i] <= lower[i] or close[i] <= lower[i] * 1.005) and \
                       (close[i] > baseline[i] - atr[i] * 0.5)
            sell_cond = (high[i] >= upper[i] or close[i] >= upper[i] * 0.995) and \
                        (close[i] < baseline[i] + atr[i] * 0.5)

            if self.use_trend_bias and ema50 is not None and not np.isnan(ema50[i]):
                buy_cond = buy_cond and close[i] > ema50[i]
                sell_cond = sell_cond and close[i] < ema50[i]
            if self.use_adx_filter and adx is not None and not np.isnan(adx[i]):
                buy_cond = buy_cond and adx[i] >= 20
                sell_cond = sell_cond and adx[i] >= 20
            if self.use_volume_filter:
                buy_cond = buy_cond and vol_ok[i]
                sell_cond = sell_cond and vol_ok[i]

            if buy_cond and (i - last_buy_bar) >= self.cooldown_bars:
                buy_signal[i] = True
                last_buy_bar = i
                window_low = low[max(0, i - 4): i + 1].min()
                buy_sl[i] = window_low - atr[i] * 0.5
                buy_tp[i] = baseline[i]
                ez_bot[i] = lower[i] - atr[i] * 0.2
                ez_top[i] = lower[i] + atr[i] * 0.3

            if sell_cond and (i - last_sell_bar) >= self.cooldown_bars:
                sell_signal[i] = True
                last_sell_bar = i
                window_high = high[max(0, i - 4): i + 1].max()
                sell_sl[i] = window_high + atr[i] * 0.5
                sell_tp[i] = baseline[i]
                ez_bot[i] = upper[i] - atr[i] * 0.3
                ez_top[i] = upper[i] + atr[i] * 0.2

        out["buy_signal"] = buy_signal
        out["sell_signal"] = sell_signal
        out["buy_sl"] = buy_sl
        out["buy_tp"] = buy_tp
        out["sell_sl"] = sell_sl
        out["sell_tp"] = sell_tp
        out["entry_zone_top"] = ez_top
        out["entry_zone_bottom"] = ez_bot
        return out

    def get_signals(self, df: pd.DataFrame) -> list[dict]:
        """
        Returns list of signal dicts for bars where signals fired:
        {
            'bar_index': int,
            'timestamp': pd.Timestamp,
            'side': 'BUY' | 'SELL',
            'entry': float,
            'stop_loss': float,
            'take_profit': float,
            'entry_zone': [float, float],
            'confidence': float  # 0.0-1.0, higher = closer to band extreme
        }
        """
        calc = self.calculate(df)
        signals = []
        has_ts = "timestamp" in calc.columns

        for i in range(len(calc)):
            row = calc.iloc[i]
            if row["buy_signal"]:
                band_width = row["baseline"] - row["lower"]
                depth = (row["baseline"] - row["close"]) / band_width if band_width else 0
                signals.append({
                    "bar_index": i,
                    "timestamp": row["timestamp"] if has_ts else None,
                    "side": "BUY",
                    "entry": float(row["close"]),
                    "stop_loss": float(row["buy_sl"]),
                    "take_profit": float(row["buy_tp"]),
                    "entry_zone": [float(row["entry_zone_bottom"]), float(row["entry_zone_top"])],
                    "confidence": float(np.clip(depth, 0, 1)),
                })
            if row["sell_signal"]:
                band_width = row["upper"] - row["baseline"]
                depth = (row["close"] - row["baseline"]) / band_width if band_width else 0
                signals.append({
                    "bar_index": i,
                    "timestamp": row["timestamp"] if has_ts else None,
                    "side": "SELL",
                    "entry": float(row["close"]),
                    "stop_loss": float(row["sell_sl"]),
                    "take_profit": float(row["sell_tp"]),
                    "entry_zone": [float(row["entry_zone_bottom"]), float(row["entry_zone_top"])],
                    "confidence": float(np.clip(depth, 0, 1)),
                })
        return signals
