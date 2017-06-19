module.exports = robot => {
    robot.on('issues', check);
    //robot.on('issue_comment', check);
    robot.on('pull_request', check);

    //robot.on('issues', async context => {
    async function check(context) {
        const mean_words = ["stupid", "idiot", "fuck"];
        robot.log(context.payload);
        //let issue = context.payload.issue || context.payload.pull_request;
        if (!context.payload.body) {
            issue = (await context.github.issues.get(context.issue())).data;
        }
        var body = context.payload.issue.body;
        robot.log(body);
        if (mean_words.some(function(i) { return body.indexOf(i) >= 0; })) {
            robot.log("There's a mean word in here!");
            const params = context.issue({body: 'Try to say nice things!'})
            return context.github.issues.createComment(params);
        }
  //});
  };
};
