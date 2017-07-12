const googleapis = require('googleapis');
const yaml = require('js-yaml');

module.exports = robot => {
    robot.on('issue_comment', check);
    async function check(context) {
        
        robot.log(context.github.repos);
        let config, toxicityThreshold;
        //This is used to compare to the data we get from the Perspective API
        try {
            const options = context.repo({path: '.github/sentiment-bot.yml'});
            const response = await context.github.repos.getContent(options);
            config = yaml.load(Buffer.from(response.data.content, 'base64').toString()) || {};
        } catch (err) {
            if (err.code !== 404) throw err;
        }

        if (config) toxicityThreshold = config.toxicityThreshold;
        else toxicityThreshold = .7;

        const body = context.payload.comment.body;
        robot.log(body, config);
        
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
                var toxic_value = response.attributeScores.TOXICITY.spanScores[0].score.value
                robot.log(toxic_value);

                if (toxic_value >= toxicityThreshold) {
                    // Check for Code of Conduct
                    // Cry ??
                    robot.log("That comment was very toxic.");
                    var template = 'Hey there, that comment triggered our sentiment analysis warning. Make sure to check out this Repo\'s code of conduct!';
                    context.github.issues.createComment(context.issue({body: template}));
                }
            });
        });
    };
};
