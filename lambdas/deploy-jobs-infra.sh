#!/usr/bin/env bash
# Deploy all job-scraping infrastructure to AWS eu-west-2.
# Run from the repo root: bash lambdas/deploy-jobs-infra.sh

set -euo pipefail

REGION="eu-west-2"
ACCOUNT_ID="225771711899"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/sponsormap-lambda-role"

echo "=== SponsorMap Jobs Infrastructure Deploy ==="
echo "Region: $REGION | Account: $ACCOUNT_ID"
echo ""

# ─── 1. SQS queues ────────────────────────────────────────────────────────────

echo "--- Creating SQS DLQ: sponsormap-jobs-dlq"
DLQ_URL=$(aws sqs create-queue \
  --queue-name sponsormap-jobs-dlq \
  --region "$REGION" \
  --query QueueUrl --output text 2>/dev/null || \
  aws sqs get-queue-url --queue-name sponsormap-jobs-dlq --region "$REGION" --query QueueUrl --output text)
DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url "$DLQ_URL" \
  --attribute-names QueueArn \
  --region "$REGION" \
  --query Attributes.QueueArn --output text)
echo "  DLQ URL: $DLQ_URL"
echo "  DLQ ARN: $DLQ_ARN"

echo "--- Creating SQS Queue: sponsormap-jobs-queue"
QUEUE_URL=$(aws sqs create-queue \
  --queue-name sponsormap-jobs-queue \
  --region "$REGION" \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${DLQ_ARN}\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}" \
  --query QueueUrl --output text 2>/dev/null || \
  aws sqs get-queue-url --queue-name sponsormap-jobs-queue --region "$REGION" --query QueueUrl --output text)
QUEUE_ARN=$(aws sqs get-queue-attributes \
  --queue-url "$QUEUE_URL" \
  --attribute-names QueueArn \
  --region "$REGION" \
  --query Attributes.QueueArn --output text)
echo "  Queue URL: $QUEUE_URL"
echo "  Queue ARN: $QUEUE_ARN"

# ─── 2. Package Lambda functions ──────────────────────────────────────────────

TYPESENSE_HOST=$(aws secretsmanager get-secret-value \
  --secret-id prod/typesense-host --region "$REGION" \
  --query SecretString --output text)
TYPESENSE_ADMIN_KEY=$(aws secretsmanager get-secret-value \
  --secret-id prod/typesense-admin-key --region "$REGION" \
  --query SecretString --output text)

