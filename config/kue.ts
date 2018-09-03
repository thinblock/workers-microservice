import { createQueue, Job } from 'kue';
import * as moment from 'moment';
import { logger } from '../utils/logger';
import { saveLastRun } from '../utils/jobs_service';
import { publishMessage } from '../utils/helpers';
import { config } from './env';
import { oneLine } from 'common-tags';

const queue = createQueue({ redis: config.db });

queue.process('cron-periodical-worker', function (job, done) {
  const jobData = job.data;
  evaluateConditions(jobData)
    .then(() => {
      logger.info(oneLine`
        [i] Job (${jobData._id}) with QueueId: ${job.id} finished successfully
      `);
      done();
    })
    .catch((e) => {
      logger.error(oneLine`
        [Err] Job (${jobData._id}) with QueueId: ${job.id} errored
      `, e);
      done(e);
    });
});

async function evaluateConditions(jobData: any) {
  const conditions: ITriggerCondition[] = jobData.trigger.conditions;
  const actions: any[] = jobData.actions;
  const lastRunDate = jobData.last_run && jobData.last_run.date;
  let errored = null;

  const saveSuccessRunDate = async () => {
    try {
      await saveLastRun(jobData._id, jobData.timestamp);
    } catch (e) {
      logger.info(oneLine`
        [Err] Error occurred while saving last_run info of Job: ${jobData._id}
      `, e);
    }
  };

  try {
    // If there is no last run date, then this is the first time they're being run
    // Save the last run date and return

    if (!lastRunDate) {
      logger.info(oneLine`
        [i] Didn't find any last_run_date for Job: ${jobData._id}, Saving current date!
      `);
      await saveSuccessRunDate();
      return true;
    }

    // If there was a last_run_date and its diff with current date is FAR Greater than the
    // saved condition (in mins) than save the last_date with current timestamp and return;
    const lastDiffFromNowMins = Math.round((moment(lastRunDate).diff(moment()) / 1000) / 60);
    const conditionArg = parseInt(conditions[0] ? <string> conditions[0].argument.value : '0');

    if (lastDiffFromNowMins > (conditionArg + 1 )) {
      logger.info(oneLine`
        [i] Found last_run_date FAR Greater than current time for Job: ${jobData._id},
        Saving current date!
      `);
      await saveSuccessRunDate();
      return true;
    }

    // Else, evaluate the conditions
    const timeDiff = moment(jobData.timestamp).diff(moment(lastRunDate));
    const lastRunDiffInMins = Math.round((timeDiff / 1000) / 60);  // miliseconds to secs to mins
    const evaluatedConditions = conditions.map((condition) => {
      // Cron Periodical time will have only 1 condition and that'll be
      // when: 'last_run_date_diff'
      // operation: $eq
      // argument: {
      //  type: 'number'
      //  value: X // value in minutes
      // }
      logger.info(`jobData.timestamp`);

      return lastRunDiffInMins >= condition.argument.value;
    });

    // If all conditions are true, publish actions events
    if (evaluatedConditions.reduce((error, cond) => error && cond, true)) {
      logger.info(`[i] All Conditions true for Job: ${jobData._id}`);
      logger.info(`[i] Publishing events for ${actions.length} actions with Job: ${jobData._id}`);
      await saveSuccessRunDate();
      await publishActions(actions);
      logger.info(oneLine`
        [i] Published events for ${actions.length} actions was successfull
        with Job: ${jobData._id}
      `);
    }
  } catch (e) {
    logger.info(oneLine`
      [Err] Error occurred while publishing events for the actions of Job: ${jobData._id}
    `, e);
    errored = e;
  }

  // Save the last run date even if it errored
  try {
    await saveLastRun(jobData._id, jobData.timestamp);
  } catch (e) {
    logger.info(oneLine`
      [Err] Error occurred while saving last_run info of Job: ${jobData._id}
    `, e);
  }

  if (errored) {
    // TODO: if error, add it to failed jobs queue
    throw errored;
  }

  return true;
}

async function publishActions(actions: any[]) {
  await Promise.all(actions.map((obj: any) => (
    publishMessage(
      obj.action.sns_topic_arn,
      JSON.stringify({
        id: obj.action._id, params: obj.params,
        params_schema: obj.action.params_schema
      })
    )
  )));
}

export function enqueueJob(data: any) {
  return new Promise<Job>((resolve, reject) => {
    const job = queue.create('cron-periodical-worker', data).save((err: Error) => {
      if (err) {
        return reject(err);
      }
      return resolve(job);
    });
  });
}

interface ITriggerCondition {
  when: string;
  _id: string;
  argument: {
    type: string;
    value: string|number|boolean
  };
  operation: string;
}

export default queue;