#!/usr/bin/env bash
# After pushing backend changes to Git, replace app servers one by one
# (zero downtime when running 2+ instances). New instances clone the latest code.
set -euo pipefail

STACK="${STACK_NAME:-bloodlink}"
REGION="${AWS_REGION:-ap-south-1}"

ASG=$(aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='AutoScalingGroupName'].OutputValue" --output text)

aws autoscaling start-instance-refresh --region "$REGION" \
  --auto-scaling-group-name "$ASG" \
  --preferences '{"MinHealthyPercentage": 50, "InstanceWarmup": 120}'

echo "Instance refresh started for $ASG. Track it in EC2 > Auto Scaling Groups > Instance refresh."
