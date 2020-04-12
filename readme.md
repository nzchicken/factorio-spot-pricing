# Complete Factorio Server Deployment (Serverless)

This project is based on the great work done by [m-chandler](https://github.com/m-chandler/factorio-spot-pricing)

I have extended this project using Serverless framework, with 3 lambda functions 
to control the starting, stopping, and status of the ec2 server running the ecs cluster.

The solution builds upon the [factoriotools/factorio](https://hub.docker.com/r/factoriotools/factorio) Docker image, so generously curated by [the folks over at FactorioTools](https://github.com/orgs/factoriotools/people) (thank you!). 

## Prerequisites

1. A basic understanding of Amazon Web Services.
2. An AWS Account.
3. Basic knowledge of Linux administration (no more than what would be required to just use the `factoriotools/factorio` Docker image).
4. Node 12, NPM, and Ideally serverless framework knowledge

The following key need to be in SSM:

    /factorio/scaling/auth "Some really good super secret string a++"

An SSH key is required to be created in EC2 (Key Pairs section) matching the 
keyPairName setting in the serverless.yml 

## Overview

The stack in itself is the same as listed [in the original fork](https://github.com/m-chandler/factorio-spot-pricing)

The lambdas included in this project just change the DesiredCapacity of the ASG 
which controls how many EC2 instances are available. When setting this back to 
1, it will start the EC2 server, and hopefully the ECS service will notice it 
and start running the container.

## Getting Started

Once you've loaded the SSM key, and SSH Key, it should be as simple as just:

    npm install
    npx sls deploy

NOTE: the server will be running and costing you money as the default 
DesiredCapacity is at 1.

## Next Steps

You should now have 3 lambda endpoints. Serverless is generally nice enough to 
print these to console for you. They will generally be in this format:

```
https://xxxxxxxxxx.execute-api.eu-central-1.amazonaws.com/prod/status
https://xxxxxxxxxx.execute-api.eu-central-1.amazonaws.com/prod/start
https://xxxxxxxxxx.execute-api.eu-central-1.amazonaws.com/prod/stop
```

I've made all the requests to be GET requests purely from excessive laziness. 
This means you can just browse to the URL in your browser, and it will do what 
it says on the box. You will need to add the auth query parameter to the end of 
the url with your SSM key. e.g:

```
https://xxxxxxxxxx.execute-api.eu-central-1.amazonaws.com/prod/status?auth=ssmkeygoeshere
```

The status endpoint should have all the information you need to know:

- Instance info: desired, count, ipAddress, status (ipAddress will be the one 
  you connect to in factorio)
- Service info: desired, pending, running. When running = 1, you should be able 
  to connect

NOTE: It can sometimes take 5 minutes for ECS to realise that the EC2 instance 
is running. Give it a couple of minutes, and hopefully it'll come online.

## Costs

Please see the original fork, but be aware you will pay for:

- EC2 spot instance pricing ($/hour)
- EFS storage ($/GB/month)
- Egress
- And other things I might have forgotten. Lambda free tier is 1mil reqs/month 
  still I think, so you "should" be "fine"

## FAQ

[m-chandler](https://github.com/m-chandler/factorio-spot-pricing) has some
pretty good FAQs, go have a look

**How secure is this not so secure url parameter security thing?**

Not at all. You probably shouldn't do this. URLs (and their params) are 
sometimes in plain sight. This means if you a MITM attack, they can turn your 
factorio server on and off. I hope that's all they can do at least.

**My server keeps getting terminated. I don't like Spot Pricing. Take me back to the good old days.** 

In theory, if you put "AWS::NoValue" as the spotPricing variable, it should go 
to on demand. I don't do this, because I'm cheap :)

**How do I change my instance type?** 

Update the variable in serverless.yml

**How do I change my spot price limit?** 

Update the variable in serverless.yml

**I'm done for the night / week / month / year. How do I turn off my Factorio server?** 

`npx sls remove` should do the trick. You'll need to manually remove the SSM, 
Key Pairs though

**I'm running the "latest" version, and a new version has just been released. How do I update my server?** 

Microsoft fix. Turn the server off and on again, the ECS task will pick the 
latest if you're running latest

## Help / Support

This setup has been tested in eu-central-1. It "should" work "everywhere"

Flick a Issue and/or PR, and I'll try and keep on top of things too.

## Thanks

Thanks to the great work done by [m-chandler](https://github.com/m-chandler/factorio-spot-pricing)

Thanks goes out to [FactorioTools](https://github.com/factoriotools) ([and contributors](https://github.com/factoriotools/factorio-docker/graphs/contributors)) for maintaining the Factorio Docker images.
