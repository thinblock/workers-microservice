import { put } from 'superagent';
import { services } from '../config/env';

export const saveLastRun = async (id: string, date: string, output?: any) => {
  await put(`${services.jobs.url}/jobs/${id}`).send({ last_run: { date, output } });
};