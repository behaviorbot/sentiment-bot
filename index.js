const Perspective = require('perspective-api-client')

module.exports = app => {
  app.perspective = new Perspective(({ apiKey: process.env.PERSPECTIVE_API_KEY }))
  app.on('issue_comment', async context => {
    let codeOfConduct
    const config = await context.config('config.yml')
    if (config && !context.isBot) {
      if (config.sentimentBotToxicityThreshold && config.sentimentBotReplyComment) {
        const toxicityThreshold = config.sentimentBotToxicityThreshold
        const body = context.payload.comment.body
        const repoData = await context.github.repos.get(context.repo())
        // Only check for Code of Conduct for public, non-fork repos, since
        // the community profile API only returns info for those repos
        if (!repoData.data.private && !repoData.data.fork) {
          const communityData = await context.github.repos.retrieveCommunityProfileMetrics(context.repo())
          if (communityData.data.code_of_conduct_file) {
            codeOfConduct = Object.assign({}, communityData.data.code_of_conduct_file)
          }
        }
        const response = await app.perspective.analyze(body, { truncate: true })
        const toxicValue = response.attributeScores.TOXICITY.summaryScore.value
        // If the comment is toxic, comment the comment
        if (toxicValue >= toxicityThreshold) {
          let comment
          if (codeOfConduct && codeOfConduct.html_url) {
            comment = config.sentimentBotReplyComment + 'Keep in mind, this repository has a [Code of Conduct](' + codeOfConduct.html_url + ').'
          } else {
            comment = config.sentimentBotReplyComment
          }
          context.github.issues.createComment(context.issue({ body: comment }))
        }
      }
    }
  })
}
