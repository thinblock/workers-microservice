import { InternalServerError } from 'restify-errors';
import to from 'await-to-js';
import IController from '../../interfaces/utils/IController';
import { IRequest, IResponse } from '../../interfaces/utils/IServer';
import { validateAndConfirmMessage } from '../../../utils/helpers';
import { Next } from 'restify';
import { enqueueJob } from '../../../config/kue';

export default class PeriodicalCronListener implements IController {
  public async post(req: IRequest, res: IResponse, next: Next) {
    try {
      const notification = JSON.parse(req.body);
      const [err, result] = <[Error, string]> await to(validateAndConfirmMessage(notification));
      if (err || result !== 'success') {
        return res.send(err || result);
      }

      const jobData = {
        ...JSON.parse(notification.Message),
        timestamp: notification.Timestamp
      };
      const job = await enqueueJob(jobData);
      req.log.info('[i] Created job with ID: ', job.id);
      return res.send('ok');
    } catch (e) {
      req.log.error(e);
      return res.send(new InternalServerError());
    }
  }

}
