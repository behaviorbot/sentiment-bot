const Perspective = require('perspective-api-client')

module.exports = robot => {
  robot.perspective = new Perspective(({apiKey: process.env.PERSPECTIVE_API_KEY}))
  robot.on('issue_comment', async context => {
    let codeOfConduct
    const config = await context.config('config.yml')
    if (config && !context.isBot) {
      if (config.sentimentBotToxicityThreshold && config.sentimentBotReplyComment) {
        const toxicityThreshold = config.sentimentBotToxicityThreshold
        const body = context.payload.comment.body
        // Check for Code of Conduct
        const repoData = await context.github.repos.get(context.repo({
          headers: {
            Accept: 'application/vnd.github.scarlet-witch-preview+json'
          }
        }))
        if (repoData.data.code_of_conduct) {
          codeOfConduct = Object.assign({}, repoData.data.code_of_conduct)
        }
        const response = await robot.perspective.analyze(body, {truncate: true})
        const toxicValue = response.attributeScores.TOXICITY.summaryScore.value
        // If the comment is toxic, comment the comment
        if (toxicValue >= toxicityThreshold) {
          let comment
          if (codeOfConduct && codeOfConduct.name && codeOfConduct.url) {
            comment = config.sentimentBotReplyComment + 'Keep in mind, this repository uses the [' + codeOfConduct.name + '](' + codeOfConduct.url + ').'
          } else {
            comment = config.sentimentBotReplyComment
          }
          context.github.issues.createComment(context.issue({body: comment}))
        }
      }
    }
  })
}
