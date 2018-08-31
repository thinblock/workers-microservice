import { SNS, SharedIniFileCredentials, config } from 'aws-sdk';

async function init() {
  try {

    config.update({ region: 'ap-southeast-1' });

    const snsClient = new SNS({
      credentials: new SharedIniFileCredentials({ profile: 'thinblock' })
    });

    const topics = [
      'crons_periodical_job_condition_evaluate'
    ];
    const topicsMapper: any = {};

    const res = await Promise.all(topics.map((topic: string) => (
      snsClient.createTopic({ Name: topic }).promise()
    )));

    console.log('============ SNS SETTING =============');

    res.forEach((topic, index) => {
      topicsMapper[topics[index]] = topic.TopicArn;
      console.log('[+] Successfully Created Topic: ', topic.TopicArn);
    });

    Object.assign(process.env, topicsMapper);

    console.log('============ SNS SETTING END =============');

  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}

init();