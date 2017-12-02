const expect = require('expect')
const {createRobot} = require('probot')
const plugin = require('..')
const payload = require('./events/payload')

const createTestRobot = ({toxicity}) => {
  // PERSPECTIVE_API_KEY must be set
  process.env.PERSPECTIVE_API_KEY = 'mock-key'
  const robot = createRobot()
  plugin(robot)

  const github = {
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
  }

  // Mock perspective API client
  const perspective = {
    analyze: expect.createSpy().andReturn(Promise.resolve(
      {
        attributeScores: {
          TOXICITY: {
            spanScores: [
              {
                begin: 0,
                end: 56,
                score: {
                  value: toxicity,
                  type: 'PROBABILITY'
                }
              }
            ],
            summaryScore: {
              value: toxicity,
              type: 'PROBABILITY'
            }
          }
        },
        languages: [
          'en'
        ]
      }
    ))
  }

  robot.auth = () => Promise.resolve(github)
  robot.perspective = perspective
  return robot
}

describe('sentiment-bot', () => {
  describe('sentiment-bot success', () => {
    it('posts a comment because the user was toxic', async () => {
      const robot = createTestRobot({toxicity: 0.8})
      const github = await robot.auth()
      const perspective = robot.perspective
      await robot.receive(payload)
      expect(github.repos.getContent).toHaveBeenCalledWith({
        owner: 'hiimbex',
        repo: 'testing-things',
        path: '.github/config.yml'
      })
      expect(github.repos.get).toHaveBeenCalled()
      expect(github.repos.get).toHaveBeenCalledWith({
        owner: 'hiimbex',
        repo: 'testing-things',
        headers: {
          Accept: 'application/vnd.github.scarlet-witch-preview+json'
        }
      })
      expect(perspective.analyze).toHaveBeenCalled()
      expect(github.issues.createComment).toHaveBeenCalled()
    })
  })

  describe('sentiment-bot fail', () => {
    it('does not post a comment because the user was not toxic', async () => {
      const robot = createTestRobot({toxicity: 0.2})
      const github = await robot.auth()
      const perspective = robot.perspective
      await robot.receive(payload)

      expect(github.repos.getContent).toHaveBeenCalledWith({
        owner: 'hiimbex',
        repo: 'testing-things',
        path: '.github/config.yml'
      })
      expect(github.repos.get).toHaveBeenCalledWith({
        owner: 'hiimbex',
        repo: 'testing-things',
        headers: {
          Accept: 'application/vnd.github.scarlet-witch-preview+json'
        }
      })
      expect(perspective.analyze).toHaveBeenCalled()
      expect(github.issues.createComment).toNotHaveBeenCalled()
    })
  })
})
