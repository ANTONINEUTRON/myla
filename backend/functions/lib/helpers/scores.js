"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractStatValue = extractStatValue;
/**
 * Helper: Extract Stat Value from TxODDS scores snapshot
 */
function extractStatValue(scoreData, asset, targetMinute) {
    if (!scoreData || scoreData.length === 0)
        return 0;
    // Find the score entry closest to or after the target strike minute
    let targetEntry = scoreData[0];
    let minDiff = 999;
    for (const entry of scoreData) {
        const entryMin = entry.Minute ?? Math.floor((entry.Clock?.Seconds ?? 0) / 60);
        const diff = Math.abs(entryMin - targetMinute);
        if (diff < minDiff) {
            minDiff = diff;
            targetEntry = entry;
        }
    }
    const stats = targetEntry.Stats || {};
    // Stats mapping from TxODDS Specifications:
    // 1: Participant 1 (P1) Goals, 2: Participant 2 (P2) Goals
    // 3: P1 Corners, 4: P2 Corners
    // 5: P1 Yellow Cards, 6: P2 Yellow Cards
    // 7: P1 Red Cards, 8: P2 Red Cards
    switch (asset.toLowerCase()) {
        case 'goals': {
            const p1Goals = Number(stats['1'] || 0);
            const p2Goals = Number(stats['2'] || 0);
            return p1Goals + p2Goals;
        }
        case 'corners': {
            const p1Corners = Number(stats['3'] || 0);
            const p2Corners = Number(stats['4'] || 0);
            return p1Corners + p2Corners;
        }
        case 'cards': {
            const p1Yellow = Number(stats['5'] || 0);
            const p2Yellow = Number(stats['6'] || 0);
            const p1Red = Number(stats['7'] || 0);
            const p2Red = Number(stats['8'] || 0);
            return p1Yellow + p2Yellow + p1Red + p2Red;
        }
        default:
            return 0;
    }
}
//# sourceMappingURL=scores.js.map