const googleapis = require('googleapis');

module.exports = robot => {
    robot.on('issue_comment', async context => {
        let codeOfConduct;
        const config = await context.config('config.yml');
        if (config && config.sentimentBotToxicityThreshold && config.sentimentBotReplyComment && !context.isBot) {
            const toxicityThreshold = config.sentimentBotToxicityThreshold;
            const body = context.payload.comment.body;
            // Check for Code of Conduct
            const repoData = await context.github.repos.get(context.repo());
            if (repoData.data.code_of_conduct) {
                codeOfConduct = Object.assign({}, repoData.data.code_of_conduct);
            }
            // Attempt to make perspective api requests template from google
            const discoveryUrl = 'https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1';
            googleapis.discoverAPI(discoveryUrl, (err, client) => {
                if (err) {
                    throw err;
                }
                const analyzeRequest = {
                    comment: {text: body},
                    requestedAttributes: {TOXICITY: {}}
                };
                client.comments.analyze({key: process.env.PERSPECTIVE_API_KEY, resource: analyzeRequest}, (err, response) => {
                    if (err) {
                        throw err;
                    }
                    const toxicValue = response.attributeScores.TOXICITY.spanScores[0].score.value;
                    // If the comment is toxic, comment the comment
                    if (toxicValue >= toxicityThreshold) {
                        let comment;
                        if (codeOfConduct) {
                            comment = config.sentimentBotReplyComment + 'Keep in mind, this repository uses the [' + codeOfConduct.name + '](' + codeOfConduct.url + ').';
                        } else {
                            comment = config.sentimentBotReplyComment;
                        }
                        context.github.issues.createComment(context.issue({body: comment}));
                    }
                });
            });
        }
    });
};
