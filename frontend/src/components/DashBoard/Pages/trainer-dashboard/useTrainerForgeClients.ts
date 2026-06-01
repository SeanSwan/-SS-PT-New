/**
 * HOOK: useTrainerForgeClients
 * PURPOSE: Loads the correct Workout Forge client selector data for admins
 * and trainers without leaking admin-only roster calls into trainer sessions.
 */
import { useEffect, useState } from 'react';
import {
  normalizeTrainerForgeClients,
  resolveTrainerForgeClientSource,
  type TrainerClient,
} from './TrainerWorkoutForgePage.data';

export const useTrainerForgeClients = (authAxios: any, user: any): TrainerClient[] => {
  const [clients, setClients] = useState<TrainerClient[]>([]);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const source = resolveTrainerForgeClientSource(user);
        const res = await authAxios.get(source.path);
        setClients(normalizeTrainerForgeClients(res.data, source.mode));
      } catch {
        setClients([]);
      }
    };

    loadClients();
  }, [authAxios, user]);

  return clients;
};

export default useTrainerForgeClients;
