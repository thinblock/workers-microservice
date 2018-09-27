interface EnvConfig {
  root: string;
  name: string;
  port: number;
  env: string;
  debug: boolean;
  db: string;
  snsNotificationARN: string;
  test: boolean;
  aws_region: string;
  jobConditionEvaluateTopicARN: string;
}

export {
  EnvConfig
};