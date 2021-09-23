const expect = require('expect')
const { Application } = require('probot')
const plugin = require('..')
const payload = require('./events/payload')

const createTestApp = ({ toxicity, isPrivate = false, isFork = false }) => {
  // PERSPECTIVE_API_KEY must be set
  process.env.PERSPECTIVE_API_KEY = 'mock-key'
  const app = new Application()
  plugin(app)

  const github = {
    repos: {
      getContents: expect.createSpy().andReturn(Promise.resolve({
        data: {
          content: Buffer.from(`
            sentimentBotToxicityThreshold: 0.3
            sentimentBotReplyComment: "That comment was toxic"`).toString('base64')
        }
      })),
      get: expect.createSpy().andReturn(Promise.resolve({
        data: {
          private: isPrivate,
          fork: isFork
        }
      })),
      retrieveCommunityProfileMetrics: expect.createSpy().andReturn(Promise.resolve({
        data: {
          code_of_conduct_file: Buffer.from(`
            url: https://api.github.com/repos/hiimbex/testing-things/contents/CODE_OF_CONDUCT.md,
            html_url: https://github.com/hiimbex/testing-things/blob/master/CODE_OF_CONDUCT.md`).toString('base64')
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

  app.auth = () => Promise.resolve(github)
  app.perspective = perspective
  return app
}

describe('sentiment-bot', () => {
  describe('code of conduct', () => {
    it('does not fetch CoC for private repo', async () => {
      const app = createTestApp({ toxicity: 0.8, isPrivate: true })
      const github = await app.auth()
      const perspective = app.perspective
      await app.receive(payload)
      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'hiimbex',
        repo: 'testing-things',
        path: '.github/config.yml'
      })
      expect(github.repos.get).toHaveBeenCalled({
        owner: 'hiimbex',
        repo: 'testing-things'
      })
      expect(github.repos.retrieveCommunityProfileMetrics).toNotHaveBeenCalled()
      expect(perspective.analyze).toHaveBeenCalled()
      expect(github.issues.createComment).toHaveBeenCalled()
    })

    it('does not fetch CoC for forked repo', async () => {
      const app = createTestApp({ toxicity: 0.8, isFork: true })
      const github = await app.auth()
      const perspective = app.perspective
      await app.receive(payload)
      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'hiimbex',
        repo: 'testing-things',
        path: '.github/config.yml'
      })
      expect(github.repos.get).toHaveBeenCalled({
        owner: 'hiimbex',
        repo: 'testing-things'
      })
      expect(github.repos.retrieveCommunityProfileMetrics).toNotHaveBeenCalled()
      expect(perspective.analyze).toHaveBeenCalled()
      expect(github.issues.createComment).toHaveBeenCalled()
    })
  })

  describe('sentiment-bot success', () => {
    it('posts a comment because the user was toxic', async () => {
      const app = createTestApp({ toxicity: 0.8 })
      const github = await app.auth()
      const perspective = app.perspective
      await app.receive(payload)
      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'hiimbex',
        repo: 'testing-things',
        path: '.github/config.yml'
      })
      expect(github.repos.get).toHaveBeenCalled({
        owner: 'hiimbex',
        repo: 'testing-things'
      })
      expect(github.repos.retrieveCommunityProfileMetrics).toHaveBeenCalledWith({
        owner: 'hiimbex',
        repo: 'testing-things'
      })
      expect(perspective.analyze).toHaveBeenCalled()
      expect(github.issues.createComment).toHaveBeenCalled()
    })
  })

  describe('sentiment-bot fail', () => {
    it('does not post a comment because the user was not toxic', async () => {
      const app = createTestApp({ toxicity: 0.2 })
      const github = await app.auth()
      const perspective = app.perspective
      await app.receive(payload)

      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'hiimbex',
        repo: 'testing-things',
        path: '.github/config.yml'
      })
      expect(github.repos.get).toHaveBeenCalled({
        owner: 'hiimbex',
        repo: 'testing-things'
      })
      expect(github.repos.retrieveCommunityProfileMetrics).toHaveBeenCalledWith({
        owner: 'hiimbex',
        repo: 'testing-things'
      })
      expect(perspective.analyze).toHaveBeenCalled()
      expect(github.issues.createComment).toNotHaveBeenCalled()
    })
  })
})
