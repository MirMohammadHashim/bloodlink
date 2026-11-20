#!/usr/bin/env bash
# Deletes everything so you stop paying. Run this when you're done demoing.
set -euo pipefail

STACK="${STACK_NAME:-bloodlink}"
REGION="${AWS_REGION:-ap-south-1}"

BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text)

echo "==> Emptying bucket $BUCKET"
aws s3 rm "s3://$BUCKET" --recursive --region "$REGION"

echo "==> Deleting stack $STACK (takes ~10-15 min)"
aws cloudformation delete-stack --stack-name "$STACK" --region "$REGION"
aws cloudformation wait stack-delete-complete --stack-name "$STACK" --region "$REGION"
echo "All resources deleted."
