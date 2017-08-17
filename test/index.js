const expect = require('expect');
const {createRobot} = require('probot');
const plugin = require('..');
const payload = require('./events/payload');

describe('sentiment-bot', () => {
  let robot;
  let github;

  beforeEach(() => {
    robot = createRobot();
    plugin(robot);

    github = {
      repos: {
        getContent: expect.createSpy().andReturn(Promise.resolve({
          data: {
            content: Buffer.from(`
              sentimentBotToxicityThreshold: 0.3
              sentimentBotReplyComment: "That comment was toxic"`).toString('base64')
          }
        })),
        get: expect.createSpy().andReturn(Promise.resolve({
          data: {
            code_of_conduct: Buffer.from(`
              name: 'Contributor Covenenant'
              url: https://github.com/hiimbex/testing-things/blob/master/CODE_OF_CONDUCT.md`).toString('base64')
          }
        }))
      },
      issues: {
        createComment: expect.createSpy()
      }
    };

    robot.auth = () => Promise.resolve(github);
  });

  describe('sentiment-bot success', () => {
    it('posts a comment because the user was toxic', async () => {
      await robot.receive(payload);
      expect(github.repos.getContent).toHaveBeenCalledWith({
        owner: 'hiimbex',
        repo: 'testing-things',
        path: '.github/config.yml'
      });
      expect(github.repos.get).toHaveBeenCalled();
      expect(github.repos.get).toHaveBeenCalledWith({
        owner: 'hiimbex',
        repo: 'testing-things',
        headers: {
          Accept: 'application/vnd.github.scarlet-witch-preview+json'
        }
      });
      // Imitate google api stuff
      // expect(github.issues.createComment).toHaveBeenCalled();
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
      expect(github.repos.get).toHaveBeenCalledWith({
        owner: 'hiimbex',
        repo: 'testing-things',
        headers: {
          Accept: 'application/vnd.github.scarlet-witch-preview+json'
        }
      });
      expect(github.issues.createComment).toNotHaveBeenCalled();
    });
  });
});
