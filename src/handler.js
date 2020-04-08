'use strict';
const AWS = require('aws-sdk');

const setServerState = async ({ running }) => {
  const autoScaling = new AWS.AutoScaling();

  const params = {
    AutoScalingGroupName: process.env.AUTOSCALING_GROUP,
    DesiredCapacity: running ? 1 : 0,
    HonorCooldown: false,
  };

  return autoScaling
    .setDesiredCapacity(params)
    .promise();
}

module.exports.start = async event => {
  if (!event || !event.queryStringParameters || event.queryStringParameters.auth !== process.env.AUTH_TOKEN) {
    return { statusCode: 404, body: '' };
  }
  try {
    await setServerState({ running: true });
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'started/starting...',
      }),
    }
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: e,
      }),
    }
  }
};

module.exports.stop = async event => {
  if (!event || !event.queryStringParameters || event.queryStringParameters.auth !== process.env.AUTH_TOKEN) {
    return { statusCode: 404, body: '' };
  }
  try {
    await setServerState({ running: false });
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'stopped/stopping...',
      }),
    }
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: e,
      }),
    }
  }
};

module.exports.status = async event => {
  if (!event || !event.queryStringParameters || event.queryStringParameters.auth !== process.env.AUTH_TOKEN) {
    return { statusCode: 404, body: '' };
  }
  try {
    const autoScaling = new AWS.AutoScaling();

    const asgResult = await autoScaling.describeAutoScalingGroups({
      AutoScalingGroupNames: [ process.env.AUTOSCALING_GROUP ]
    }).promise()

    if (!asgResult || !asgResult.AutoScalingGroups[0]) {
      return { statusCode: 200, body: JSON.stringify({ message: 'AutoScalingGroup Not Found' }) }
    }

    const asg = asgResult.AutoScalingGroups[0];

    const result = {
      instance: {
        desired: asg.DesiredCapacity,
        count: asg.Instances.length,
      }
    }

    if (!result.instance.count) {
      return { statusCode: 200, body: JSON.stringify(result) };
    }

    const instanceId = asg.Instances[0].InstanceId;

    const ec2 = new AWS.EC2();

    const ec2Result = await ec2.describeInstances({
      InstanceIds: [ instanceId ],
    }).promise();

    if (!ec2Result || !ec2Result.Reservations[0] || !ec2Result.Reservations[0].Instances[0]) {
      result.instance.status = 'no instance data';
      return { statusCode: 200, body: JSON.stringify(result) };
    }

    const instanceData = ec2Result.Reservations[0].Instances[0]

    result.instance.ipAddress = instanceData.PublicIpAddress;
    result.instance.status = instanceData.State.Name;

    if (result.instance.status === 'running') {
      const ecs = new AWS.ECS();


      const ecsResult = await ecs.describeServices({
        cluster: process.env.ECS_CLUSTER,
        services: [ process.env.ECS_SERVICE ]
      }).promise();

      console.log(ecsResult);

      if (!ecsResult || !ecsResult.services[0]) {
        result.service = 'does not exist';
        return { statusCode: 200, body: JSON.stringify(result) };
      }

      const ecsService = ecsResult.services[0];

      result.service = {
        desired: ecsService.desiredCount,
        pending: ecsService.pendingCount,
        running: ecsService.runningCount
      }
    }

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: e,
      }),
    }
  }
};
