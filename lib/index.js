var config      = require('./cfg');
var _           = require('lodash');
var Promise     = require('bluebird');
var slack       = require('slack');
var bodyParser  = require('body-parser');
var express     = require('express');
var app         = express();

app.use(bodyParser.json());

app.post('/', function(req, res){

  // Verify token
  if (req.headers['x-buildkite-token'] != config.BUILDKITE_WEBHOOK_TOKEN) {
    console.log("Invalid webhook token");
    return res.status(401).send('Invalid token');
  }

  res.send('AOK'); // ACK buildkite. We can handle the rest after the response

  var buildEvent = req.body;
  var build = buildEvent.build;
  var pipeline = buildEvent.pipeline;

  // lookup every time. ensures any new users are included. less intensive API
  // usage would be to setup a daily lookup interval instead, but leaves gaps.
  getSlackUsers()
    .then(function (slackProfiles) {
      var details = {};
      details.SLACK_USER_ID = _.find(slackProfiles, { email: build.creator.email }).id;
      details.GITHUB_REPO = pipeline.repository.split('@').pop().replace(':','/').slice(0,-4);
      details.GITHUB_LINK = 'https://' + details.GITHUB_REPO + '/commit/' + build.commit;

      var text = `
        :warning: A build you initiated for *${pipeline.name}* has *${build.state}* on branch *${build.branch}*!!
        Build message: \`${build.message}\`
        See more detail here:
          ${build.web_url}
        The changes made since last build are avialable here:
          ${details.GITHUB_LINK}
      `;

      // message users directly only on failures
//      if (build.state === 'failed') {
        slack.chat.postMessage({
          token: config.SLACK_TOKEN,
          channel: details.SLACK_USER_ID,
          text: text
        }, function (err, data) {
          if (err) {
            throw err;
          }
        });
//      }
    })
    .catch((e) => {
      console.log(e);
    });
});

app.listen(process.env.PORT || 3000, function() {
  console.log('Express listening on port', this.address().port);
});

function getSlackUsers() {
  return new Promise(function (resolve, reject) {
    slack.users.list({token:config.SLACK_TOKEN}, (err, data)=>{
      if (err) {
        return reject(err);
      }

      // get user profiles for users' Slack DM channel lookup
      var users = data.members;
      var profiles = _.map(users, (user) => { return {
        id: user.id,
        name: user.name,
        email: user.profile.email
      }; });

      return resolve(profiles);
    });
  });
}

