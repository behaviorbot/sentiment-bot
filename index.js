//let googleapis = require('googleapis');
const yaml = require('js-yaml');

module.exports = robot => {
    robot.on('issue_comment', async context => {
        let config, toxicityThreshold;
        try {
            const options = context.repo({path: '.github/config.yml'});
            const response = await context.github.repos.getContent(options);
            config = yaml.safeLoad(Buffer.from(response.data.content, 'base64').toString()) || {};
        } catch (err) {
            if (err.code !== 404) throw err;
        }
        if (config) toxicityThreshold = config.sentimentBotToxicityThreshold;
        //console.log(toxicityThreshold, config.sentimentBotToxicityThreshold);
        const body = context.payload.comment.body;
        const codeOfConduct = await context.github.codeOfConduct.getRepoCodeOfConduct(context.repo());
        robot.log(body, toxicityThreshold, codeOfConduct);
        //attempt to make perspective api requests template from google
        discovery_url = 'https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1';
        console.log('in index.js, this is googleapis: ', googleapis);
        console.log('in index.js, this is googleapis.discoverAPI: ', googleapis.discoverAPI);
        googleapis.discoverAPI(discovery_url, (err, client) => {
            console.log('in the thing!!! here\'s the client: ', client);
            console.log('error: ', err);
            if (err) throw err;
            var analyze_request = {
                comment: {'text': body},
                requestedAttributes: {'TOXICITY': {}}
            };
            client.comments.analyze({key: process.env.PERSPECTIVE_API_KEY, resource: analyze_request}, (err, response) => {
                console.log('response');
                if (err) throw err;
                var toxic_value = response.attributeScores.TOXICITY.spanScores[0].score.value
                robot.log(toxic_value);
                console.log(toxic_value);
                if (toxic_value >= toxicityThreshold) {
                    // Check for Code of Conduct
                    robot.log(config.sentimentBotReplyComment);
                    context.github.issues.createComment(context.issue({body: config.sentimentBotReplyComment}));
                }
            });
        });
    });
};
