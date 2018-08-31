interface EnvConfig {
  root: string;
  name: string;
  port: number;
  env: string;
  debug: boolean;
  db: string;
  test: boolean;
  jobConditionEvaluateTopicARN: string;
}

export {
  EnvConfig
};