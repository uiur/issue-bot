const { ReactionHandler } = require('emoji-to-issue')
const { postMessage } = require('./lib/slack')

exports.main = (req, res) => {
  console.log('Received request:', req.body)

  if (req.body.challenge) {
    res.send(req.body.challenge)
    return
  }

  // slack event
  if (req.body.event) {
    handleSlack(req, res)
    return
  }
}

function handlePing(event) {
  if (event.type === 'app_mention') {
    const text = event.text
    const textBody = text.replace(/^\<[^\>]+\>\s*/, '')

    if (/^yo/.test(textBody)) {
      res.send('ok')

      postMessage(event.channel, 'yo').catch(err => {
        console.error(err)
      })

      return true
    }
  }
}

function handleIssueEmoji(event) {
  const handler = new ReactionHandler({
    issueRepo: process.env.GITHUB_ISSUE_REPO
  })
  if (handler.match(event)) {
    handler
      .handle(event)
      .then(() => {
        res.send('ok')
      })
      .catch(err => {
        console.error(err)
        res.status(500).send(err.message)
      })

    return true
  }
}

function handleSlack(req, res) {
  const event = req.body.event
  if (handlePing(event)) return
  if (handleIssueEmoji(event)) return

  res.send('ok: no matched handler')
}
