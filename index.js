var googleapis = require('googleapis');

module.exports = robot => {
    robot.on('issues', check);
    robot.on('issue_comment', check);
    robot.on('pull_request', check);
    async function check(context) {
        //This is used to compare to the data we get from the Perspective API
        const toxicity_low_threshold = .5;
        const toxicity_high_threshold = .8;

        robot.log(context.payload);
        let context_issue = context.payload.issue || context.payload.pull_request;
        if (!context.payload.issue) {
            context_issue = (await context.github.issues.get(context.issue())).data;
        }

        if (context.payload.comment) {
            //robot.log("this is actually a comment!");
            var body = context.payload.comment.body;
        } else {
            var body = context_issue.body;
        }
        
        robot.log(body);
        
        //attempt to make perspective api requests template from google
        discovery_url = 'https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1'

        googleapis.discoverAPI(discovery_url, (err, client) => {
            if (err) throw err;
            var analyze_request = {
                comment: {'text': body},
                requestedAttributes: {'TOXICITY': {}}
            };
            client.comments.analyze({key: process.env.PERSPECTIVE_API_KEY, resource: analyze_request}, (err, response) => {
                if (err) throw err;
                //robot.log(JSON.stringify(response, null, 2));
                var toxic_value = response.attributeScores.TOXICITY.spanScores[0].score.value
                robot.log(toxic_value);

                if (toxic_value >= toxicity_high_threshold) {
                    robot.log("That comment was very toxic.");
                    var template = 'That comment was very toxic!';
                    return context.github.issues.createComment(context.issue({body: template}));
                } else if (toxic_value >= toxicity_low_threshold) {
                    robot.log("That comment was potentially toxic.");
                    var template = 'Maybe consider saying something nicer next time!';
                    return context.github.issues.createComment(context.issue({body: template}));
                } else {
                    robot.log("That comment wasn't very toxic.");
                }
            });
        });
    };
};
