var cfg = {};

cfg.SLACK_TOKEN = process.env.SLACK_TOKEN;
cfg.BUILDKITE_WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN;

module.exports = cfg;
