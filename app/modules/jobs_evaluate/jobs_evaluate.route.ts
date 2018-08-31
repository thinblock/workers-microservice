import JobsEvaluateListener from './jobs_evaluate.listener';
import * as Joi from 'joi';
import { IRoute, IRouteConfig, HttpMethods, AuthStrategies } from '../../interfaces/utils/Route';

class PeriodicalCronRoute implements IRoute {
  public basePath = '/jobs_evaluate';
  public controller = new JobsEvaluateListener();

  public getServerRoutes(): IRouteConfig[] {
    return [
      {
        method: HttpMethods.POST,
        auth: AuthStrategies.PUBLIC,
        handler: this.controller.post,
      }
    ];
  }
}

export default PeriodicalCronRoute;
