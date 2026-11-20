#!/usr/bin/env bash
# Creates/updates the whole AWS stack, then uploads the frontend to S3.
# Usage: ./scripts/deploy.sh https://github.com/<you>/bloodlink.git
set -euo pipefail
cd "$(dirname "$0")/.."

REPO_URL="${1:?Usage: ./scripts/deploy.sh <public-git-repo-url>}"
STACK="${STACK_NAME:-bloodlink}"
REGION="${AWS_REGION:-ap-south-1}"   # Mumbai

output() {
  aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

echo "==> Deploying CloudFormation stack '$STACK' in $REGION (first run takes ~15 min)"
aws cloudformation deploy \
  --stack-name "$STACK" \
  --region "$REGION" \
  --template-file infrastructure/bloodlink.yaml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides RepoUrl="$REPO_URL"

echo "==> Uploading frontend to S3"
aws s3 sync frontend/ "s3://$(output FrontendBucketName)" --delete --region "$REGION"

echo "==> Clearing CloudFront cache"
aws cloudfront create-invalidation --distribution-id "$(output DistributionId)" --paths '/*' >/dev/null

echo
echo "BloodLink is live at: $(output WebsiteURL)"
