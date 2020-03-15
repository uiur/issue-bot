const axios = require('axios')

function apiHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }
}

exports.postMessage = async function postMessage(channel, text) {
  const token = process.env.SLACK_TOKEN

  await axios.post(
    'https://slack.com/api/chat.postMessage',
    {
      channel: channel,
      text: text,
      icon_emoji: ':chicken:'
    },
    {
      headers: apiHeaders(token)
    }
  )
}
