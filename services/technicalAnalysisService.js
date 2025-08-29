/**
 * Technical Analysis Service
 * Implements various technical indicators and trading signals
 * Based on the Python analysis function provided
 */

export class TechnicalAnalysisService {
  /**
   * Calculate Simple Moving Average
   */
  static calculateSMA(data, period) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const sum = data
          .slice(i - period + 1, i + 1)
          .reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    return result;
  }

  /**
   * Calculate Smoothed Moving Average (SMMA)
   */
  static calculateSMMA(data, period) {
    const result = [];
    let smma = 0;

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else if (i === period - 1) {
        // First SMMA value is SMA
        const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
        smma = sum / period;
        result.push(smma);
      } else {
        // SMMA = (SMMA_prev * (period - 1) + current_value) / period
        smma = (smma * (period - 1) + data[i]) / period;
        result.push(smma);
      }
    }
    return result;
  }

  /**
   * Calculate Double Exponential Moving Average (DEMA)
   */
  static calculateDEMA(data, period) {
    const ema1 = this.calculateEMA(data, period);
    const ema2 = this.calculateEMA(
      ema1.filter((v) => v !== null),
      period
    );

    const result = [];
    let ema2Index = 0;

    for (let i = 0; i < ema1.length; i++) {
      if (ema1[i] === null || ema2Index >= ema2.length) {
        result.push(null);
      } else {
        // DEMA = 2 * EMA1 - EMA2
        result.push(2 * ema1[i] - ema2[ema2Index]);
        ema2Index++;
      }
    }
    return result;
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   */
  static calculateEMA(data, period) {
    const result = [];
    const multiplier = 2 / (period + 1);
    let ema = null;

    for (let i = 0; i < data.length; i++) {
      if (data[i] === null) {
        result.push(null);
        continue;
      }

      if (ema === null) {
        ema = data[i];
      } else {
        ema = (data[i] - ema) * multiplier + ema;
      }
      result.push(ema);
    }
    return result;
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  static calculateRSI(data, period = 14) {
    const gains = [];
    const losses = [];
    const rsi = [];

    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate initial RS and RSI
    for (let i = 0; i < gains.length; i++) {
      if (i < period - 1) {
        rsi.push(null);
      } else if (i === period - 1) {
        const avgGain =
          gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        const avgLoss =
          losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - 100 / (1 + rs));
      } else {
        const prevAvgGain =
          gains.slice(i - period + 1, i).reduce((a, b) => a + b, 0) / period;
        const prevAvgLoss =
          losses.slice(i - period + 1, i).reduce((a, b) => a + b, 0) / period;
        const avgGain = (prevAvgGain * (period - 1) + gains[i]) / period;
        const avgLoss = (prevAvgLoss * (period - 1) + losses[i]) / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - 100 / (1 + rs));
      }
    }

    return [null, ...rsi]; // Add null at the beginning to match original data length
  }

  /**
   * Calculate VWAP (Volume Weighted Average Price)
   */
  static calculateVWAP(high, low, close, volume) {
    const result = [];
    let cumulativeTPV = 0; // Typical Price * Volume
    let cumulativeVolume = 0;

    for (let i = 0; i < close.length; i++) {
      const typicalPrice = (high[i] + low[i] + close[i]) / 3;
      const tpv = typicalPrice * volume[i];

      cumulativeTPV += tpv;
      cumulativeVolume += volume[i];

      result.push(
        cumulativeVolume === 0 ? close[i] : cumulativeTPV / cumulativeVolume
      );
    }
    return result;
  }

  /**
   * Calculate SuperTrend indicator
   */
  static calculateSuperTrend(high, low, close, period = 10, multiplier = 3) {
    const hl2 = high.map((h, i) => (h + low[i]) / 2);
    const atr = this.calculateATR(high, low, close, period);
    const upperBand = [];
    const lowerBand = [];
    const superTrend = [];
    const trendDirection = [];

    for (let i = 0; i < close.length; i++) {
      if (i < period - 1) {
        upperBand.push(null);
        lowerBand.push(null);
        superTrend.push(null);
        trendDirection.push(null);
        continue;
      }

      const ub = hl2[i] + multiplier * atr[i];
      const lb = hl2[i] - multiplier * atr[i];

      // Final upper and lower bands
      const finalUB =
        i === 0 || ub < upperBand[i - 1] || close[i - 1] > upperBand[i - 1]
          ? ub
          : upperBand[i - 1];
      const finalLB =
        i === 0 || lb > lowerBand[i - 1] || close[i - 1] < lowerBand[i - 1]
          ? lb
          : lowerBand[i - 1];

      upperBand.push(finalUB);
      lowerBand.push(finalLB);

      // SuperTrend calculation
      let st;
      let trend;

      if (i === 0) {
        st = finalUB;
        trend = 1;
      } else {
        if (superTrend[i - 1] === upperBand[i - 1] && close[i] <= finalUB) {
          st = finalUB;
          trend = 1;
        } else if (
          superTrend[i - 1] === upperBand[i - 1] &&
          close[i] > finalUB
        ) {
          st = finalLB;
          trend = -1;
        } else if (
          superTrend[i - 1] === lowerBand[i - 1] &&
          close[i] >= finalLB
        ) {
          st = finalLB;
          trend = -1;
        } else if (
          superTrend[i - 1] === lowerBand[i - 1] &&
          close[i] < finalLB
        ) {
          st = finalUB;
          trend = 1;
        } else {
          st = superTrend[i - 1];
          trend = trendDirection[i - 1];
        }
      }

      superTrend.push(st);
      trendDirection.push(trend);
    }

    return { superTrend, trendDirection };
  }

  /**
   * Calculate Average True Range (ATR)
   */
  static calculateATR(high, low, close, period = 14) {
    const trueRange = [];

    for (let i = 0; i < high.length; i++) {
      if (i === 0) {
        trueRange.push(high[i] - low[i]);
      } else {
        const tr1 = high[i] - low[i];
        const tr2 = Math.abs(high[i] - close[i - 1]);
        const tr3 = Math.abs(low[i] - close[i - 1]);
        trueRange.push(Math.max(tr1, tr2, tr3));
      }
    }

    return this.calculateSMA(trueRange, period);
  }

  /**
   * Calculate Bollinger Bands
   */
  static calculateBollingerBands(data, period = 20, stdDev = 2) {
    const sma = this.calculateSMA(data, period);
    const upperBand = [];
    const lowerBand = [];
    const middleBand = sma;

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        upperBand.push(null);
        lowerBand.push(null);
      } else {
        const slice = data.slice(i - period + 1, i + 1);
        const mean = sma[i];
        const variance =
          slice.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
          period;
        const standardDeviation = Math.sqrt(variance);

        upperBand.push(mean + stdDev * standardDeviation);
        lowerBand.push(mean - stdDev * standardDeviation);
      }
    }

    return { upperBand, middleBand, lowerBand };
  }

  /**
   * Calculate volume average with window
   */
  static calculateVolumeAverage(volume, window = 30) {
    return this.calculateSMA(volume, window);
  }

  /**
   * Detect trend changes in SuperTrend
   */
  static detectTrendChanges(trendDirection) {
    const changes = [];

    for (let i = 1; i < trendDirection.length; i++) {
      if (trendDirection[i - 1] !== null && trendDirection[i] !== null) {
        if (trendDirection[i - 1] === 1 && trendDirection[i] === -1) {
          changes.push("green_to_red"); // Breakdown
        } else if (trendDirection[i - 1] === -1 && trendDirection[i] === 1) {
          changes.push("red_to_green"); // Breakout
        } else {
          changes.push("no_change");
        }
      } else {
        changes.push("no_change");
      }
    }

    return ["no_change", ...changes];
  }

  /**
   * Detect breakout/breakdown patterns
   */
  static detectBreakoutPatterns(data) {
    const { close, high, low, volume, dates } = data;

    // Calculate all indicators
    const vwap = this.calculateVWAP(high, low, close, volume);
    const smma = this.calculateSMMA(close, 7);
    const dema = this.calculateDEMA(close, 10);
    const rsi = this.calculateRSI(close);
    const { superTrend, trendDirection } = this.calculateSuperTrend(
      high,
      low,
      close
    );
    const { middleBand: bbm } = this.calculateBollingerBands(close, 20, 2);
    const volumeAvg = this.calculateVolumeAverage(volume, 30);

    // Calculate percentage changes
    const pctChange = close.map((price, i) =>
      i === 0 ? 0 : ((price - close[i - 1]) / close[i - 1]) * 100
    );

    // Calculate volume change percentage
    const volChange = volume.map((vol, i) =>
      volumeAvg[i] ? ((vol - volumeAvg[i]) / volumeAvg[i]) * 100 : 0
    );

    // Detect trend changes
    const trendChanges = this.detectTrendChanges(trendDirection);

    // Detect pattern conditions
    const signals = [];

    for (let i = 1; i < close.length; i++) {
      if (!bbm[i] || !smma[i] || !dema[i]) continue;

      const isBearishCondition = bbm[i] < smma[i] && smma[i] < dema[i];
      const isBullishCondition = bbm[i] > smma[i] && smma[i] > dema[i];
      const isBreakout = trendChanges[i] === "red_to_green";
      const isBreakdown = trendChanges[i] === "green_to_red";

      let signal = null;

      if (isBreakout && isBullishCondition) {
        signal = "Breakout";
      } else if (isBreakdown && isBearishCondition) {
        signal = "Breakdown";
      } else if (isBreakout) {
        signal = "ST Breakout";
      } else if (isBreakdown) {
        signal = "ST Breakdown";
      }

      if (signal) {
        signals.push({
          date: dates[i],
          close: close[i],
          vwap: vwap[i],
          pctChange: pctChange[i],
          volume: volume[i],
          volChange: volChange[i],
          averageVolume: volumeAvg[i],
          signal: signal,
          rsi: rsi[i],
          superTrend: superTrend[i],
          bbm: bbm[i],
          smma: smma[i],
          dema: dema[i],
        });
      }
    }

    return signals;
  }

  /**
   * Format percentage values for display
   */
  static formatPercentage(value) {
    if (value === null || value === undefined || isNaN(value)) {
      return "N/A";
    }
    return `${value.toFixed(2)}%`;
  }

  /**
   * Calculate next targets based on pivot points
   */
  static calculateNextTargets(currentPrice, signal, pivotData = null) {
    if (!pivotData) {
      // Simple targets based on percentage moves
      const targets = [];
      if (signal.includes("Breakout")) {
        targets.push(currentPrice * 1.02); // 2% upside
        targets.push(currentPrice * 1.05); // 5% upside
        targets.push(currentPrice * 1.1); // 10% upside
      } else if (signal.includes("Breakdown")) {
        targets.push(currentPrice * 0.98); // 2% downside
        targets.push(currentPrice * 0.95); // 5% downside
        targets.push(currentPrice * 0.9); // 10% downside
      }
      return targets;
    }

    // Use pivot points if available
    const { pivot, r1, r2, r3, s1, s2, s3 } = pivotData;

    if (signal.includes("Breakout")) {
      return [r1, r2, r3].filter((target) => target > currentPrice);
    } else if (signal.includes("Breakdown")) {
      return [s1, s2, s3].filter((target) => target < currentPrice);
    }

    return [];
  }

  /**
   * Main analysis function - equivalent to the Python stock_screen function
   */
  static analyzeStock(stockData, symbol) {
    try {
      // Extract data arrays from stock data
      const data = {
        close: stockData.map((d) => d.close),
        high: stockData.map((d) => d.high),
        low: stockData.map((d) => d.low),
        volume: stockData.map((d) => d.volume),
        dates: stockData.map((d) => d.date),
      };

      // Detect breakout patterns
      const signals = this.detectBreakoutPatterns(data);

      // Format the results
      const formattedSignals = signals.map((signal) => ({
        symbol: symbol.split(".")[0],
        date: signal.date,
        close: signal.close.toFixed(2),
        vwap: signal.vwap.toFixed(2),
        pctChange: this.formatPercentage(signal.pctChange),
        volume: signal.volume,
        volChange: this.formatPercentage(signal.volChange),
        averageVolume: signal.averageVolume?.toFixed(0) || "N/A",
        nextTargets: this.calculateNextTargets(signal.close, signal.signal),
        signal: signal.signal,
        rsi: signal.rsi?.toFixed(2) || "N/A",
      }));

      return {
        success: true,
        signals: formattedSignals,
        totalSignals: formattedSignals.length,
      };
    } catch (error) {
      console.error("Error in technical analysis:", error);
      return {
        success: false,
        error: error.message,
        signals: [],
      };
    }
  }
}

export default TechnicalAnalysisService;
