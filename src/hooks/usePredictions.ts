import { useState, useCallback } from 'react';
import { Prediction } from '../types';

export function usePredictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const submitPrediction = useCallback(
    async (marketId: string, outcomeId: string, amount: number) => {
      setSubmitting(true);
      try {
        // TODO: Call solanaService.placePrediction
        // TODO: Call backend API to record prediction
        setSubmitting(false);
        return true;
      } catch (error) {
        setSubmitting(false);
        return false;
      }
    },
    []
  );

  const getActivePredictions = useCallback(() => {
    return predictions.filter((p) => p.status === 'pending');
  }, [predictions]);

  const getPredictionHistory = useCallback(() => {
    return predictions;
  }, [predictions]);

  return {
    predictions,
    submitting,
    submitPrediction,
    getActivePredictions,
    getPredictionHistory,
  };
}