pack_lambda() {
  local name=$1
  local dir=$2
  local entry=$3
  echo "--- Packaging Lambda: $name"
  local tmpdir
  tmpdir=$(mktemp -d)
  cp "$dir"/*.mjs "$tmpdir/"
  # Install deps if package.json present
  if [ -f "$dir/package.json" ]; then
    cp "$dir/package.json" "$tmpdir/"
    (cd "$tmpdir" && npm install --omit=dev --quiet)
  fi
  (cd "$tmpdir" && zip -r /tmp/"${name}".zip . -x "*.sh" > /dev/null)
  rm -rf "$tmpdir"
  echo "  Packaged: /tmp/${name}.zip"
}

pack_lambda "greenhouse-scraper" "lambdas/job-scrapers" "greenhouse.mjs"
pack_lambda "lever-scraper"      "lambdas/job-scrapers" "lever.mjs"
pack_lambda "workday-scraper"    "lambdas/job-scrapers" "workday.mjs"
pack_lambda "ashby-scraper"      "lambdas/job-scrapers" "ashby.mjs"
pack_lambda "job-dispatcher"     "lambdas/job-scrapers" "dispatcher.mjs"

# Job expiry — separate dir
echo "--- Packaging Lambda: job-expiry"
tmpdir=$(mktemp -d)
cp lambdas/job-expiry/index.mjs "$tmpdir/"
cp lambdas/job-expiry/package.json "$tmpdir/"
(cd "$tmpdir" && npm install --omit=dev --quiet)
(cd "$tmpdir" && zip -r /tmp/job-expiry.zip . > /dev/null)
rm -rf "$tmpdir"
echo "  Packaged: /tmp/job-expiry.zip"

# ─── 3. Deploy / update Lambda functions ─────────────────────────────────────

COMMON_ENV="Variables={TYPESENSE_HOST=${TYPESENSE_HOST},TYPESENSE_ADMIN_KEY=${TYPESENSE_ADMIN_KEY}}"

deploy_lambda() {
  local fn_name=$1
  local zip_file=$2
  local handler=$3
  local extra_env=${4:-""}
  echo "--- Deploying Lambda: $fn_name"

  local env_vars="$COMMON_ENV"
  if [ -n "$extra_env" ]; then
    # Merge extra env into Variables map
    env_vars="${COMMON_ENV%\}},${extra_env}\}"
  fi

  if aws lambda get-function --function-name "$fn_name" --region "$REGION" &>/dev/null; then
    aws lambda update-function-code \
      --function-name "$fn_name" \
      --zip-file "fileb://$zip_file" \
      --region "$REGION" \
      --no-cli-pager > /dev/null
    aws lambda update-function-configuration \
      --function-name "$fn_name" \
      --handler "$handler" \
      --runtime nodejs22.x \
      --timeout 300 \
      --memory-size 512 \
      --environment "$env_vars" \
      --region "$REGION" \
      --no-cli-pager > /dev/null
    echo "  Updated"
  else
    aws lambda create-function \
      --function-name "$fn_name" \
      --runtime nodejs22.x \
      --role "$ROLE_ARN" \
      --handler "$handler" \
      --zip-file "fileb://$zip_file" \
      --timeout 300 \
      --memory-size 512 \
      --environment "$env_vars" \
      --region "$REGION" \
      --no-cli-pager > /dev/null
    echo "  Created"
  fi
}

deploy_lambda "sponsormap-greenhouse-scraper" "/tmp/greenhouse-scraper.zip" "greenhouse.handler"
deploy_lambda "sponsormap-lever-scraper"      "/tmp/lever-scraper.zip"      "lever.handler"
deploy_lambda "sponsormap-workday-scraper"    "/tmp/workday-scraper.zip"    "workday.handler"
deploy_lambda "sponsormap-ashby-scraper"      "/tmp/ashby-scraper.zip"      "ashby.handler"
deploy_lambda "sponsormap-job-dispatcher"     "/tmp/job-dispatcher.zip"     "dispatcher.handler" "SQS_QUEUE_URL=${QUEUE_URL}"
deploy_lambda "sponsormap-job-expiry"         "/tmp/job-expiry.zip"         "index.handler"

# ─── 4. SQS → scraper Lambda triggers ────────────────────────────────────────

echo "--- Setting up SQS event source mappings..."

add_esm() {
  local fn_name=$1
  local ats_type=$2
  # Check if mapping exists
  local existing
  existing=$(aws lambda list-event-source-mappings \
    --function-name "$fn_name" \
    --region "$REGION" \
    --query "EventSourceMappings[?EventSourceArn=='${QUEUE_ARN}'].UUID" \
    --output text)
  if [ -z "$existing" ]; then
    aws lambda create-event-source-mapping \
      --function-name "$fn_name" \
      --event-source-arn "$QUEUE_ARN" \
      --batch-size 10 \
      --filter-criteria "{\"Filters\":[{\"Pattern\":\"{\\\"messageAttributes\\\":{\\\"atsType\\\":{\\\"stringValue\\\":[\\\"${ats_type}\\\"]}}}\"} ]}" \
      --region "$REGION" \
      --no-cli-pager > /dev/null
    echo "  Created ESM for $fn_name ($ats_type)"
  else
    echo "  ESM already exists for $fn_name"
  fi
}

add_esm "sponsormap-greenhouse-scraper" "Greenhouse"
add_esm "sponsormap-lever-scraper"      "Lever"
add_esm "sponsormap-workday-scraper"    "Workday"
add_esm "sponsormap-ashby-scraper"      "Ashby"

# ─── 5. EventBridge schedules ─────────────────────────────────────────────────

echo "--- Creating EventBridge rules..."

DISPATCHER_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:sponsormap-job-dispatcher"
EXPIRY_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:sponsormap-job-expiry"

create_eb_rule() {
  local rule_name=$1
  local schedule=$2
  local target_arn=$3
  local target_id="${rule_name}-target"

  aws events put-rule \
    --name "$rule_name" \
    --schedule-expression "$schedule" \
    --state ENABLED \
    --region "$REGION" \
    --no-cli-pager > /dev/null

  aws events put-targets \
    --rule "$rule_name" \
    --targets "Id=${target_id},Arn=${target_arn}" \
    --region "$REGION" \
    --no-cli-pager > /dev/null

  # Grant EventBridge permission to invoke Lambda
  aws lambda add-permission \
    --function-name "$target_arn" \
    --statement-id "${rule_name}-invoke" \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/${rule_name}" \
    --region "$REGION" \
    --no-cli-pager > /dev/null 2>&1 || true

  echo "  Created rule: $rule_name ($schedule)"
}

create_eb_rule "sponsormap-job-scraper-daily" "cron(0 9 * * ? *)" "$DISPATCHER_ARN"
create_eb_rule "sponsormap-job-expiry-daily"  "cron(0 22 * * ? *)" "$EXPIRY_ARN"

echo ""
echo "=== Deploy complete! ==="
echo "Queue URL: $QUEUE_URL"
echo "Next: run dispatcher manually to seed initial jobs."
echo "  aws lambda invoke --function-name sponsormap-job-dispatcher --region $REGION /tmp/dispatcher-out.json"
echo "  cat /tmp/dispatcher-out.json"
