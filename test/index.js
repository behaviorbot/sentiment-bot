const expect = require('expect');
const {createRobot} = require('probot');
const plugin = require('..');
const payload = require('./events/payload');
const yaml = require('js-yaml');
//const googleapis = require('googleapis');

describe('sentiment-bot', () => {
    let robot;
    let github;

    beforeEach(() => {
        robot = createRobot();
        plugin(robot);
        // const google = new googleapis.GoogleApis();

        github = {
            repos: {
                getContent: expect.createSpy().andReturn(Promise.resolve({
                    data: {
                        content: Buffer.from(`
                            sentimentBotToxicityThreshold: 0.3
                            sentimentBotReplyComment: "That comment was toxic"`).toString('base64')
                    }
                }))
            },
            issues: {
                createComment: expect.createSpy()
            },
            codeOfConduct: {
                getRepoCodeOfConduct: expect.createSpy()
            }
        };
        // function MockGoogleAPI() {
        //     client = {
        //         comments: {
        //             analyze: expect.createSpy().andReturn(Promise.resolve({
        //                 attributeScores: {
        //                     TOXICITY: {
        //                         spanScores: {
        //                             score: {
        //                                 value: .99
        //                             }
        //                         }
        //                     }
        //                 }
        //             }))
        //         }
        //     }
        // }
        googleapis = {
            discoverAPI: function () {
                expect.createSpy().andReturn(Promise.resolve({
                    client: {
                        comments: {
                            analyze: expect.createSpy().andReturn(Promise.resolve({
                                attributeScores: {
                                    TOXICITY: {
                                        spanScores: {
                                            score: {
                                                value: .99
                                            }
                                        }
                                    }
                                }
                            }))
                        }
                    }
                }))
            }
        }

        robot.auth = () => Promise.resolve(github);
        robot.googleapis = googleapis;
        console.log('in test file, this is robot.googleapis: ', robot.googleapis);
    });

    describe('sentiment-bot success', () => {
        it('posts a comment because the user was toxic', async () => {
            await robot.receive(payload);
            robot.googleapis = googleapis;
            expect(github.repos.getContent).toHaveBeenCalledWith({
                owner: 'hiimbex',
                repo: 'testing-things',
                path: '.github/config.yml'
            });
            expect(github.codeOfConduct.getRepoCodeOfConduct).toHaveBeenCalledWith({
                owner: 'hiimbex',
                repo: 'testing-things'
            });
            //imitate google api stuff
            expect(github.issues.createComment).toHaveBeenCalled();
        });
    });

    describe('sentiment-bot fail', () => {
        it('does not post a comment because the user was not toxic', async () => {
            await robot.receive(payload);

            expect(github.repos.getContent).toHaveBeenCalledWith({
                owner: 'hiimbex',
                repo: 'testing-things',
                path: '.github/config.yml'
            });
            expect(github.codeOfConduct.getRepoCodeOfConduct).toHaveBeenCalledWith({
                owner: 'hiimbex',
                repo: 'testing-things'
            });
            expect(github.issues.createComment).toNotHaveBeenCalled();
        });
    });
});
